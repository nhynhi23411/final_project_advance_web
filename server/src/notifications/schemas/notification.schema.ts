import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type NotificationDocument = Notification & Document;

export type NotificationType =
  | "claim"
  | "match_suggestion"
  | "post_approved"
  | "post_needs_update"
  | "post_rejected"
  | "post_closed_by_user";

@Schema({ timestamps: { createdAt: "created_at", updatedAt: "updated_at" } })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: "User", required: true, index: true })
  recipient_user_id!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  sender_user_id!: Types.ObjectId;

  @Prop({
    enum: ["claim", "match_suggestion", "post_approved", "post_needs_update", "post_rejected", "post_closed_by_user"],
    required: true,
  })
  notification_type!: NotificationType;

  @Prop({ type: Types.ObjectId, ref: "Post", required: true })
  related_post_id!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Claim", default: null })
  related_claim_id?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Match", default: null })
  related_match_id?: Types.ObjectId;

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  message!: string;

  @Prop({ default: false, index: true })
  is_read!: boolean;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
