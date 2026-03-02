import { Injectable, Logger } from "@nestjs/common";
import { BlacklistedKeywordRepository } from "./blacklisted-keyword.repository";
import { KeywordService } from "./keyword.service";
import { BlacklistedKeywordDocument } from "./schemas/blacklisted-keyword.schema";

@Injectable()
export class AdminKeywordService {
  private readonly logger = new Logger(AdminKeywordService.name);

  constructor(
    private readonly repo: BlacklistedKeywordRepository,
    private readonly keywordService: KeywordService,
  ) {}

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
}
