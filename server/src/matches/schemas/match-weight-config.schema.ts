import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type MatchWeightConfigDocument = MatchWeightConfig & Document;

@Schema({ timestamps: { createdAt: "created_at", updatedAt: "updated_at" } })
export class MatchWeightConfig {
  @Prop({ type: Number, required: true, default: 20, min: 0, max: 100 })
  category_weight!: number;

  @Prop({ type: Number, required: true, default: 35, min: 0, max: 100 })
  text_weight!: number;

  @Prop({ type: Number, required: true, default: 25, min: 0, max: 100 })
  location_weight!: number;

  @Prop({ type: Number, required: true, default: 10, min: 0, max: 100 })
  time_weight!: number;

  @Prop({ type: Number, required: true, default: 10, min: 0, max: 100 })
  attributes_weight!: number;

  @Prop({ type: Boolean, default: true })
  is_active!: boolean;
}

export const MatchWeightConfigSchema = SchemaFactory.createForClass(MatchWeightConfig);

