import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  MaxLength,
  IsDateString,
} from "class-validator";
import { POST_TYPE, POST_STATUS } from "../schemas/post.schema";

export class CreatePostDto {
  @IsOptional()
  @IsEnum(POST_TYPE)
  post_type?: "LOST" | "FOUND";

  @IsOptional()
  @IsEnum(POST_TYPE)
  type?: "LOST" | "FOUND";

  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  location?: Record<string, any>;

  @IsOptional()
  @IsString()
  location_text?: string;

  @IsOptional()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsString()
  lost_found_date?: string;

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
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  image_public_ids?: string[];

  @IsOptional()
  @IsEnum(POST_STATUS)
  status?: string;

  @IsOptional()
  dedupe_hash?: string;

  @IsOptional()
  scoring_value?: number;

  @IsOptional()
  approved_at?: Date;

  @IsOptional()
  reject_reason?: string;

  @IsOptional()
  archived_reason?: string;

  @IsOptional()
  is_match_scored?: boolean;
}
