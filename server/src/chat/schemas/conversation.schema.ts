import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type ConversationDocument = Conversation & Document;

@Schema({
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
})
export class Conversation {
  @Prop({ type: [Types.ObjectId], ref: "User", required: true, index: true })
  participants!: Types.ObjectId[];

  /**
   * Unique key for direct chat between two users.
   * Format: smallerUserId:largerUserId
   */
  @Prop({ required: true, unique: true })
  conversation_key!: string;

  @Prop({ type: Types.ObjectId, ref: "Message", default: null })
  last_message_id?: Types.ObjectId | null;

  @Prop({ type: String, default: "" })
  last_message_preview?: string;

  @Prop({ type: Date, default: null, index: true })
  last_message_at?: Date | null;

  /**
   * unread_counts[userId] = number of unread messages in this conversation.
   */
  @Prop({ type: Map, of: Number, default: {} })
  unread_counts!: Map<string, number>;

  @Prop()
  created_at?: Date;

  @Prop()
  updated_at?: Date;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
ConversationSchema.index({ conversation_key: 1 }, { unique: true });
ConversationSchema.index({ participants: 1, last_message_at: -1 });
