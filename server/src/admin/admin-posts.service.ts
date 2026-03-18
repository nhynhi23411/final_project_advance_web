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
import { AdminUpdatePostDto } from "./dto/admin-update-post.dto";

@Injectable()
export class AdminPostsService {
  constructor(
    @InjectModel(Post.name) private readonly postModel: Model<PostDocument>,
    @InjectModel(Claim.name) private readonly claimModel: Model<ClaimDocument>,
    private readonly auditLogService: AuditLogService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Get posts by status. Use status=all to get all posts.
   * Optional filters: category, dateFrom, dateTo (ISO date strings).
   */
  async getPosts(
    status: string = "PENDING_ADMIN",
    filters?: { category?: string; dateFrom?: string; dateTo?: string },
  ): Promise<PostDocument[]> {
    const query: Record<string, unknown> = {};
    if (status && status.toLowerCase() !== "all") {
      query.status = status;
    }
    if (filters?.category?.trim()) {
      query.category = filters.category.trim();
    }
    if (filters?.dateFrom || filters?.dateTo) {
      query.createdAt = {};
      if (filters.dateFrom) {
        (query.createdAt as Record<string, Date>).$gte = new Date(filters.dateFrom + "T00:00:00.000Z");
      }
      if (filters.dateTo) {
        (query.createdAt as Record<string, Date>).$lte = new Date(filters.dateTo + "T23:59:59.999Z");
      }
    }
    return this.postModel.find(query).sort({ createdAt: -1 }).exec();
  }

  /** Admin override: update post content (title, description, category). */
  async updatePostContent(
    postId: string,
    dto: AdminUpdatePostDto,
  ): Promise<PostDocument> {
    const post = await this.postModel.findById(postId).exec();
    if (!post) throw new NotFoundException("Post not found");
    const update: Record<string, unknown> = {};
    if (dto.title !== undefined) update.title = dto.title.trim();
    if (dto.description !== undefined) update.description = dto.description;
    if (dto.category !== undefined) update.category = dto.category.trim();
    if (Object.keys(update).length === 0) return post;
    const updated = await this.postModel
      .findByIdAndUpdate(postId, { $set: update }, { new: true })
      .exec();
    if (!updated) throw new NotFoundException("Post not found");
    return updated;
  }

  /** Soft delete: set status to ARCHIVED. */
  async deletePost(postId: string): Promise<PostDocument> {
    const post = await this.postModel.findById(postId).exec();
    if (!post) throw new NotFoundException("Post not found");
    const updated = await this.postModel
      .findByIdAndUpdate(
        postId,
        {
          $set: {
            status: "ARCHIVED",
            archived_reason: "Đã xóa bởi quản trị viên",
          },
        },
        { new: true },
      )
      .exec();
    if (!updated) throw new NotFoundException("Post not found");
    return updated;
  }

  async getDashboardStats(): Promise<{
    totalUsers: number;
    activePosts: number;
    resolvedClaims: number;
    pendingAdmin: number;
  }> {
    const [totalUsers, activePosts, resolvedClaims, pendingAdmin] =
      await Promise.all([
        this.usersService.countAll(),
        this.postModel.countDocuments({ status: "APPROVED" }).exec(),
        this.claimModel.countDocuments({ status: "SUCCESSFUL" }).exec(),
        this.postModel.countDocuments({ status: "PENDING_ADMIN" }).exec(),
      ]);
    return { totalUsers, activePosts, resolvedClaims, pendingAdmin };
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
      this.eventEmitter.emit("post.approved", { postId, userId, adminUserId });
    } else if (dto.status === "NEEDS_UPDATE") {
      await this.postModel
        .findByIdAndUpdate(postId, {
          status: "NEEDS_UPDATE",
          reject_reason: dto.reject_reason ?? null,
        })
        .exec();
      this.eventEmitter.emit("post.needs_update", { postId, userId, adminUserId });
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

      this.eventEmitter.emit("post.rejected", { postId, userId, adminUserId });

      const appConfig = this.configService.get<{ maxRejects24h: number }>("app");
      const maxRejects = appConfig?.maxRejects24h ?? 3;
      const count = await this.auditLogService.countRejectInLast24h(userId);

      if (count >= maxRejects) {
        await this.usersService.updateStatus(userId, "BANNED");
        this.eventEmitter.emit("user.banned", { userId, reason: "reject_limit" });
      }
    }

    const updated = await this.postModel.findById(postId).exec();
    if (!updated) throw new NotFoundException("Post not found");
    return updated;
  }
}
