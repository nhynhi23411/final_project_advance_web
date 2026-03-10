import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Post, PostDocument } from "../posts/schemas/post.schema";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { MatchesService } from "../matches/matches.service";

type PostLean = Pick<Post, "category" | "post_type" | "location" | "status"> & {
  _id: Types.ObjectId;
  createdAt?: Date;
};

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectModel(Post.name) private readonly postModel: Model<PostDocument>,
    private readonly cloudinary: CloudinaryService,
    private readonly matchesService: MatchesService,
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

  @Cron("*/5 * * * *")
  async suggestMatches() {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [lost, found] = await Promise.all([
      this.postModel
        .find({ status: "APPROVED", post_type: "LOST", createdAt: { $gte: since } })
        .select("_id category location")
        .lean<PostLean[]>()
        .exec(),
      this.postModel
        .find({ status: "APPROVED", post_type: "FOUND", createdAt: { $gte: since } })
        .select("_id category location")
        .lean<PostLean[]>()
        .exec(),
    ]);

    if (lost.length === 0 || found.length === 0) return;

    let createdCount = 0;
    for (const l of lost) {
      const lLoc = this.getLatLng(l.location);
      if (!lLoc) continue;

      for (const f of found) {
        if (String(l.category || "").toLowerCase() !== String(f.category || "").toLowerCase()) {
          continue;
        }

        const fLoc = this.getLatLng(f.location);
        if (!fLoc) continue;

        const d = this.haversineKm(lLoc.lat, lLoc.lng, fLoc.lat, fLoc.lng);
        if (d > 5) continue;

        const score = this.score(d);
        const created = await this.matchesService.upsertMatch({
          lostPostId: l._id.toString(),
          foundPostId: f._id.toString(),
          score,
          distanceKm: Number(d.toFixed(3)),
        });
        if (created) createdCount++;
      }
    }

    if (createdCount > 0) {
      this.logger.log(`SuggestMatches created ${createdCount} matches`);
    }
  }

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

  private score(distanceKm: number): number {
    const s = Math.max(0, 1 - distanceKm / 5);
    return Number((0.7 + 0.3 * s).toFixed(3));
  }
}

