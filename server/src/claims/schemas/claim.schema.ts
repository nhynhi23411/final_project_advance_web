import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type ClaimDocument = Claim & Document;

export const CLAIM_STATUS = ["PENDING", "ACCEPTED", "REJECTED"] as const;
export type ClaimStatus = (typeof CLAIM_STATUS)[number];

@Schema({ timestamps: true })
export class Claim {
    @Prop({ type: Types.ObjectId, ref: "Post", required: true })
    post_id!: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: "User", required: true })
    claimer_id!: Types.ObjectId;

    @Prop({ default: "" })
    message!: string;

    @Prop({ enum: CLAIM_STATUS, default: "PENDING" })
    status!: ClaimStatus;
}

export const ClaimSchema = SchemaFactory.createForClass(Claim);
