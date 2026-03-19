import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { AuditLog, AuditLogDocument } from "./schemas/audit-log.schema";

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
}
