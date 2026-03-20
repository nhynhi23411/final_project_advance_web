import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type MatchDocument = Match & Document;

export const MATCH_STATUS = [
  "PENDING",
  "CONFIRMED",
  "REJECTED",
  "ACTIVE",
  "DISMISSED",
] as const;
export type MatchStatus = (typeof MATCH_STATUS)[number];

@Schema({ timestamps: { createdAt: "created_at", updatedAt: "updated_at" } })
export class Match {
  // Legacy-compatible fields for existing MongoDB validator/rules
  @Prop({ type: Types.ObjectId, ref: "Post", required: false })
  my_post_id?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Post", required: false })
  matched_post_id?: Types.ObjectId;

  @Prop({ type: Number, required: false, min: 0, max: 100 })
  score?: number;

  @Prop({ type: Number, default: null })
  distance_km?: number | null;

  @Prop({ type: String, enum: ["PENDING", "CONFIRMED", "REJECTED"], default: "PENDING" })
  review_decision?: "PENDING" | "CONFIRMED" | "REJECTED";

  @Prop({ type: Types.ObjectId, ref: "Post", required: true })
  lost_post_id!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Post", required: true })
  found_post_id!: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 0, max: 100 })
  confidence_score!: number;

  @Prop({ type: String, enum: MATCH_STATUS, default: "PENDING" })
  status!: MatchStatus;

  @Prop({ type: Object, default: {} })
  signals?: Record<string, unknown>;

  @Prop({ type: [String], default: [] })
  reasons?: string[];

  @Prop({ type: Date, default: null })
  reviewed_at?: Date | null;
}

export const MatchSchema = SchemaFactory.createForClass(Match);

// Tăng tốc recompute (upsert theo cặp) và tránh trùng cặp
MatchSchema.index({ lost_post_id: 1, found_post_id: 1 }, { unique: true });

