import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { AuditLog, AuditLogDocument, AuditAction } from "./schemas/audit-log.schema";

interface FindAllOptions {
  page?: number;
  limit?: number;
  action?: AuditAction;
  // Ticket alias: userId
  userId?: string;
  // Ticket alias: skip (offset)
  skip?: string | number;
  user_id?: string;
  performed_by_user_id?: string;
}

interface PaginatedResult {
  data: AuditLogDocument[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

@Injectable()
export class AuditLogService {
  constructor(
    @InjectModel(AuditLog.name) private readonly model: Model<AuditLogDocument>,
  ) {}

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

      // Fields cho admin-site audit logs
      post_id: new Types.ObjectId(postId),
      user_id: new Types.ObjectId(userId),
      performed_by_user_id: performedByUserId
        ? new Types.ObjectId(performedByUserId)
        : null,

      reason: reason || null,
      source: "AUTO_MODERATION",
      payload: { user_id: userId }
    });
    return doc.save();
  }

  async createBanLog(
    userId: string,
    reason: string | null,
    performedByUserId?: string,
  ): Promise<AuditLogDocument> {
    const doc = new this.model({
      actor_type: performedByUserId ? "ADMIN" : "SYSTEM",
      actor_user_id: performedByUserId
        ? new Types.ObjectId(performedByUserId)
        : null,
      action: "BAN_USER",
      entity_type: "USER",
      entity_id: new Types.ObjectId(userId),

      user_id: new Types.ObjectId(userId),
      performed_by_user_id: performedByUserId
        ? new Types.ObjectId(performedByUserId)
        : null,

      post_id: null,
      reason: reason || null,
      source: "AUTO_MODERATION",
      payload: { user_id: userId },
    });
    return doc.save();
  }

  async createUnbanLog(
    userId: string,
    performedByUserId?: string,
  ): Promise<AuditLogDocument> {
    const doc = new this.model({
      actor_type: performedByUserId ? "ADMIN" : "SYSTEM",
      actor_user_id: performedByUserId
        ? new Types.ObjectId(performedByUserId)
        : null,
      action: "UNBAN_USER",
      entity_type: "USER",
      entity_id: new Types.ObjectId(userId),

      user_id: new Types.ObjectId(userId),
      performed_by_user_id: performedByUserId
        ? new Types.ObjectId(performedByUserId)
        : null,

      post_id: null,
      reason: null,
      source: "ADMIN_DASHBOARD",
      payload: { user_id: userId },
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

  async findAll(options: FindAllOptions = {}): Promise<PaginatedResult> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, options.limit || 20);
    const skip =
      options.skip !== undefined
        ? typeof options.skip === "string"
          ? parseInt(options.skip, 10) || 0
          : options.skip
        : (page - 1) * limit;

    // Build filter
    const filter: any = {}
    if (options.action) {
      filter.action = options.action;
    }
    const userId = options.userId ?? options.user_id;
    if (userId) filter.user_id = new Types.ObjectId(userId);

    const performedByUserId = options.performed_by_user_id;
    if (performedByUserId) {
      filter.performed_by_user_id = new Types.ObjectId(performedByUserId);
    }

    // Get total count
    const total = await this.model.countDocuments(filter);

    // Get paginated data with populated refs
    const data = await this.model
      .find(filter)
      .populate("post_id", "title status")
      .populate("user_id", "username email name")
      .populate("performed_by_user_id", "username email name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

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
    const entity_id = postId
      ? new Types.ObjectId(postId)
      : userId
        ? new Types.ObjectId(userId)
        : null;
    const entity_type = postId ? "POST" : userId ? "USER" : null;
    if (!entity_id || !entity_type) {
      throw new Error("createLog: cần có ít nhất postId hoặc userId");
    }
    const doc = new this.model({
      actor_type: performedByUserId ? "ADMIN" : "SYSTEM",
      actor_user_id: performedByUserId
        ? new Types.ObjectId(performedByUserId)
        : null,
      action,
      entity_type,
      entity_id,

      post_id: postId ? new Types.ObjectId(postId) : null,
      user_id: userId ? new Types.ObjectId(userId) : null,
      reason: reason || null,
      performed_by_user_id: performedByUserId
        ? new Types.ObjectId(performedByUserId)
        : null,
      source: "ADMIN_DASHBOARD",
    });
    return doc.save();
  }
}
