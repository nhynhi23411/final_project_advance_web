import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type UserDocument = User & Document;

@Schema({ timestamps: { createdAt: "created_at", updatedAt: "updated_at" } })
export class User {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  username!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true, minlength: 6 })
  password!: string;

  @Prop({ required: true, trim: true })
  phone!: string;

  @Prop({ enum: ["ADMIN", "USER"], default: "USER" })
  role!: "ADMIN" | "USER";

  @Prop({ enum: ["ACTIVE", "BANNED"], default: "ACTIVE" })
  status!: "ACTIVE" | "BANNED";

  @Prop({ default: 0 })
  warning_count!: number;

  @Prop({ default: false })
  is_online!: boolean;

  @Prop({ type: Date, default: null })
  last_seen_at?: Date | null;

  @Prop({ type: String, default: null })
  password_reset_token_hash?: string | null;

  @Prop({ type: Date, default: null })
  password_reset_expires_at?: Date | null;

  @Prop()
  created_at?: Date;

  @Prop()
  updated_at?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
