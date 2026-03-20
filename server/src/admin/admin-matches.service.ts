import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Match, MatchDocument, MatchStatus } from "../matches/schemas/match.schema";
import {
  MatchWeightConfig,
  MatchWeightConfigDocument,
} from "../matches/schemas/match-weight-config.schema";
import { MatchGenerationService } from "../matches/match-generation.service";

type AdminMatchUpdateStatus = Extract<MatchStatus, "CONFIRMED" | "REJECTED">;

@Injectable()
export class AdminMatchesService {
  constructor(
    @InjectModel(Match.name) private readonly matchModel: Model<MatchDocument>,
    @InjectModel(MatchWeightConfig.name)
    private readonly weightModel: Model<MatchWeightConfigDocument>,
    private readonly matchGenerationService: MatchGenerationService,
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
    if (query.status && ["PENDING", "CONFIRMED", "REJECTED"].includes(query.status)) {
      filter.review_decision = query.status;
    }

    const minConfidence = parseFloat(query.minConfidence || "");
    const maxConfidence = parseFloat(query.maxConfidence || "");
    if (!Number.isNaN(minConfidence) || !Number.isNaN(maxConfidence)) {
      const confidenceFilter: Record<string, number> = {};
      if (!Number.isNaN(minConfidence)) confidenceFilter.$gte = minConfidence;
      if (!Number.isNaN(maxConfidence)) confidenceFilter.$lte = maxConfidence;
      filter.score = confidenceFilter;
    }

    const [items, total] = await Promise.all([
      this.matchModel
        .find(filter)
        .populate("lost_post_id", "title category location metadata images createdAt")
        .populate("found_post_id", "title category location metadata images createdAt")
        .populate("my_post_id", "title category location metadata images createdAt")
        .populate("matched_post_id", "title category location metadata images createdAt")
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.matchModel.countDocuments(filter).exec(),
    ]);
    const normalizedItems = items.map((doc: any) => {
      const confidence =
        typeof doc.confidence_score === "number"
          ? doc.confidence_score
          : typeof doc.score === "number"
            ? doc.score
            : 0;
      return {
        ...doc.toObject(),
        confidence_score: confidence,
        status: doc.review_decision || "PENDING",
      };
    });

    return { items: normalizedItems, page, limit, total };
  }

  async updateMatchStatus(id: string, status: AdminMatchUpdateStatus) {
    if (!["CONFIRMED", "REJECTED"].includes(status)) {
      throw new BadRequestException("Trạng thái match không hợp lệ");
    }

    const match = await this.matchModel.findById(id).exec();
    if (!match) throw new NotFoundException("Không tìm thấy match");

    (match as any).review_decision = status;
    // DB validator requires ACTIVE|DISMISSED
    match.status = status === "REJECTED" ? "DISMISSED" : "ACTIVE";
    (match as any).reviewed_at = new Date();
    await match.save();
    const payload: any = match.toObject();
    payload.confidence_score =
      typeof payload.confidence_score === "number" ? payload.confidence_score : payload.score || 0;
    payload.status = payload.review_decision || "PENDING";
    return payload;
  }

  async getWeightConfig() {
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

  async updateWeightConfig(payload: {
    category_weight: number;
    text_weight: number;
    location_weight: number;
    time_weight: number;
    attributes_weight: number;
  }) {
    const values = [
      payload.category_weight,
      payload.text_weight,
      payload.location_weight,
      payload.time_weight,
      payload.attributes_weight,
    ];
    if (values.some((v) => Number.isNaN(Number(v)) || Number(v) < 0 || Number(v) > 100)) {
      throw new BadRequestException("Mỗi trọng số phải nằm trong khoảng 0..100");
    }
    const sum = values.reduce((acc, v) => acc + Number(v), 0);
    if (Math.round(sum) !== 100) {
      throw new BadRequestException("Tổng trọng số phải bằng 100");
    }

    let cfg = await this.weightModel.findOne({ is_active: true }).sort({ updated_at: -1 }).exec();
    if (!cfg) {
      cfg = new this.weightModel({ ...payload, is_active: true });
    } else {
      cfg.category_weight = Number(payload.category_weight);
      cfg.text_weight = Number(payload.text_weight);
      cfg.location_weight = Number(payload.location_weight);
      cfg.time_weight = Number(payload.time_weight);
      cfg.attributes_weight = Number(payload.attributes_weight);
    }
    await cfg.save();
    return cfg;
  }

  recomputeMatches() {
    return this.matchGenerationService.recomputeAllMatches();
  }
}

