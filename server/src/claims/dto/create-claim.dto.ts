import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateClaimDto {
    @IsNotEmpty()
    @IsString()
    item_id!: string;

    @IsOptional()
    @IsString()
    message?: string;
}
