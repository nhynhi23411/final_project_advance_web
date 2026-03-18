import { IsString, IsOptional, MaxLength, IsIn, MinLength } from "class-validator";

/** Lý do đóng bài đăng: mã định sẵn hoặc mô tả tùy chọn */
export const CLOSE_REASON_CODES = [
  "FOUND",
  "RETURNED",
  "NO_LONGER_NEEDED",
  "OTHER",
] as const;
export type CloseReasonCode = (typeof CLOSE_REASON_CODES)[number];

export class ClosePostDto {
  @IsString()
  @MinLength(1, { message: "reason must not be empty" })
  @IsIn(CLOSE_REASON_CODES as unknown as string[], {
    message: "reason must be one of: FOUND, RETURNED, NO_LONGER_NEEDED, OTHER",
  })
  reason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  custom_reason?: string;
}
