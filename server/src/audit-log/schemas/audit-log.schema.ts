import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type AuditLogDocument = AuditLog & Document;

export const AUDIT_ACTIONS = ["REJECT_POST"] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

@Schema({ timestamps: true })
export class AuditLog {
  @Prop({ enum: ["SYSTEM", "USER", "ADMIN"], required: true })
  actor_type!: "SYSTEM" | "USER" | "ADMIN";

  @Prop({ type: Types.ObjectId, ref: "User", default: null })
  actor_user_id?: Types.ObjectId;

  @Prop({ required: true, enum: AUDIT_ACTIONS })
  action!: AuditAction;

  @Prop({ enum: ["POST", "CLAIM", "USER", "MATCH"], required: true })
  entity_type!: "POST" | "CLAIM" | "USER" | "MATCH";

  @Prop({ type: Types.ObjectId, required: true })
  entity_id!: Types.ObjectId;

  @Prop({ default: null })
  from_status?: string;

  @Prop({ default: null })
  to_status?: string;

  @Prop({ default: null })
  reason?: string;

  @Prop({ enum: ["API", "ADMIN_DASHBOARD", "CRON", "AUTO_MODERATION"], required: true })
  source!: "API" | "ADMIN_DASHBOARD" | "CRON" | "AUTO_MODERATION";

  @Prop({ type: Object, default: null })
  payload?: any;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
AuditLogSchema.index({ user_id: 1, action: 1, createdAt: -1 });
