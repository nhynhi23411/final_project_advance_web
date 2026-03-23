import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type MessageDocument = Message & Document;

@Schema({
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
})
export class Message {
  @Prop({
    type: Types.ObjectId,
    ref: "Conversation",
    required: true,
    index: true,
  })
  conversation_id!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User", required: true, index: true })
  sender_id!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User", required: true, index: true })
  receiver_id!: Types.ObjectId;

  @Prop({ enum: ["TEXT", "IMAGE"], default: "TEXT" })
  message_type!: "TEXT" | "IMAGE";

  @Prop({ type: String, default: "" })
  content?: string;

  @Prop({ type: String, default: "" })
  image_url?: string;

  @Prop({ default: false, index: true })
  is_read!: boolean;

  @Prop({ type: Date, default: null })
  read_at?: Date | null;

  @Prop()
  created_at?: Date;

  @Prop()
  updated_at?: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
MessageSchema.index({ conversation_id: 1, created_at: -1 });
MessageSchema.index({ receiver_id: 1, is_read: 1 });
