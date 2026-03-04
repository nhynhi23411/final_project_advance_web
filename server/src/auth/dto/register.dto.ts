import {
  IsEmail,
  IsNotEmpty,
  MinLength,
  IsOptional,
  IsEnum,
} from "class-validator";

export class RegisterDto {
  @IsNotEmpty()
  name!: string;

  @IsNotEmpty()
  username!: string;

  @IsEmail()
  email!: string;

  @MinLength(6)
  password!: string;

  @IsNotEmpty()
  phone!: string;

  @IsOptional()
  @IsEnum(["FINDER", "ADMIN", "USER"])
  role?: "FINDER" | "ADMIN" | "USER";
}
