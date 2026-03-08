import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type ClaimDocument = Claim & Document;

export const CLAIM_STATUS = [
    "PENDING",
    "UNDER_VERIFICATION",
    "SUCCESSFUL",
    "REJECTED",
    "CANCELLED"
] as const;
export type ClaimStatus = (typeof CLAIM_STATUS)[number];

@Schema({ timestamps: { createdAt: "created_at", updatedAt: "updated_at" } })
export class Claim {
    @Prop({ type: Types.ObjectId, ref: "Post", required: true, alias: "post_id" })
    target_post_id!: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: "User", required: true, alias: "claimer_id" })
    claimant_user_id!: Types.ObjectId;

    @Prop({ default: "" })
    message!: string;

    @Prop({ default: "" })
    secret_info!: string;

    @Prop({ default: "" })
    image_proof_url!: string;

    @Prop({ enum: CLAIM_STATUS, default: "PENDING" })
    status!: ClaimStatus;

    @Prop({ type: Number, default: 3 })
    max_claims_limit_snapshot!: number;

    // Virtuals aliases so old code using post_id / claimer_id keeps working
    post_id!: Types.ObjectId;
    claimer_id!: Types.ObjectId;
}

export const ClaimSchema = SchemaFactory.createForClass(Claim);
