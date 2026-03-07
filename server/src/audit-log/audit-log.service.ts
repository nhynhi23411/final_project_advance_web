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
      action: "REJECT_POST",
      post_id: new Types.ObjectId(postId),
      user_id: new Types.ObjectId(userId),
      reason: reason || null,
      performed_by_user_id: performedByUserId
        ? new Types.ObjectId(performedByUserId)
        : null,
    });
    return doc.save();
  }

  async countRejectInLast24h(userId: string): Promise<number> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return this.model
      .countDocuments({
        user_id: new Types.ObjectId(userId),
        action: "REJECT_POST",
        createdAt: { $gte: since },
      })
      .exec();
  }
}
