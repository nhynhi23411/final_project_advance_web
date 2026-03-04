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
    console.log('Querying keywords from DB...');
    const records = await this.keywordRepo.findActive();
    console.log('Database Name:', (this.keywordRepo as any).model.db.name);
    
    this.blacklistedKeywords = records.map((r) => r.keyword.trim().toLowerCase());
    console.log('--- TRẠNG THÁI RAM ---:', Object.keys(this.blacklistedKeywords).length, 'từ khóa');
    this.logger.log(
      `Reloaded ${this.blacklistedKeywords.length} keywords into RAM`,
    );
  }

  /**
   * Simple profanity check using string inclusion.
   */
  checkProfanity(text: string): boolean {
    if (!text) return false;
    
    // 1. Chuẩn hóa: bỏ dấu tiếng Việt, bỏ các ký tự đặc biệt như . , _ - và bỏ khoảng trắng
    const normalizedText = text.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Bỏ dấu tiếng Việt
      .replace(/[.,\-_ ]/g, ''); // Bỏ ký tự đặc biệt

    console.log('--- DEBUG FILTER ---');
    console.log('Text sau chuẩn hóa:', normalizedText);
    console.log('Danh sách RAM:', this.blacklistedKeywords);

    return this.blacklistedKeywords.some(keyword => {
      const cleanKeyword = keyword.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[.,\-_ ]/g, '').trim();
      return normalizedText.includes(cleanKeyword);
    });
  }
}
