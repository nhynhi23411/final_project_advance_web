import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  MaxLength,
  IsDateString,
} from "class-validator";
import { ITEM_TYPE, ITEM_STATUS } from "../schemas/item.schema";

export class CreateItemDto {
  @IsEnum(ITEM_TYPE)
  type!: "LOST" | "FOUND";

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

  /** URL ảnh (sau khi gọi POST /items/upload-image) */
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
  @IsEnum(ITEM_STATUS)
  status?: string;
}
