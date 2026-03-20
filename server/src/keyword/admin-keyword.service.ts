import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { BlacklistedKeywordRepository } from "./blacklisted-keyword.repository";
import { KeywordService } from "./keyword.service";
import { BlacklistedKeywordDocument } from "./schemas/blacklisted-keyword.schema";
import { AlgorithmWeightsRepository } from "./algorithm-weights.repository";
import { AlgorithmWeights } from "./schemas/algorithm-weights.schema";

@Injectable()
export class AdminKeywordService implements OnModuleInit {
  private readonly logger = new Logger(AdminKeywordService.name);

  private algorithmWeightsCache: AlgorithmWeights | null = null;

  private readonly DEFAULT_WEIGHTS: Pick<
    AlgorithmWeights,
    "category" | "text" | "location" | "time" | "attributes"
  > = {
    category: 0.2,
    text: 0.35,
    location: 0.25,
    time: 0.1,
    attributes: 0.1,
  };

  constructor(
    private readonly repo: BlacklistedKeywordRepository,
    private readonly keywordService: KeywordService,
    private readonly weightsRepo: AlgorithmWeightsRepository,
  ) {}

  async onModuleInit() {
    try {
      const doc = await this.weightsRepo.findDefault();
      if (doc) {
        this.algorithmWeightsCache = doc;
        return;
      }

      // No default row -> create one with current defaults.
      const created = await this.weightsRepo.upsertDefault(
        this.DEFAULT_WEIGHTS,
      );
      this.algorithmWeightsCache = created;
    } catch (e) {
      // Fail-safe: keep defaults in memory so scoring still works.
      this.logger.error(
        `Failed to load AlgorithmWeights from DB. Fallback to defaults: ${(e as any)?.message || e}`,
      );
      this.algorithmWeightsCache = null;
    }
  }

  async create(word: string): Promise<BlacklistedKeywordDocument> {
    const rec = await this.repo.create(word);
    await this.keywordService.reloadCache();
    this.logger.log("RAM Cache updated after Admin modification");
    return rec;
  }

  async update(
    id: string,
    updates: Partial<BlacklistedKeywordDocument>,
  ): Promise<BlacklistedKeywordDocument | null> {
    const rec = await this.repo.updateById(id, updates as any);
    await this.keywordService.reloadCache();
    this.logger.log("RAM Cache updated after Admin modification");
    return rec;
  }

  async delete(id: string): Promise<boolean> {
    const ok = await this.repo.deleteById(id);
    await this.keywordService.reloadCache();
    this.logger.log("RAM Cache updated after Admin modification");
    return ok;
  }

  async toggleStatus(id: string, isActive: boolean) {
    const rec = await this.repo.toggleStatus(id, isActive);
    await this.keywordService.reloadCache();
    this.logger.log("RAM Cache updated after Admin modification");
    return rec;
  }

  async findAllBlacklistedKeywords(): Promise<BlacklistedKeywordDocument[]> {
    return this.repo.findAll();
  }

  getAlgorithmWeights() {
    // Ensure we always return something valid.
    const w = this.algorithmWeightsCache;
    if (!w) return this.DEFAULT_WEIGHTS;
    return {
      category: w.category,
      text: w.text,
      location: w.location,
      time: w.time,
      attributes: w.attributes,
    };
  }

  /**
   * Update algorithm weights.
   * Input may come from UI as percent (0-100) or normalized fractions.
   * This method always normalizes the final fractions so their sum = 1.
   */
  async updateAlgorithmWeights(input: {
    category: number;
    text: number;
    location: number;
    time: number;
    attributes: number;
  }): Promise<Pick<
    AlgorithmWeights,
    "category" | "text" | "location" | "time" | "attributes"
  >> {
    const sanitize = (v: any) => {
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? n : 0;
    };

    const c = sanitize(input.category);
    const t = sanitize(input.text);
    const l = sanitize(input.location);
    const ti = sanitize(input.time);
    const a = sanitize(input.attributes);

    const sum = c + t + l + ti + a;
    const fractions =
      sum > 0
        ? {
            category: c / sum,
            text: t / sum,
            location: l / sum,
            time: ti / sum,
            attributes: a / sum,
          }
        : { ...this.DEFAULT_WEIGHTS };

    const saved = await this.weightsRepo.upsertDefault(fractions);
    this.algorithmWeightsCache = saved;

    return fractions;
  }
}
