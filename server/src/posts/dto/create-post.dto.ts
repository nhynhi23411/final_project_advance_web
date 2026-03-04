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
  @IsEnum(POST_TYPE)
  post_type!: "LOST" | "FOUND";

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
  metadata?: Record<string, any>;

  /** URL ảnh (sau khi gọi POST /posts/upload-image) */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  /** public_id từ Cloudinary (để xóa ảnh khi xóa bài) */
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
