import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type ItemDocument = Item & Document;

export const ITEM_STATUS = [
  "PENDING_APPROVAL",
  "PENDING_ADMIN",
  "APPROVED",
  "REJECTED",
  "MATCHED",
  "RETURN_PENDING",
  "RETURNED",
  "CLOSED",
] as const;
export type ItemStatus = (typeof ITEM_STATUS)[number];

export const ITEM_TYPE = ["LOST", "FOUND"] as const;
export type ItemType = (typeof ITEM_TYPE)[number];

@Schema({ timestamps: true })
export class Item {
  @Prop({ required: true, enum: ITEM_TYPE })
  type!: ItemType;

  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ default: "" })
  description!: string;

  @Prop({ default: "Other" })
  category!: string;

  @Prop({ default: "" })
  color!: string;

  @Prop({ default: "" })
  brand!: string;

  /** Dấu hiệu nhận biết (chỉ dùng khi xác minh, có thể ẩn với người xem) */
  @Prop({ default: "" })
  distinctive_marks!: string;

  @Prop()
  lost_found_date?: Date;

  @Prop({ default: "" })
  location_text!: string;

  /** URL ảnh từ Cloudinary (tối đa 5) */
  @Prop({ type: [String], default: [] })
  images!: string[];

  /** public_id trên Cloudinary để xóa khi cần */
  @Prop({ type: [String], default: [] })
  image_public_ids!: string[];

  @Prop({ enum: ITEM_STATUS, default: "PENDING_APPROVAL" })
  status!: ItemStatus;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  created_by!: Types.ObjectId;
}

export const ItemSchema = SchemaFactory.createForClass(Item);
