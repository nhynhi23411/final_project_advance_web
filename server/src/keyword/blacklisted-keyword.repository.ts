import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  BlacklistedKeyword,
  BlacklistedKeywordDocument,
} from "./schemas/blacklisted-keyword.schema";

@Injectable()
export class BlacklistedKeywordRepository {
  constructor(
    @InjectModel(BlacklistedKeyword.name)
    private readonly model: Model<BlacklistedKeywordDocument>,
  ) {}

  findAll(): Promise<BlacklistedKeywordDocument[]> {
    return this.model.find().exec();
  }

  /**
   * Only return active keywords (is_active = true).
   */
  findActive(): Promise<BlacklistedKeywordDocument[]> {
    return this.model.find({ is_active: true }).exec();
  }

  // crud helpers used by admin service
  create(keyword: string): Promise<BlacklistedKeywordDocument> {
    return this.model.create({ keyword });
  }

  updateById(
    id: string,
    update: Partial<BlacklistedKeyword>,
  ): Promise<BlacklistedKeywordDocument | null> {
    return this.model
      .findByIdAndUpdate(id, update as any, { new: true })
      .exec();
  }

  deleteById(id: string): Promise<boolean> {
    return this.model.findByIdAndDelete(id).then((r) => !!r);
  }

  toggleStatus(
    id: string,
    is_active: boolean,
  ): Promise<BlacklistedKeywordDocument | null> {
    return this.model.findByIdAndUpdate(id, { is_active }, { new: true }).exec();
  }
}
