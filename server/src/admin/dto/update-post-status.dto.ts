import { IsEnum, IsOptional, IsString } from "class-validator";

export const ADMIN_POST_STATUS = [
  "APPROVED",
  "NEEDS_UPDATE",
  "REJECTED",
] as const;
export type AdminPostStatus = (typeof ADMIN_POST_STATUS)[number];

export class UpdatePostStatusDto {
  @IsEnum(ADMIN_POST_STATUS)
  status!: AdminPostStatus;

  @IsOptional()
  @IsString()
  reject_reason?: string;
}
