import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type AuditLogDocument = AuditLog & Document;

export const AUDIT_ACTIONS = ["REJECT_POST", "APPROVE_POST", "NEEDS_UPDATE"] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

@Schema({ timestamps: true })
export class AuditLog {
  @Prop({ required: true, enum: AUDIT_ACTIONS })
  action!: AuditAction;

  @Prop({ type: Types.ObjectId, ref: "Post", required: true })
  post_id!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  user_id!: Types.ObjectId;

  @Prop({ default: null })
  reason?: string;

  @Prop({ type: Types.ObjectId, ref: "User", default: null })
  performed_by_user_id?: Types.ObjectId;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
AuditLogSchema.index({ user_id: 1, action: 1, createdAt: -1 });
