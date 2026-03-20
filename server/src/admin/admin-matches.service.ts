import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Match, MatchDocument } from "../matches/schemas/match.schema";

type AdminMatchReview = "CONFIRMED" | "REJECTED";

@Injectable()
export class AdminMatchesService {
  constructor(
    @InjectModel(Match.name) private readonly matchModel: Model<MatchDocument>,
  ) {}

  async findAllMatches(query: {
    page?: string;
    limit?: string;
    status?: string;
    minConfidence?: string;
    maxConfidence?: string;
  }) {
    const page = Math.max(1, parseInt(query.page || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || "20", 10) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (
      query.status &&
      ["PENDING", "CONFIRMED", "REJECTED"].includes(query.status)
    ) {
      if (query.status === "PENDING") {
        filter.$or = [
          { review_status: "PENDING" },
          { review_status: { $exists: false } },
          { review_status: null },
        ];
      } else {
        filter.review_status = query.status;
      }
    }

    const minConfidence = parseFloat(query.minConfidence || "");
    const maxConfidence = parseFloat(query.maxConfidence || "");
    /** DB stores score 0–100 (see MatchesService.upsertMatch). Accept query as 0–100 or 0–1. */
    const toDbScore = (v: number) =>
      v > 0 && v <= 1 ? Math.round(v * 100) : v;
    if (!Number.isNaN(minConfidence) || !Number.isNaN(maxConfidence)) {
      const scoreFilter: Record<string, number> = {};
      if (!Number.isNaN(minConfidence)) scoreFilter.$gte = toDbScore(minConfidence);
      if (!Number.isNaN(maxConfidence)) scoreFilter.$lte = toDbScore(maxConfidence);
      filter.score = scoreFilter;
    }

    const [items, total] = await Promise.all([
      this.matchModel
        .find(filter)
        .populate(
          "lost_post_id",
          "title description category location metadata images createdAt post_type status",
        )
        .populate(
          "found_post_id",
          "title description category location metadata images createdAt post_type status",
        )
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.matchModel.countDocuments(filter).exec(),
    ]);

    const normalized = items.map((doc: any) => {
      const o = doc.toObject ? doc.toObject() : doc;
      const rs = o.review_status || "PENDING";
      const rawScore = typeof o.score === "number" ? o.score : 0;
      return {
        ...o,
        /** 0–1 for display (stored as 0–100) */
        confidence_score: rawScore / 100,
        score_percent: rawScore,
        status: rs,
        review_status: rs,
      };
    });

    return { items: normalized, page, limit, total };
  }

  async updateMatchStatus(id: string, status: AdminMatchReview) {
    if (!["CONFIRMED", "REJECTED"].includes(status)) {
      throw new BadRequestException("Trạng thái match không hợp lệ");
    }

    const match = await this.matchModel.findById(id).exec();
    if (!match) throw new NotFoundException("Không tìm thấy match");

    (match as any).review_status = status;
    if (status === "REJECTED") {
      match.status = "DISMISSED";
    } else {
      match.status = "ACTIVE";
    }
    await match.save();

    const payload: any = match.toObject();
    const rs = payload.review_status || "PENDING";
    const rawScore = typeof payload.score === "number" ? payload.score : 0;
    payload.confidence_score = rawScore / 100;
    payload.score_percent = rawScore;
    payload.status = rs;
    return payload;
  }
}
