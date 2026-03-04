import { Injectable, NestMiddleware, BadRequestException } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { KeywordService } from "../../keyword/keyword.service";

@Injectable()
export class AutoModerationMiddleware implements NestMiddleware {
  constructor(private readonly keywordService: KeywordService) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    const body = (req as any).body || {};
    const title = this.normalize(body.title);
    const description = this.normalize(body.description);
    const fullText = [title, description].filter(Boolean).join(" ").trim();

    const reasons: string[] = [];

    if (this.keywordService.checkProfanity(fullText)) {
      throw new BadRequestException("Nội dung chứa từ ngữ không phù hợp");
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

  private async checkDuplicate(_userId: any, _title: string): Promise<boolean> {
    return false;
  }
}

export default AutoModerationMiddleware;
