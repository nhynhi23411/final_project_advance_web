import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type MatchDocument = Match & Document;

@Schema({
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
})
export class Match {
  @Prop({ type: Types.ObjectId, ref: "Post", required: true, index: true })
  lost_post_id!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Post", required: true, index: true })
  found_post_id!: Types.ObjectId;

  @Prop({ required: true })
  score!: number;

  @Prop({ default: null })
  distance_km?: number;

  @Prop({ required: true, default: "ACTIVE" })
  status!: string;
}

export const MatchSchema = SchemaFactory.createForClass(Match);
MatchSchema.index({ lost_post_id: 1, found_post_id: 1 }, { unique: true });

