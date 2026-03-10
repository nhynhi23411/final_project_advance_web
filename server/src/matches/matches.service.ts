import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Match, MatchDocument } from "./schemas/match.schema";

@Injectable()
export class MatchesService {
  private readonly logger = new Logger(MatchesService.name);

  constructor(
    @InjectModel(Match.name) private readonly matchModel: Model<MatchDocument>,
  ) {}

  async upsertMatch(input: {
    lostPostId: string;
    foundPostId: string;
    score: number;
    distanceKm?: number | null;
  }): Promise<boolean> {
    const lostId = new Types.ObjectId(input.lostPostId);
    const foundId = new Types.ObjectId(input.foundPostId);

    try {
      const res = await this.matchModel
        .updateOne(
          { lost_post_id: lostId, found_post_id: foundId },
          {
            $setOnInsert: {
              lost_post_id: lostId,
              found_post_id: foundId,
              status: "ACTIVE",
              created_at: new Date(),
            },
            $set: {
              score: input.score,
              distance_km: input.distanceKm ?? null,
              updated_at: new Date(),
            },
          },
          { upsert: true },
        )
        .exec();

      const created = (res as any).upsertedCount > 0 || (res as any).upsertedId;
      if (created) {
        this.logger.log(
          `Created match lost=${input.lostPostId} found=${input.foundPostId} score=${input.score}`,
        );
        return true;
      }
      return false;
    } catch (e) {
      this.logger.error(
        `Failed to upsert match lost=${input.lostPostId} found=${input.foundPostId}`,
      );
      this.logger.error(e);

      const anyErr = e as any;
      if (anyErr?.errInfo) {
        try {
          this.logger.error(
            `Mongo errInfo: ${JSON.stringify(anyErr.errInfo, null, 2)}`,
          );
        } catch {
          this.logger.error("Mongo errInfo (raw):", anyErr.errInfo);
        }
      }

      throw e;
    }
  }
}

