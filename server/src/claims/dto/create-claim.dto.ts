import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateClaimDto {
    @IsNotEmpty()
    @IsString()
    post_id!: string;

    @IsOptional()
    @IsString()
    message?: string;
}
