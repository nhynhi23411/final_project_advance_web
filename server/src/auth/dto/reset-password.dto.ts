import { IsNotEmpty, MinLength } from "class-validator";

export class ResetPasswordDto {
  @IsNotEmpty()
  token!: string;

  @MinLength(6)
  newPassword!: string;
}
