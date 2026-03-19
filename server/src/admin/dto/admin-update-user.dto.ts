import { IsOptional, IsEmail, IsEnum, IsString, MinLength } from "class-validator";

export class AdminUpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEnum(["ADMIN", "USER"])
  role?: "ADMIN" | "USER";
}
