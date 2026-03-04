import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type PostDocument = Post & Document;

export const POST_STATUS = [
  "PENDING_SYSTEM",
  "PENDING_ADMIN",
  "APPROVED",
  "NEEDS_UPDATE",
  "RETURNED",
  "REJECTED",
  "ARCHIVED",
] as const;
export type PostStatus = (typeof POST_STATUS)[number];

export const POST_TYPE = ["LOST", "FOUND"] as const;
export type PostType = (typeof POST_TYPE)[number];

@Schema({ timestamps: true })
export class Post {
  @Prop({ required: true, enum: POST_TYPE })
  post_type!: PostType;

  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ default: "" })
  description!: string;

  @Prop({ enum: POST_STATUS, default: "PENDING_SYSTEM" })
  status!: PostStatus;

  @Prop({ default: 0 })
  active_claim_count!: number;

  @Prop({ default: null })
  dedupe_hash?: string;

  @Prop({ default: null })
  scoring_value?: number;

  @Prop({ default: null })
  approved_at?: Date;

  @Prop({ default: null })
  reject_reason?: string;

  @Prop({ default: null })
  archived_reason?: string;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  created_by_user_id!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User", default: null })
  approved_by_user_id?: Types.ObjectId;

  @Prop({ default: "Other" })
  category!: string;

  @Prop({ type: Object, default: {} })
  location!: Record<string, any>;

  @Prop({ type: Object, default: {} })
  metadata!: Record<string, any>;

  /** URL ảnh từ Cloudinary (tối đa 5) */
  @Prop({ type: [String], default: [] })
  images!: string[];

  /** public_id trên Cloudinary để xóa khi cần */
  @Prop({ type: [String], default: [] })
  image_public_ids!: string[];

  @Prop({ default: false })
  is_match_scored!: boolean;
}

export const PostSchema = SchemaFactory.createForClass(Post);
