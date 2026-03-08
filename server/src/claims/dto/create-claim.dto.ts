import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateClaimDto {
    @IsNotEmpty()
    @IsString()
    post_id!: string;

    @IsOptional()
    @IsString()
    message?: string;

    @IsOptional()
    @IsString()
    secret_info?: string;

    @IsOptional()
    @IsString()
    image_proof_url?: string;
}
