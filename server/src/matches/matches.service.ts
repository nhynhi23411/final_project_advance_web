import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Match, MatchDocument } from "./schemas/match.schema";
import { Post, PostDocument } from "../posts/schemas/post.schema";

const MIN_SUGGESTION_SCORE = 0.6;

@Injectable()
export class MatchesService {
  private readonly logger = new Logger(MatchesService.name);

  constructor(
    @InjectModel(Match.name) private readonly matchModel: Model<MatchDocument>,
    @InjectModel(Post.name) private readonly postModel: Model<PostDocument>,
  ) {}

  async findSuggestionsByUser(userId: string) {
    const uid = new Types.ObjectId(userId);

    const userPostIds = await this.postModel
      .find({ created_by_user_id: uid, status: "APPROVED" })
      .distinct("_id")
      .exec();

    if (userPostIds.length === 0) return [];

    const matches = await this.matchModel
      .find({
        status: "ACTIVE",
        score: { $gte: MIN_SUGGESTION_SCORE },
        $or: [
          { lost_post_id: { $in: userPostIds } },
          { found_post_id: { $in: userPostIds } },
        ],
      })
      .sort({ score: -1 })
      .lean()
      .exec();

    const allPostIds = [
      ...new Set(
        matches.flatMap((m: any) => [
          m.lost_post_id.toString(),
          m.found_post_id.toString(),
        ]),
      ),
    ];

    const posts = await this.postModel
      .find({ _id: { $in: allPostIds } })
      .select("_id title post_type category images location status metadata")
      .lean()
      .exec();

    const postMap = new Map(posts.map((p: any) => [p._id.toString(), p]));
    const userPostIdSet = new Set(userPostIds.map((id: any) => id.toString()));

    return matches.map((m: any) => {
      const lostId = m.lost_post_id.toString();
      const foundId = m.found_post_id.toString();
      const isOwnerLost = userPostIdSet.has(lostId);

      return {
        _id: m._id,
        score: m.score,
        distance_km: m.distance_km,
        created_at: m.created_at,
        my_post: postMap.get(isOwnerLost ? lostId : foundId) || null,
        matched_post: postMap.get(isOwnerLost ? foundId : lostId) || null,
      };
    });
  }

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

