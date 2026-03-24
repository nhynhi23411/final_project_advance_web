import { IsEnum, IsOptional, IsString, IsArray, MaxLength, IsDateString } from "class-validator";
import { POST_TYPE } from "../schemas/post.schema";

export class UpdatePostDto {
  @IsOptional()
  @IsEnum(POST_TYPE)
  type?: "LOST" | "FOUND";

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  distinctive_marks?: string;

  @IsOptional()
  @IsDateString()
  lost_found_date?: string;

  @IsOptional()
  @IsString()
  location_text?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  image_public_ids?: string[];

  @IsOptional()
  @IsString()
  existing_image?: string;
}
