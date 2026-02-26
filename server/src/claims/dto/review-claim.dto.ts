import { IsEnum, IsNotEmpty } from "class-validator";

export class ReviewClaimDto {
    @IsNotEmpty()
    @IsEnum(["ACCEPTED", "REJECTED"])
    action!: "ACCEPTED" | "REJECTED";
}
