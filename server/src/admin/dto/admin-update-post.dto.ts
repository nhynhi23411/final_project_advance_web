import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class AdminUpdatePostDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: "title must not be empty" })
  @MaxLength(500)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;
}
