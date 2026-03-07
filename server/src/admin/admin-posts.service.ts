import { Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Post, PostDocument } from "../posts/schemas/post.schema";
import { AuditLogService } from "../audit-log/audit-log.service";
import { UsersService } from "../users/users.service";
import { UpdatePostStatusDto } from "./dto/update-post-status.dto";

@Injectable()
export class AdminPostsService {
  constructor(
    @InjectModel(Post.name) private readonly postModel: Model<PostDocument>,
    private readonly auditLogService: AuditLogService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

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
      this.eventEmitter.emit("post.approved", { postId, userId });
    } else if (dto.status === "NEEDS_UPDATE") {
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
