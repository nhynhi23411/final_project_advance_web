import { IsMongoId } from "class-validator";

export class CreateManualMatchDto {
  @IsMongoId()
  lost_post_id!: string;

  @IsMongoId()
  found_post_id!: string;
}