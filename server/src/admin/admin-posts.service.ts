import { Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Post, PostDocument } from "../posts/schemas/post.schema";
import { Claim, ClaimDocument } from "../claims/schemas/claim.schema";
import { AuditLogService } from "../audit-log/audit-log.service";
import { UsersService } from "../users/users.service";
import { UpdatePostStatusDto } from "./dto/update-post-status.dto";

@Injectable()
export class AdminPostsService {
  constructor(
    @InjectModel(Post.name) private readonly postModel: Model<PostDocument>,
    @InjectModel(Claim.name) private readonly claimModel: Model<ClaimDocument>,
    private readonly auditLogService: AuditLogService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) { }

  async getPosts(status: string = "PENDING_ADMIN"): Promise<PostDocument[]> {
    return this.postModel.find({ status }).sort({ createdAt: -1 }).exec();
  }

  async getDashboardStats(): Promise<{
    totalUsers: number;
    activePosts: number;
    resolvedClaims: number;
    pendingAdmin: number;
    postsByMonth?: Array<{ month: string; count: number }>;
    claimsByStatus?: { PENDING: number; SUCCESSFUL: number; REJECTED: number; UNDER_VERIFICATION: number };
  }> {
    const [totalUsers, activePosts, resolvedClaims, pendingAdmin, postsByMonth, claimsByStatus] =
      await Promise.all([
        this.usersService.countAll(),
        this.postModel.countDocuments({ status: "APPROVED" }).exec(),
        this.claimModel.countDocuments({ status: "SUCCESSFUL" }).exec(),
        this.postModel.countDocuments({ status: "PENDING_ADMIN" }).exec(),
        // Posts by month (last 6 months)
        this.postModel.aggregate([
          {
            $match: {
              created_at: { $gte: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000) }
            }
          },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m", date: "$created_at" } },
              count: { $sum: 1 }
            }
          },
          { $sort: { _id: 1 } },
          { $project: { _id: 0, month: "$_id", count: 1 } }
        ]).exec(),
        // Claims by status
        this.claimModel.aggregate([
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 }
            }
          }
        ]).exec(),
      ]);

    // Format claims count to object
    const claimsMap = claimsByStatus.reduce((acc: any, item: any) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    const formattedClaimsByStatus = {
      PENDING: claimsMap.PENDING || 0,
      SUCCESSFUL: claimsMap.SUCCESSFUL || 0,
      REJECTED: claimsMap.REJECTED || 0,
      UNDER_VERIFICATION: claimsMap.UNDER_VERIFICATION || 0,
    };

    return {
      totalUsers,
      activePosts,
      resolvedClaims,
      pendingAdmin,
      postsByMonth: (postsByMonth as any[]).map((item: any) => ({
        month: item.month,
        count: item.count
      })),
      claimsByStatus: formattedClaimsByStatus,
    };
  }

  async updatePostStatus(
    postId: string,
    dto: UpdatePostStatusDto,
    adminUserId: string,
  ): Promise<PostDocument> {
    const post = await this.postModel.findById(postId).exec();
    if (!post) throw new NotFoundException("Post not found");

    const userId = (post.created_by_user_id as Types.ObjectId).toString();

    if (dto.status === "APPROVED") {
      await this.postModel
        .findByIdAndUpdate(postId, {
          status: "APPROVED",
          approved_at: new Date(),
          approved_by_user_id: new Types.ObjectId(adminUserId),
          reject_reason: null,
        })
        .exec();
      await this.auditLogService.createApproveLog(postId, userId, adminUserId);
      this.eventEmitter.emit("post.approved", { postId, userId });;
      
    } else if (dto.status === "NEEDS_UPDATE") {
      await this.auditLogService.createNeedsUpdateLog(
        postId,
        userId,
        dto.reject_reason ?? "",
        adminUserId,
      );
      await this.postModel
        .findByIdAndUpdate(postId, {
          status: "NEEDS_UPDATE",
          reject_reason: dto.reject_reason ?? null,
        })
        .exec();
      this.eventEmitter.emit("post.needs_update", { postId, userId });
    } else if (dto.status === "REJECTED") {
      await this.auditLogService.createRejectLog(
        postId,
        userId,
        dto.reject_reason ?? "",
        adminUserId,
      );

      await this.postModel
        .findByIdAndUpdate(postId, {
          status: "REJECTED",
          reject_reason: dto.reject_reason ?? null,
        })
        .exec();

      const appConfig = this.configService.get<{ maxRejects24h: number }>("app");
      const maxRejects = appConfig?.maxRejects24h ?? 3;
      const count = await this.auditLogService.countRejectInLast24h(userId);

      // Đề bài: > 3 lần / 24h => lần thứ 4 mới ban
      if (count > maxRejects) {
        await this.usersService.updateStatus(userId, "BANNED");
        this.eventEmitter.emit("user.banned", { userId, reason: "reject_limit" });
      }
    }

    const updated = await this.postModel.findById(postId).exec();
    if (!updated) throw new NotFoundException("Post not found");
    return updated;
  }
}
