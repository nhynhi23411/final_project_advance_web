import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { AuditLog, AuditLogDocument, AuditAction } from "./schemas/audit-log.schema";
import { User, UserDocument } from "../users/schemas/user.schema";
import { Post, PostDocument } from "../posts/schemas/post.schema";

interface FindAllOptions {
  page?: number;
  limit?: number;
  action?: AuditAction;
  user_id?: string;
  performed_by_user_id?: string;
}

interface PaginatedResult {
  data: any[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

@Injectable()
export class AuditLogService {
  constructor(
    @InjectModel(AuditLog.name) private readonly model: Model<AuditLogDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Post.name) private readonly postModel: Model<PostDocument>,
  ) {}

  private buildBaseFilter(userId?: string, action?: AuditAction) {
    const filter: any = {};

    if (action) {
      filter.action = action;
    }

    if (userId) {
      if (!Types.ObjectId.isValid(userId)) {
        // Invalid ObjectId should not match any records.
        filter._id = { $exists: false };
        return filter;
      }

      const userObjectId = new Types.ObjectId(userId);
      filter.$or = [
        { "payload.user_id": userId },
        { user_id: userObjectId },
        { entity_type: "USER", entity_id: userObjectId },
      ];
    }

    return filter;
  }

  private async enrichLogs(logs: any[]): Promise<any[]> {
    if (!logs.length) return [];

    const userIdSet = new Set<string>();
    const postIdSet = new Set<string>();

    for (const log of logs) {
      const violatedUserId =
        log?.payload?.user_id ||
        log?.user_id?.toString?.() ||
        (log?.entity_type === "USER" ? log?.entity_id?.toString?.() : "");

      const performedByUserId =
        log?.actor_user_id?.toString?.() ||
        log?.performed_by_user_id?.toString?.();

      const postId =
        log?.post_id?.toString?.() ||
        (log?.entity_type === "POST" ? log?.entity_id?.toString?.() : "");

      if (violatedUserId && Types.ObjectId.isValid(violatedUserId)) {
        userIdSet.add(violatedUserId);
      }
      if (performedByUserId && Types.ObjectId.isValid(performedByUserId)) {
        userIdSet.add(performedByUserId);
      }
      if (postId && Types.ObjectId.isValid(postId)) {
        postIdSet.add(postId);
      }
    }

    const userIds = Array.from(userIdSet).map((id) => new Types.ObjectId(id));
    const postIds = Array.from(postIdSet).map((id) => new Types.ObjectId(id));

    const [users, posts] = await Promise.all([
      userIds.length
        ? this.userModel
            .find({ _id: { $in: userIds } })
            .select("_id username email name")
            .lean()
            .exec()
        : Promise.resolve([]),
      postIds.length
        ? this.postModel
            .find({ _id: { $in: postIds } })
            .select("_id title")
            .lean()
            .exec()
        : Promise.resolve([]),
    ]);

    const userMap = new Map<string, any>(
      users.map((u: any) => [u._id.toString(), u]),
    );
    const postMap = new Map<string, any>(
      posts.map((p: any) => [p._id.toString(), p]),
    );

    return logs.map((log) => {
      const violatedUserId =
        log?.payload?.user_id ||
        log?.user_id?.toString?.() ||
        (log?.entity_type === "USER" ? log?.entity_id?.toString?.() : "");

      const performedByUserId =
        log?.actor_user_id?.toString?.() ||
        log?.performed_by_user_id?.toString?.();

      const postId =
        log?.post_id?.toString?.() ||
        (log?.entity_type === "POST" ? log?.entity_id?.toString?.() : "");

      return {
        ...log,
        user_id: violatedUserId ? userMap.get(violatedUserId) || null : null,
        performed_by_user_id: performedByUserId
          ? userMap.get(performedByUserId) || null
          : null,
        post_id: postId ? postMap.get(postId) || null : null,
      };
    });
  }

  async createRejectLog(
    postId: string,
    userId: string,
    reason: string,
    performedByUserId?: string,
  ): Promise<AuditLogDocument> {
    const doc = new this.model({
      actor_type: performedByUserId ? "ADMIN" : "SYSTEM",
      actor_user_id: performedByUserId
        ? new Types.ObjectId(performedByUserId)
        : null,
      action: "REJECT_POST",
      entity_type: "POST",
      entity_id: new Types.ObjectId(postId),
      reason: reason || null,
      source: "AUTO_MODERATION",
      payload: { user_id: userId }
    });
    return doc.save();
  }

  async countRejectInLast24h(userId: string): Promise<number> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return this.model
      .countDocuments({
        "payload.user_id": userId,
        action: "REJECT_POST",
        createdAt: { $gte: since },
      })
      .exec();
  }

  async findAll(
    userId?: string,
    skip = "0",
    action?: AuditAction,
  ): Promise<any[]> {
    const skipNum = Math.max(0, parseInt(skip || "0", 10) || 0);
    const filter = this.buildBaseFilter(userId, action);

    const logs = await this.model
      .find(filter)
      .select("action reason createdAt entity_type entity_id actor_user_id payload")
      .sort({ createdAt: -1 })
      .skip(skipNum)
      .limit(50)
      .lean()
      .exec();

    return this.enrichLogs(logs);
  }

  async findAllPaginated(options: FindAllOptions = {}): Promise<PaginatedResult> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, options.limit || 20);
    const skip = (page - 1) * limit;

    const filter = this.buildBaseFilter(options.user_id, options.action);

    if (options.performed_by_user_id) {
      if (!Types.ObjectId.isValid(options.performed_by_user_id)) {
        filter._id = { $exists: false };
      } else {
        filter.actor_user_id = new Types.ObjectId(options.performed_by_user_id);
      }
    }

    const total = await this.model.countDocuments(filter);

    const rawData = await this.model
      .find(filter)
      .select("action reason createdAt entity_type entity_id actor_user_id payload")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();

    const data = await this.enrichLogs(rawData);

    return {
      data,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async createLog(
    action: AuditAction,
    postId?: string,
    userId?: string,
    reason?: string,
    performedByUserId?: string,
  ): Promise<AuditLogDocument> {
    const resolvedEntityId = postId || userId;
    if (!resolvedEntityId || !Types.ObjectId.isValid(resolvedEntityId)) {
      throw new Error("createLog requires a valid postId or userId");
    }

    const doc = new this.model({
      actor_type: performedByUserId ? "ADMIN" : "SYSTEM",
      actor_user_id: performedByUserId
        ? new Types.ObjectId(performedByUserId)
        : null,
      action,
      entity_type: postId ? "POST" : "USER",
      entity_id: new Types.ObjectId(resolvedEntityId),
      reason: reason || null,
      source: performedByUserId ? "ADMIN_DASHBOARD" : "AUTO_MODERATION",
      payload: userId ? { user_id: userId } : null,
    });
    return doc.save();
  }
}
