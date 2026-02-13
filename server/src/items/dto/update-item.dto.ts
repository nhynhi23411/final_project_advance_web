import { IsEnum, IsOptional, IsString, IsArray, MaxLength, IsDateString } from "class-validator";
import { ITEM_TYPE } from "../schemas/item.schema";

export class UpdateItemDto {
  @IsOptional()
  @IsEnum(ITEM_TYPE)
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
}
