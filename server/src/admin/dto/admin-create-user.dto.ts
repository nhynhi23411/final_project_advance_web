import {
  IsEmail,
  IsNotEmpty,
  MinLength,
  IsOptional,
  IsEnum,
} from "class-validator";

export class AdminCreateUserDto {
  @IsNotEmpty({ message: "Họ tên không được để trống" })
  name!: string;

  @IsNotEmpty({ message: "Username không được để trống" })
  username!: string;

  @IsEmail({}, { message: "Email không hợp lệ" })
  email!: string;

  @MinLength(6, { message: "Mật khẩu tối thiểu 6 ký tự" })
  password!: string;

  @IsNotEmpty({ message: "Số điện thoại không được để trống" })
  phone!: string;

  @IsOptional()
  @IsEnum(["FINDER", "ADMIN", "USER"])
  role?: "FINDER" | "ADMIN" | "USER";
}
