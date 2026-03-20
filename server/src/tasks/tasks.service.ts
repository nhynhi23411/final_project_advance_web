import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { OnEvent } from "@nestjs/event-emitter";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Post, PostDocument } from "../posts/schemas/post.schema";
import { Claim, ClaimDocument } from "../claims/schemas/claim.schema";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { MatchesService } from "../matches/matches.service";
import { AdminKeywordService } from "../keyword/admin-keyword.service";

type PostLean = Pick<Post, "category" | "post_type" | "location" | "status"> & {
  _id: Types.ObjectId;
  title?: string;
  description?: string;
  metadata?: Record<string, any>;
  createdAt?: Date;
};

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  /**
   * Prevent concurrent re-scoring runs (cron vs admin "immediate" update).
   */
  private suggestMatchesRun: Promise<void> | null = null;

  constructor(
    @InjectModel(Post.name) private readonly postModel: Model<PostDocument>,
    @InjectModel(Claim.name) private readonly claimModel: Model<ClaimDocument>,
    private readonly cloudinary: CloudinaryService,
    private readonly matchesService: MatchesService,
    private readonly adminKeywordService: AdminKeywordService,
  ) {}

  @Cron("0 0 * * *")
  async cleanupOldPosts() {
    const now = Date.now();
    const approvedCutoff = new Date(now - 60 * 24 * 60 * 60 * 1000);
    const needsUpdateCutoff = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const approvedOld = await this.postModel
      .find({ status: "APPROVED", createdAt: { $lt: approvedCutoff } })
      .select("_id image_public_ids")
      .lean<{ _id: Types.ObjectId; image_public_ids?: string[] }[]>()
      .exec();

    const needsUpdateOld = await this.postModel
      .find({ status: "NEEDS_UPDATE", createdAt: { $lt: needsUpdateCutoff } })
      .select("_id image_public_ids")
      .lean<{ _id: Types.ObjectId; image_public_ids?: string[] }[]>()
      .exec();

    const all = [...approvedOld, ...needsUpdateOld];
    if (all.length === 0) return;

    for (const p of all) {
      const ids = Array.isArray(p.image_public_ids) ? p.image_public_ids : [];
      for (const pid of ids) {
        await this.cloudinary.deleteByPublicId(pid).catch(() => {});
      }
      await this.postModel.deleteOne({ _id: p._id }).exec();
    }

    this.logger.log(`Cleanup removed ${all.length} posts`);
  }

  // ─── Event-driven trigger: fires for each newly-approved post ───────────────

  @OnEvent("post.approved")
  async handlePostApproved(payload: { postId: string }): Promise<void> {
    const { postId } = payload;
    const newPost = await this.postModel
      .findById(postId)
      .select("_id post_type category location title description metadata createdAt")
      .lean<PostLean>()
      .exec();

    if (!newPost || newPost.status !== "APPROVED") return;

    const oppositeType = newPost.post_type === "LOST" ? "FOUND" : "LOST";
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90-day window

    // Find all available (not locked / returned) opposite posts
    const lockedPostIds = await this.getLockedPostIds();
    const candidates = await this.postModel
      .find({
        status: "APPROVED",
        post_type: oppositeType,
        createdAt: { $gte: since },
        _id: { $nin: lockedPostIds },
      })
      .select("_id category location title description metadata createdAt")
      .lean<PostLean[]>()
      .exec();

    if (candidates.length === 0) return;

    const isNewLost = newPost.post_type === "LOST";
    let matchCount = 0;
    for (const candidate of candidates) {
      const lPost = isNewLost ? newPost : candidate;
      const fPost = isNewLost ? candidate : newPost;
      const score = this.computeScore(lPost, fPost);
      if (score === null) continue;
      const created = await this.matchesService.upsertMatch({
        lostPostId: lPost._id.toString(),
        foundPostId: fPost._id.toString(),
        score: score.composite,
        distanceKm: score.distKm,
        textScore: score.textScore,
        source: "auto",
      });
      if (created) matchCount++;
    }

    if (matchCount > 0) {
      this.logger.log(
        `post.approved trigger: post=${postId} created ${matchCount} new matches`,
      );
    }
  }

  // ─── Periodic cron: re-scores all active posts every 5 minutes ───────────────

  @Cron("*/5 * * * *")
  async suggestMatches() {
    await this.suggestMatchesNow();
  }

  /**
   * Re-score match_suggestions immediately.
   * Used by admin config changes; protected against concurrent runs.
   */
  async suggestMatchesNow(): Promise<void> {
    if (this.suggestMatchesRun) return this.suggestMatchesRun;

    this.suggestMatchesRun = (async () => {
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90-day window

    // Post-integrity check: exclude locked/returned posts
    const lockedPostIds = await this.getLockedPostIds();

    const [lost, found] = await Promise.all([
      this.postModel
        .find({ status: "APPROVED", post_type: "LOST", createdAt: { $gte: since }, _id: { $nin: lockedPostIds } })
        .select("_id category location title description metadata createdAt")
        .lean<PostLean[]>()
        .exec(),
      this.postModel
        .find({ status: "APPROVED", post_type: "FOUND", createdAt: { $gte: since }, _id: { $nin: lockedPostIds } })
        .select("_id category location title description metadata createdAt")
        .lean<PostLean[]>()
        .exec(),
    ]);

    if (lost.length === 0 || found.length === 0) return;

    // Dismiss stale auto suggestions so weights update is reflected immediately.
    await this.matchesService.dismissAutoMatchesForCandidates(
      lost.map((p) => p._id),
      found.map((p) => p._id),
    );

    let createdCount = 0;
    const batchUpserts: Parameters<MatchesService["upsertMatch"]>[0][] = [];

    for (const l of lost) {
      for (const f of found) {
        const score = this.computeScore(l, f);
        if (score === null) continue;
        batchUpserts.push({
          lostPostId: l._id.toString(),
          foundPostId: f._id.toString(),
          score: score.composite,
          distanceKm: score.distKm,
          textScore: score.textScore,
          source: "auto",
        });
      }
    }

    // Write all matches (sequential to respect MongoDB upsert semantics)
    for (const payload of batchUpserts) {
      const created = await this.matchesService.upsertMatch(payload);
      if (created) createdCount++;
    }

    if (createdCount > 0) {
      this.logger.log(`SuggestMatches created ${createdCount} matches`);
    }
    })();

    try {
      await this.suggestMatchesRun;
    } finally {
      this.suggestMatchesRun = null;
    }
  }

  // ─── Core scoring engine ─────────────────────────────────────────────────────

  /**
   * Compute composite match score for a (LOST, FOUND) pair.
   * Returns null when the pair should be skipped (score below threshold).
   *
   * Composite uses dynamic Algorithm Weights loaded from DB.
   */
  private computeScore(
    l: PostLean,
    f: PostLean,
  ): { composite: number; textScore: number; distKm: number | null } | null {
    const MIN_SCORE = 0.62;

    // --- Category (0.20) ---
    const catA = String(l.category || "").toLowerCase().trim();
    const catB = String(f.category || "").toLowerCase().trim();
    const catScore = this.categoryScore(catA, catB);

    const knownDiff =
      catScore <= 0.15 &&
      !this.isGenericCategory(catA) &&
      !this.isGenericCategory(catB);
    if (knownDiff) return null;

    // --- Text (0.35) ---
    const lText = this.buildTextCorpus(l.title, l.description);
    const fText = this.buildTextCorpus(f.title, f.description);
    const dice = this.diceCoefficient(lText, fText);
    const cosine = this.cosineSimilarity(lText, fText);
    const textScore = Number(((dice + cosine) / 2).toFixed(4));

    if (textScore < 0.15 && catScore < 0.5) return null;

    // --- Location (0.25) ---
    const lLoc = this.getLatLng(l.location);
    const lLocValid = lLoc ? this.isValidCoord(lLoc.lat, lLoc.lng) : false;
    const fLoc = this.getLatLng(f.location);
    const fLocValid = fLoc ? this.isValidCoord(fLoc.lat, fLoc.lng) : false;
    let distScore = 0.5;
    let distKm: number | null = null;

    if (lLocValid && fLocValid) {
      const d = this.haversineKm(lLoc!.lat, lLoc!.lng, fLoc!.lat, fLoc!.lng);
      distScore = Math.max(0, 1 - d / 10);
      distKm = d <= 50 ? Number(d.toFixed(3)) : null;
    } else if (lLocValid || fLocValid) {
      distScore = 0.35;
    }

    // --- Time proximity (0.10) ---
    const timeScore = this.timeScore(
      l.metadata?.lost_found_date,
      f.metadata?.lost_found_date,
      l.createdAt,
      f.createdAt,
    );

    // --- Attributes: color + brand + distinctive_marks (0.10) ---
    const attrScore = this.attributeScore(l.metadata, f.metadata);

    // --- Composite ---
    const w = this.adminKeywordService.getAlgorithmWeights();
    const composite = Number(
      (w.category * catScore +
        w.text * textScore +
        w.location * distScore +
        w.time * timeScore +
        w.attributes * attrScore).toFixed(4),
    );

    if (composite < MIN_SCORE) return null;
    return { composite, textScore, distKm };
  }

  /**
   * Time proximity score (0–1).
   * Uses `lost_found_date` from metadata if available, else falls back to `createdAt`.
   * Score = 1 when same day, decreases linearly to 0 at 30+ days apart.
   */
  private timeScore(
    lDate: any,
    fDate: any,
    lCreated?: Date,
    fCreated?: Date,
  ): number {
    const parse = (d: any, fallback?: Date): Date | null => {
      if (d) {
        const dt = new Date(d);
        if (!isNaN(dt.getTime())) return dt;
      }
      return fallback ?? null;
    };
    const dL = parse(lDate, lCreated);
    const dF = parse(fDate, fCreated);
    if (!dL || !dF) return 0.5; // neutral when unknown
    const diffDays = Math.abs(dL.getTime() - dF.getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(0, 1 - diffDays / 30);
  }

  /**
   * Attribute score based on color, brand, distinctive_marks.
   * Exact token match on any field → positive signal.
   */
  private attributeScore(
    lMeta: Record<string, any> | undefined,
    fMeta: Record<string, any> | undefined,
  ): number {
    if (!lMeta || !fMeta) return 0.5; // neutral when missing
    let matched = 0;
    let total = 0;

    const compare = (a: any, b: any): number => {
      const sA = String(a || "").toLowerCase().trim();
      const sB = String(b || "").toLowerCase().trim();
      if (!sA || !sB) return 0.5; // neutral
      if (sA === sB) return 1.0;
      // partial token overlap
      const tokensA = new Set(sA.split(/\s+/));
      const tokensB = new Set(sB.split(/\s+/));
      const inter = [...tokensA].filter((t) => tokensB.has(t)).length;
      const union = new Set([...tokensA, ...tokensB]).size;
      return union === 0 ? 0.5 : inter / union;
    };

    // Color
    if (lMeta.color || fMeta.color) {
      total++;
      matched += compare(lMeta.color, fMeta.color);
    }
    // Brand
    if (lMeta.brand || fMeta.brand) {
      total++;
      matched += compare(lMeta.brand, fMeta.brand);
    }
    // Distinctive marks — use text similarity on the free-text field
    if (lMeta.distinctive_marks || fMeta.distinctive_marks) {
      total++;
      const dmA = this.buildTextCorpus(lMeta.distinctive_marks);
      const dmB = this.buildTextCorpus(fMeta.distinctive_marks);
      matched += this.cosineSimilarity(dmA, dmB) > 0 ? this.cosineSimilarity(dmA, dmB) : 0.5;
    }

    return total === 0 ? 0.5 : matched / total;
  }

  /**
   * Get IDs of posts that are currently unavailable:
   * - status = RETURNED
   * - have at least one non-rejected/cancelled active Claim
   */
  private async getLockedPostIds(): Promise<Types.ObjectId[]> {
    const [returnedIds, activeClaims] = await Promise.all([
      this.postModel
        .find({ status: "RETURNED" })
        .distinct("_id")
        .exec() as Promise<Types.ObjectId[]>,
      this.claimModel
        .find({ status: { $in: ["PENDING", "UNDER_VERIFICATION", "SUCCESSFUL"] } })
        .distinct("target_post_id")
        .exec() as Promise<Types.ObjectId[]>,
    ]);
    const seen = new Set<string>();
    const result: Types.ObjectId[] = [];
    for (const id of [...returnedIds, ...activeClaims]) {
      const s = id.toString();
      if (!seen.has(s)) { seen.add(s); result.push(id); }
    }
    return result;
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  /** Vietnamese stop words to exclude from text similarity computation. */
  private static readonly VI_STOP = new Set([
    "của", "và", "là", "trong", "có", "với", "được", "không", "cho", "này",
    "đã", "một", "các", "tôi", "bạn", "từ", "khi", "bị", "tại", "hay",
    "những", "nhiều", "còn", "thì", "mà", "vì", "nên", "đến", "lên", "xuống",
    "ra", "vào", "như", "cũng", "rất", "đây", "đó", "kia", "hơn", "nhất",
    "thế", "đi", "lại", "về", "trên", "dưới", "sau", "trước", "giữa", "qua",
    "the", "a", "an", "is", "in", "on", "at", "of", "to", "for", "and",
  ]);

  /** Generic / "Other" category values — match is a weak signal. */
  private isGenericCategory(cat: string): boolean {
    return ["khác", "other", "khac", ""].includes(cat);
  }

  /**
   * Category similarity score.
   * - Exact known-category match → 1.0
   * - "Khác" vs "Khác" → 0.45 (both unknown, weak signal)
   * - Partial/substring match → 0.6
   * - Completely different → 0.15
   */
  private categoryScore(catA: string, catB: string): number {
    if (!catA || !catB) return 0.2;
    if (catA === catB) {
      return this.isGenericCategory(catA) ? 0.45 : 1.0;
    }
    if (catA.includes(catB) || catB.includes(catA)) return 0.6;
    return 0.15;
  }

  /** Returns true when coordinates are a real location (not 0,0 / null). */
  private isValidCoord(lat: number, lng: number): boolean {
    return Math.abs(lat) > 0.001 || Math.abs(lng) > 0.001;
  }

  /** Normalise & concatenate title + description, filtering stop words. */
  private buildTextCorpus(title?: string, description?: string): string {
    const normalize = (s: string) =>
      s
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .split(/\s+/)
        .filter((w) => w.length > 1 && !TasksService.VI_STOP.has(w))
        .join(" ");
    return `${normalize(title || "")} ${normalize(description || "")}`.trim();
  }

  /** Dice coefficient on character bigrams: 2|A∩B| / (|A|+|B|). */
  private diceCoefficient(a: string, b: string): number {
    if (!a || !b) return 0;
    const bigrams = (s: string): Map<string, number> => {
      const m = new Map<string, number>();
      for (let i = 0; i < s.length - 1; i++) {
        const bg = s.slice(i, i + 2);
        m.set(bg, (m.get(bg) ?? 0) + 1);
      }
      return m;
    };
    const bgA = bigrams(a);
    const bgB = bigrams(b);
    let intersection = 0;
    for (const [bg, countA] of bgA) {
      const countB = bgB.get(bg) ?? 0;
      intersection += Math.min(countA, countB);
    }
    const total = (a.length - 1) + (b.length - 1);
    return total === 0 ? 0 : (2 * intersection) / total;
  }

  /** Cosine similarity on word-level bag-of-words. */
  private cosineSimilarity(a: string, b: string): number {
    if (!a || !b) return 0;
    const tokenize = (s: string): Map<string, number> => {
      const m = new Map<string, number>();
      for (const w of s.split(" ").filter(Boolean)) {
        m.set(w, (m.get(w) ?? 0) + 1);
      }
      return m;
    };
    const vecA = tokenize(a);
    const vecB = tokenize(b);
    let dot = 0;
    for (const [w, cA] of vecA) {
      dot += cA * (vecB.get(w) ?? 0);
    }
    const magA = Math.sqrt([...vecA.values()].reduce((s, v) => s + v * v, 0));
    const magB = Math.sqrt([...vecB.values()].reduce((s, v) => s + v * v, 0));
    return magA === 0 || magB === 0 ? 0 : dot / (magA * magB);
  }

  // ─── Location helpers ────────────────────────────────────────────────────────

  private getLatLng(location: any): { lat: number; lng: number } | null {
    const coords = location?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) return null;
    const lng = Number(coords[0]);
    const lat = Number(coords[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  }

  private haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRad = (x: number) => (x * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }
}

