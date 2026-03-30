import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type BlacklistedKeywordDocument = BlacklistedKeyword & Document;

@Schema({
  collection: "blacklisted_keywords",
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
})
export class BlacklistedKeyword {
  @Prop({ required: true, unique: true })
  // use definite assignment assertion so TS strict mode is happy
  keyword!: string;

  @Prop({ default: true })
  // marked with `!` as well since mongoose will supply a value
  is_active!: boolean;

  @Prop()
  created_at?: Date;

  @Prop()
  updated_at?: Date;
}

export const BlacklistedKeywordSchema =
  SchemaFactory.createForClass(BlacklistedKeyword);
