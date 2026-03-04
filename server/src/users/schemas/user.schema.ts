import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type UserDocument = User & Document;

@Schema({ timestamps: true })
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

  @Prop({ enum: ["FINDER", "ADMIN", "USER"], default: "FINDER" })
  role!: "FINDER" | "ADMIN" | "USER";

  @Prop({ enum: ["ACTIVE", "INACTIVE", "BANNED"], default: "ACTIVE" })
  status!: "ACTIVE" | "INACTIVE" | "BANNED";

  @Prop({ default: 0 })
  warning_count!: number;

  @Prop()
  created_at?: Date;

  @Prop()
  updated_at?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
