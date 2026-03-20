import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Match, MatchDocument } from "./schemas/match.schema";
import { Post, PostDocument } from "../posts/schemas/post.schema";
import { User, UserDocument } from "../users/schemas/user.schema";
import { CreateManualMatchDto } from "./dto/create-manual-match.dto";

const MIN_SUGGESTION_SCORE = 60;

@Injectable()
export class MatchesService {
  private readonly logger = new Logger(MatchesService.name);

  constructor(
    @InjectModel(Match.name) private readonly matchModel: Model<MatchDocument>,
    @InjectModel(Post.name) private readonly postModel: Model<PostDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly eventEmitter: EventEmitter2,
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
        text_score: m.text_score ?? null,
        distance_km: m.distance_km,
        source: m.source ?? "auto",
        created_at: m.created_at,
        my_post: postMap.get(isOwnerLost ? lostId : foundId) || null,
        matched_post: postMap.get(isOwnerLost ? foundId : lostId) || null,
      };
    });
  }

  async createManualSuggestion(
    dto: CreateManualMatchDto,
    currentUserId: string,
  ): Promise<{ message: string; created: boolean }> {
    const [lostPost, foundPost] = await Promise.all([
      this.postModel.findById(dto.lost_post_id).exec(),
      this.postModel.findById(dto.found_post_id).exec(),
    ]);

    if (!lostPost) {
      throw new NotFoundException("Không tìm thấy bài đăng mất đồ cần liên kết");
    }
    if (!foundPost) {
      throw new NotFoundException("Không tìm thấy bài đăng nhặt được để liên kết");
    }

    if (lostPost.status !== "APPROVED") {
      throw new BadRequestException("Chỉ có thể liên kết với bài mất đồ đã được duyệt");
    }
    if (foundPost.status !== "APPROVED") {
      throw new BadRequestException("Bài nhặt được của bạn cần được duyệt trước khi liên kết");
    }
    if (lostPost.post_type !== "LOST") {
      throw new BadRequestException("Bài cần liên kết phải là bài mất đồ");
    }
    if (foundPost.post_type !== "FOUND") {
      throw new BadRequestException("Bạn chỉ có thể dùng bài nhặt được để liên kết");
    }

    const foundOwnerId = foundPost.created_by_user_id?.toString();
    const lostOwnerId = lostPost.created_by_user_id?.toString();

    if (foundOwnerId !== currentUserId) {
      throw new ForbiddenException("Bạn chỉ được liên kết bằng bài nhặt được của chính mình");
    }
    if (lostOwnerId === currentUserId) {
      throw new BadRequestException("Không thể tự liên kết bài mất đồ của chính bạn");
    }

    const created = await this.upsertMatch({
      lostPostId: dto.lost_post_id,
      foundPostId: dto.found_post_id,
      score: 1,
      distanceKm: null,
      textScore: null,
      source: "manual",
    });

    return {
      message: created
        ? "Đã gửi gợi ý khớp tới chủ bài mất đồ"
        : "Gợi ý khớp này đã tồn tại trước đó",
      created,
    };
  }

  async upsertMatch(input: {
    lostPostId: string;
    foundPostId: string;
    score: number;
    distanceKm?: number | null;
    textScore?: number | null;
    source?: "auto" | "manual";
  }): Promise<boolean> {
    const lostId = new Types.ObjectId(input.lostPostId);
    const foundId = new Types.ObjectId(input.foundPostId);

    const existing = await this.matchModel
      .findOne({ lost_post_id: lostId, found_post_id: foundId })
      .select("review_status")
      .lean()
      .exec();
    const rs = (existing as any)?.review_status as string | undefined;
    if (rs === "CONFIRMED" || rs === "REJECTED") {
      return false;
    }

    try {
      const res = await this.matchModel
        .updateOne(
          { lost_post_id: lostId, found_post_id: foundId },
          {
            $setOnInsert: {
              lost_post_id: lostId,
              found_post_id: foundId,
              status: "ACTIVE",
              review_status: "PENDING",
              created_at: new Date(),
            },
            $set: {
              status: "ACTIVE",
              score: Math.round(input.score * 100),
              distance_km: input.distanceKm ?? null,
              text_score: input.textScore != null ? Math.round(input.textScore * 100) : null,
              source: input.source ?? "auto",
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

        // Emit match.suggested event for notification system
        try {
          const foundPost = await this.postModel
            .findById(foundId)
            .select("created_by_user_id")
            .exec();
          if (foundPost?.created_by_user_id) {
            const finder = await this.userModel
              .findById(foundPost.created_by_user_id)
              .select("name")
              .exec();
            const lostPost = await this.postModel
              .findById(lostId)
              .select("title")
              .exec();

            this.eventEmitter.emit("match.suggested", {
              matchId: (res as any).upsertedId || `${lostId}-${foundId}`,
              lostPostId: input.lostPostId,
              foundPostId: input.foundPostId,
              finderId: foundPost.created_by_user_id.toString(),
              finderName: finder?.name || "người dùng",
            });
          }
        } catch (err) {
          this.logger.error(`Failed to emit match.suggested event: ${err}`);
        }

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

  /**
   * When admin updates Algorithm Weights, we need suggestions computed from "auto"
   * to reflect the new thresholds. To avoid stale suggestions, we dismiss existing
   * auto matches in the candidate sets before re-computing.
   *
   * Manual matches are NOT dismissed.
   */
  async dismissAutoMatchesForCandidates(
    lostIds: Types.ObjectId[],
    foundIds: Types.ObjectId[],
  ): Promise<void> {
    if (lostIds.length === 0 || foundIds.length === 0) return;

    await this.matchModel
      .updateMany(
        {
          status: "ACTIVE",
          source: "auto",
          lost_post_id: { $in: lostIds },
          found_post_id: { $in: foundIds },
          $or: [
            { review_status: { $exists: false } },
            { review_status: null },
            { review_status: "PENDING" },
          ],
        },
        {
          $set: {
            status: "DISMISSED",
            updated_at: new Date(),
          },
        },
      )
      .exec();
  }

  /** Return raw { lost_post_id, found_post_id } pairs for a given set of post IDs.
   *  Used by the cron job to skip already-existing pairs. */
  async findRawPairsForIds(
    lostIds: Types.ObjectId[],
    foundIds: Types.ObjectId[],
  ): Promise<{ lost_post_id: Types.ObjectId; found_post_id: Types.ObjectId }[]> {
    return this.matchModel
      .find(
        { lost_post_id: { $in: lostIds }, found_post_id: { $in: foundIds } },
        { lost_post_id: 1, found_post_id: 1, _id: 0 },
      )
      .lean()
      .exec() as Promise<{ lost_post_id: Types.ObjectId; found_post_id: Types.ObjectId }[]>;
  }
}

