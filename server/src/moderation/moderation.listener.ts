import { Injectable, Logger } from "@nestjs/common";
import { OnEvent, EventEmitter2 } from "@nestjs/event-emitter";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { KeywordService } from "../keyword/keyword.service";
import { Post, PostDocument } from "../posts/schemas/post.schema";
import { UsersService } from "../users/users.service";

const DUPLICATE_SIMILARITY_THRESHOLD = 0.85;

type ItemCreatedEvent = {
  itemId: string | Types.ObjectId;
};

@Injectable()
export class ModerationListener {
  private readonly logger = new Logger(ModerationListener.name);

  constructor(
    @InjectModel(Post.name) private readonly postModel: Model<PostDocument>,
    private readonly usersService: UsersService,
    private readonly keywordService: KeywordService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent("item.created")
  async handleItemCreated(payload: ItemCreatedEvent) {
    const itemId = payload?.itemId?.toString?.() ?? String(payload?.itemId ?? "");
    if (!itemId) return;

    const post = await this.postModel.findById(itemId).exec();
    if (!post) return;

    // Only auto-moderate system-pending posts to avoid overriding admin decisions.
    if ((post as any).status !== "PENDING_SYSTEM") return;

    const userId = (post.created_by_user_id as Types.ObjectId)?.toString?.() ?? "";

    const title = this.normalize(post.title);
    const description = this.normalize(post.description || "");
    const fullText = [title, description].filter(Boolean).join(" ").trim();

    // Pipeline checks
    const reasons: string[] = [];

    // 1) Keyword blacklist check
    if (this.keywordService.checkProfanity(title)) reasons.push("blacklist:title");
    if (this.keywordService.checkProfanity(description))
      reasons.push("blacklist:description");

    // 2) Regex checks (identity/financial/security/phishing)
    const identityRe = /(?<!\d)(?:\d{9}|\d{12})(?!\d)/g;
    const financialRe = /(?<!\d)\d{8,16}(?!\d)/g;
    const securityRe = /\b(?:pin|cvv)[:\s\-.]*\d{3,6}\b/gi;
    const phishingRe =
      /\b(?:bit\.ly|tinyurl(?:\.com)?|goo\.gl|shope\.ee|tiki\.vn|lazada\.vn)\b/gi;

    if (identityRe.test(fullText)) reasons.push("regex:identity");
    if (financialRe.test(fullText)) reasons.push("regex:financial");
    if (securityRe.test(fullText)) reasons.push("regex:security");
    if (phishingRe.test(fullText)) reasons.push("regex:phishing");

    // 3) Duplicate spam check (24h, similarity)
    const isDuplicate = await this.isDuplicateInLast24h(userId, itemId, fullText);

    // 4) User status check (BANNED)
    const user = userId ? await this.usersService.findById(userId) : null;
    const isBanned = !!user && (user as any).status === "BANNED";

    // Decision gateway
    let nextStatus: Post["status"] = "APPROVED";
    let rejectReason: string | null = null;
    let approvedAt: Date | null = new Date();

    if (isBanned) {
      nextStatus = "REJECTED";
      rejectReason = "Tài khoản đang bị khóa (BANNED)";
      approvedAt = null;
    } else if (isDuplicate) {
      nextStatus = "REJECTED";
      rejectReason = "Bài đăng trùng lặp (spam) trong 24h";
      approvedAt = null;
    } else if (reasons.length > 0) {
      nextStatus = "PENDING_ADMIN";
      rejectReason = null;
      approvedAt = null;
    }

    await this.postModel
      .findByIdAndUpdate(itemId, {
        $set: {
          status: nextStatus,
          reject_reason: rejectReason,
          approved_at: approvedAt,
        },
      })
      .exec();

    if (nextStatus === "PENDING_ADMIN") {
      this.eventEmitter.emit("post.flagged", {
        postId: itemId,
        userId,
        reasons,
      });
    } else if (nextStatus === "REJECTED") {
      this.eventEmitter.emit("post.rejected", {
        postId: itemId,
        userId,
        adminUserId: "SYSTEM",
        rejectReason,
      });
    }

    this.logger.log(
      `Auto-moderated post=${itemId} -> ${nextStatus}${
        reasons.length ? ` reasons=${reasons.join(",")}` : ""
      }`,
    );
  }

  private normalize(input: any): string {
    return (input || "").toString().toLowerCase().trim().replace(/\s+/g, " ");
  }

  private textSimilarity(a: string, b: string): number {
    const toWords = (s: string) =>
      new Set(s.toLowerCase().replace(/\s+/g, " ").trim().split(" ").filter(Boolean));
    const wordsA = toWords(a);
    const wordsB = toWords(b);
    if (wordsA.size === 0 && wordsB.size === 0) return 0;
    const intersection = [...wordsA].filter((w) => wordsB.has(w)).length;
    return (2 * intersection) / (wordsA.size + wordsB.size);
  }

  private async isDuplicateInLast24h(
    userId: string,
    currentPostId: string,
    fullText: string,
  ): Promise<boolean> {
    if (!userId || !fullText) return false;
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const recent = await this.postModel
      .find({
        created_by_user_id: new Types.ObjectId(userId),
        createdAt: { $gte: since },
        _id: { $ne: new Types.ObjectId(currentPostId) },
      })
      .select("title description")
      .lean<{ title: string; description?: string }[]>()
      .exec();

    for (const old of recent) {
      const oldText = `${old.title} ${old.description || ""}`.trim();
      if (this.textSimilarity(fullText, oldText) >= DUPLICATE_SIMILARITY_THRESHOLD) {
        return true;
      }
    }
    return false;
  }
}

