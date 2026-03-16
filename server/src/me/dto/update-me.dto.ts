import { IsEmail, IsOptional, IsString, MinLength } from "class-validator";

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: "Họ tên không được để trống" })
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: "Email không đúng định dạng" })
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
