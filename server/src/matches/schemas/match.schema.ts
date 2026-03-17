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

  /** text_score: combined Dice + Cosine similarity (0–1), null for manual matches */
  @Prop({ default: null })
  text_score?: number;

  /** source: 'auto' = computed by cron job, 'manual' = triggered by Finder */
  @Prop({ enum: ["auto", "manual"], default: "auto" })
  source!: string;

  @Prop({ required: true, default: "ACTIVE" })
  status!: string;
}

export const MatchSchema = SchemaFactory.createForClass(Match);
MatchSchema.index({ lost_post_id: 1, found_post_id: 1 }, { unique: true });

