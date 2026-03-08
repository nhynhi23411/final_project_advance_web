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
  @IsEnum(["FINDER", "ADMIN", "USER"])
  role?: "FINDER" | "ADMIN" | "USER";
}
