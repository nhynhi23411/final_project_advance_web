import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import * as fs from "fs";
import * as path from "path";

@Injectable()
export class AutoModerationMiddleware implements NestMiddleware {
  private blacklist: string[] = [];

  constructor() {
    try {
      const blacklistPath = path.join(__dirname, "../../common/blacklist.json");
      const raw = fs.readFileSync(blacklistPath, { encoding: "utf8" });
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.blacklist)) {
        this.blacklist = parsed.blacklist
          .map((it: any) =>
            it && it.word ? String(it.word).toLowerCase().trim() : null,
          )
          .filter(Boolean);
      }
    } catch (err) {
      this.blacklist = [];
      console.warn(
        "AutoModerationMiddleware: could not load blacklist.json",
        (err as any)?.message || err,
      );
    }
  }

  async use(req: Request, _res: Response, next: NextFunction) {
    const body = (req as any).body || {};
    const title = this.normalize(body.title);
    const description = this.normalize(body.description);
    const fullText = [title, description].filter(Boolean).join(" ").trim();

    const reasons: string[] = [];

    // KEYWORD MATCH: Sửa đổi để chỉ khớp nguyên từ (Whole Word Match)
    const matchedKeywords = this.blacklist.filter((word) => {
      if (!word) return false;
      // \b đảm bảo từ khóa đứng độc lập (không nằm trong từ khác)
      const wordRegex = new RegExp(`\\b${this.escapeRegExp(word)}\\b`, "gi");
      return wordRegex.test(fullText);
    });

    if (matchedKeywords.length) {
      reasons.push(`keyword:${matchedKeywords.join(",")}`);
    }

    // REGEX CHECKS: Giữ nguyên logic nhận diện số và link
    const identityRe = /(?<!\d)(?:\d{9}|\d{12})(?!\d)/g;
    const financialRe = /(?<!\d)\d{8,16}(?!\d)/g;
    const securityRe = /\b(?:pin|cvv)[:\s\-.]*\d{3,6}\b/gi;
    const phishingRe =
      /\b(?:bit\.ly|tinyurl(?:\.com)?|goo\.gl|shope\.ee|tiki\.vn|lazada\.vn)\b/gi;

    if (identityRe.test(fullText)) reasons.push("regex:identity");
    if (financialRe.test(fullText)) reasons.push("regex:financial");
    if (securityRe.test(fullText)) reasons.push("regex:security");
    if (phishingRe.test(fullText)) reasons.push("regex:phishing");

    // DUPLICATE CHECK
    const userId = (req as any).user?.userId || body.userId || null;
    const isDuplicate = await this.checkDuplicate(userId, title);
    if (isDuplicate) reasons.push("duplicate:recent");

    // DECISION GATEWAY
    if (reasons.length > 0) {
      body.status = "PENDING_ADMIN";
      console.log(
        "AuditLog:",
        JSON.stringify({
          action: "AUTO_MODERATION_FLAG",
          userId: userId ?? "unknown",
          reasons,
          title: body.title ?? null,
          timestamp: new Date().toISOString(),
        }),
      );
    } else {
      body.status = "APPROVED";
    }

    (req as any).body = body;
    next();
  }

  private normalize(input: any): string {
    return (input || "").toString().toLowerCase().trim().replace(/\s+/g, " ");
  }

  // Hàm hỗ trợ để xử lý các ký tự đặc biệt trong từ khóa khi đưa vào Regex
  private escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  private async checkDuplicate(_userId: any, _title: string): Promise<boolean> {
    return false;
  }
}

export default AutoModerationMiddleware;
