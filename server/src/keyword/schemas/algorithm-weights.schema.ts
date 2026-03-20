import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type AlgorithmWeightsDocument = AlgorithmWeights & Document;

@Schema({
  collection: "algorithm_weights",
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
})
export class AlgorithmWeights {
  @Prop({ required: true, unique: true, default: "default" })
  key!: string;

  /**
   * Normalized weights (fractions, sum to 1).
   * Defaults match the current hard-coded values in `TasksService.computeScore`.
   */
  @Prop({ required: true, min: 0, max: 1, default: 0.2 })
  category!: number;

  @Prop({ required: true, min: 0, max: 1, default: 0.35 })
  text!: number;

  @Prop({ required: true, min: 0, max: 1, default: 0.25 })
  location!: number;

  @Prop({ required: true, min: 0, max: 1, default: 0.1 })
  time!: number;

  @Prop({ required: true, min: 0, max: 1, default: 0.1 })
  attributes!: number;

  @Prop()
  created_at?: Date;

  @Prop()
  updated_at?: Date;
}

export const AlgorithmWeightsSchema =
  SchemaFactory.createForClass(AlgorithmWeights);

