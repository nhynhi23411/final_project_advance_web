import { IsEnum, IsNotEmpty } from "class-validator";

export class ReviewClaimDto {
    @IsNotEmpty()
    @IsEnum(["UNDER_VERIFICATION", "SUCCESSFUL", "REJECTED", "CANCELLED"])
    action!: "UNDER_VERIFICATION" | "SUCCESSFUL" | "REJECTED" | "CANCELLED";
}
