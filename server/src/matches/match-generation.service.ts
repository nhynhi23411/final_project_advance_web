import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Post, PostDocument } from "../posts/schemas/post.schema";
import { Match, MatchDocument } from "./schemas/match.schema";
import { MatchWeightConfig, MatchWeightConfigDocument } from "./schemas/match-weight-config.schema";
import { MatchScoringService } from "./match-scoring.service";

/** Số thao tác bulk mỗi lần gửi MongoDB (tránh một request quá lớn). */
const BULK_CHUNK_SIZE = 800;

const POST_FIELDS_FOR_MATCHING =
  "title description category location metadata post_type status";

@Injectable()
export class MatchGenerationService {
  constructor(
    @InjectModel(Post.name) private readonly postModel: Model<PostDocument>,
    @InjectModel(Match.name) private readonly matchModel: Model<MatchDocument>,
    @InjectModel(MatchWeightConfig.name)
    private readonly weightModel: Model<MatchWeightConfigDocument>,
    private readonly scoringService: MatchScoringService,
  ) {}

  async getOrCreateActiveWeights() {
    let cfg = await this.weightModel.findOne({ is_active: true }).sort({ updated_at: -1 }).exec();
    if (!cfg) {
      cfg = await this.weightModel.create({
        category_weight: 20,
        text_weight: 35,
        location_weight: 25,
        time_weight: 10,
        attributes_weight: 10,
        is_active: true,
      });
    }
    return cfg;
  }

  async recomputeAllMatches() {
    const weights = await this.getOrCreateActiveWeights();

    const [lostPosts, foundPosts] = await Promise.all([
      this.postModel
        .find({ post_type: "LOST", status: { $in: ["APPROVED", "RETURNED"] } })
        .select(POST_FIELDS_FOR_MATCHING)
        .lean()
        .exec(),
      this.postModel
        .find({ post_type: "FOUND", status: { $in: ["APPROVED", "RETURNED"] } })
        .select(POST_FIELDS_FOR_MATCHING)
        .lean()
        .exec(),
    ]);

    const weightPayload = {
      category_weight: weights.category_weight,
      text_weight: weights.text_weight,
      location_weight: weights.location_weight,
      time_weight: weights.time_weight,
      attributes_weight: weights.attributes_weight,
    };

    let processed = 0;
    const bulkOps: any[] = [];
    const now = new Date();

    const flushChunk = async () => {
      if (!bulkOps.length) return;
      const chunk = bulkOps.splice(0, BULK_CHUNK_SIZE);
      await this.matchModel.bulkWrite(chunk, { ordered: false });
    };

    for (const lost of lostPosts as any[]) {
      const lostId = String(lost._id);
      for (const found of foundPosts as any[]) {
        const foundId = String(found._id);
        if (lostId === foundId) continue;

        const score = this.scoringService.compute(lost, found, weightPayload);
        processed += 1;

        const roundedScore = Math.round(score.confidence_score);

        const commonSet = {
          my_post_id: new Types.ObjectId(lostId),
          matched_post_id: new Types.ObjectId(foundId),
          lost_post_id: new Types.ObjectId(lostId),
          found_post_id: new Types.ObjectId(foundId),
          score: roundedScore,
          distance_km: null,
          confidence_score: score.confidence_score,
          signals: score.signals,
        };

        // upsert: cập nhật điểm mà không đụng review_decision / status DB đã duyệt ($setOnInsert chỉ chạy khi tạo mới)
        bulkOps.push({
          updateOne: {
            filter: {
              lost_post_id: new Types.ObjectId(lostId),
              found_post_id: new Types.ObjectId(foundId),
            },
            update: {
              $set: {
                ...commonSet,
                updated_at: now,
              },
              $setOnInsert: {
                status: "ACTIVE",
                review_decision: "PENDING",
                created_at: now,
              },
            },
            upsert: true,
          },
        });

        if (bulkOps.length >= BULK_CHUNK_SIZE) {
          await flushChunk();
        }
      }
    }

    while (bulkOps.length) {
      await flushChunk();
    }

    return {
      processed_pairs: processed,
      lost_posts: lostPosts.length,
      found_posts: foundPosts.length,
    };
  }
}

