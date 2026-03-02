import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import { BlacklistedKeywordRepository } from "./blacklisted-keyword.repository";

@Injectable()
export class KeywordService implements OnModuleInit {
  private readonly logger = new Logger(KeywordService.name);
  private blacklistedKeywords: string[] = [];

  constructor(private readonly keywordRepo: BlacklistedKeywordRepository) {}

  async onModuleInit() {
    await this.reloadCache();
  }

  /**
   * Load all active keywords from database and store them in RAM (lowercased).
   * Public so other services can refresh the cache without restarting.
   */
  public async reloadCache() {
    const records = await this.keywordRepo.findActive();
    this.blacklistedKeywords = records.map((r) => r.keyword.toLowerCase());
    this.logger.log(
      `Reloaded ${this.blacklistedKeywords.length} keywords into RAM`,
    );
  }

  /**
   * Simple profanity check using string inclusion.
   */
  checkProfanity(text: string): boolean {
    const lowered = text.toLowerCase();
    return this.blacklistedKeywords.some((kw) => lowered.includes(kw));
  }
}
