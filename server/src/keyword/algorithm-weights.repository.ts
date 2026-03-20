import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  AlgorithmWeights,
  AlgorithmWeightsDocument,
} from "./schemas/algorithm-weights.schema";

@Injectable()
export class AlgorithmWeightsRepository {
  constructor(
    @InjectModel(AlgorithmWeights.name)
    private readonly model: Model<AlgorithmWeightsDocument>,
  ) {}

  /**
   * Our admin UI is built around a single default weights set.
   */
  findDefault(): Promise<AlgorithmWeightsDocument | null> {
    return this.model.findOne({ key: "default" }).exec();
  }

  async upsertDefault(
    input: Partial<
      Pick<AlgorithmWeights, "category" | "text" | "location" | "time" | "attributes">
    >,
  ): Promise<AlgorithmWeightsDocument> {
    const updated = await this.model
      .findOneAndUpdate(
        { key: "default" },
        { $set: input, $setOnInsert: { key: "default" } },
        { new: true, upsert: true },
      )
      .exec();

    // Should never be null because we use upsert: true.
    return updated;
  }
}

