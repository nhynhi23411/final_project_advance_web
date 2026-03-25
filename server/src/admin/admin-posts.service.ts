import { Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Post, PostDocument } from "../posts/schemas/post.schema";
import { Claim, ClaimDocument } from "../claims/schemas/claim.schema";
import { AuditLogService } from "../audit-log/audit-log.service";
import { UsersService } from "../users/users.service";
import { UpdatePostStatusDto } from "./dto/update-post-status.dto";
import { AdminUpdatePostDto } from "./dto/admin-update-post.dto";

/** Danh sách category chuẩn (đồng bộ với client) – dùng để chuẩn hóa pie chart. */
const STANDARD_CATEGORIES = [
  "Thiết bị điện tử",
  "Ví tiền",
  "Giấy tờ",
  "Chìa khóa",
  "Túi xách & Hành lý",
  "Trang sức & Phụ kiện",
  "Thể thao & Ngoài trời",
  "Khác",
];

@Injectable()
export class AdminPostsService {
  constructor(
    @InjectModel(Post.name) private readonly postModel: Model<PostDocument>,
    @InjectModel(Claim.name) private readonly claimModel: Model<ClaimDocument>,
    private readonly auditLogService: AuditLogService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Get posts by status. Use status=all to get all posts.
   * Optional filters: category, dateFrom, dateTo (ISO date strings).
   */
  async getPosts(
    status: string = "PENDING_ADMIN",
    filters?: { category?: string; dateFrom?: string; dateTo?: string },
  ): Promise<PostDocument[]> {
    const query: Record<string, unknown> = {};
    if (status && status.toLowerCase() !== "all") {
      query.status = status;
    }
    if (filters?.category?.trim()) {
      query.category = filters.category.trim();
    }
    if (filters?.dateFrom || filters?.dateTo) {
      query.createdAt = {};
      if (filters.dateFrom) {
        (query.createdAt as Record<string, Date>).$gte = new Date(filters.dateFrom + "T00:00:00.000Z");
      }
      if (filters.dateTo) {
        (query.createdAt as Record<string, Date>).$lte = new Date(filters.dateTo + "T23:59:59.999Z");
      }
    }
    return this.postModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async getPostById(postId: string): Promise<PostDocument> {
    const post = await this.postModel
      .findById(postId)
      .populate("created_by_user_id", "name username email phone")
      .exec();
    if (!post) throw new NotFoundException("Post not found");
    return post;
  }

  /** Admin override: update post content (title, description, category). */
  async updatePostContent(
    postId: string,
    dto: AdminUpdatePostDto,
  ): Promise<PostDocument> {
    const post = await this.postModel.findById(postId).exec();
    if (!post) throw new NotFoundException("Post not found");
    const update: Record<string, unknown> = {};
    if (dto.title !== undefined) update.title = dto.title.trim();
    if (dto.description !== undefined) update.description = dto.description;
    if (dto.category !== undefined) update.category = dto.category.trim();
    if (Object.keys(update).length === 0) return post;
    const updated = await this.postModel
      .findByIdAndUpdate(postId, { $set: update }, { new: true })
      .exec();
    if (!updated) throw new NotFoundException("Post not found");
    return updated;
  }

  /** Soft delete: set status to ARCHIVED. */
  async deletePost(postId: string): Promise<PostDocument> {
    const post = await this.postModel.findById(postId).exec();
    if (!post) throw new NotFoundException("Post not found");
    const updated = await this.postModel
      .findByIdAndUpdate(
        postId,
        {
          $set: {
            status: "ARCHIVED",
            archived_reason: "Đã xóa bởi quản trị viên",
          },
        },
        { new: true },
      )
      .exec();
    if (!updated) throw new NotFoundException("Post not found");
    return updated;
  }

  async getDashboardStats(): Promise<{
    totalUsers: number;
    activePosts: number;
    resolvedClaims: number;
    pendingAdmin: number;
    approvedLostCount: number;
    matchRate: number;
  }> {
    const [
      totalUsers,
      activePosts,
      resolvedClaims,
      pendingAdmin,
      approvedLostCount,
    ] = await Promise.all([
      this.usersService.countAll(),
      this.postModel.countDocuments({ status: "APPROVED" }).exec(),
      this.claimModel.countDocuments({ status: "SUCCESSFUL" }).exec(),
      this.postModel.countDocuments({ status: "PENDING_ADMIN" }).exec(),
      this.postModel
        .countDocuments({
          post_type: "LOST",
          status: "APPROVED",
        })
        .exec(),
    ]);
    const matchRate =
      approvedLostCount > 0 ? resolvedClaims / approvedLostCount : 0;
    return {
      totalUsers,
      activePosts,
      resolvedClaims,
      pendingAdmin,
      approvedLostCount,
      matchRate,
    };
  }

  /** Tăng trưởng User và Post theo tháng (cho line chart). limitMonths mặc định 12. */
  async getGrowthStats(limitMonths = 12): Promise<{
    labels: string[];
    users: number[];
    posts: number[];
  }> {
    const [userBuckets, postBuckets] = await Promise.all([
      this.usersService.getCountGroupedByMonth(limitMonths),
      this.getPostCountGroupedByMonth(limitMonths),
    ]);
    const labels = userBuckets.map((u) => u.month);
    const users = userBuckets.map((u) => u.count);
    const posts = labels.map(
      (label) => postBuckets.find((p) => p.month === label)?.count ?? 0,
    );
    return { labels, users, posts };
  }

  private async getPostCountGroupedByMonth(
    limitMonths: number,
  ): Promise<{ month: string; count: number }[]> {
    const now = new Date();
    const start = new Date(
      now.getFullYear(),
      now.getMonth() - limitMonths + 1,
      1,
    );
    const result = await this.postModel
      .aggregate<{ _id: { year: number; month: number }; count: number }>([
        { $match: { createdAt: { $gte: start } } },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ])
      .exec();
    const map = new Map<string, number>();
    for (let i = 0; i < limitMonths; i++) {
      const d = new Date(
        now.getFullYear(),
        now.getMonth() - limitMonths + 1 + i,
        1,
      );
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map.set(key, 0);
    }
    for (const r of result) {
      const key = `${r._id.year}-${String(r._id.month).padStart(2, "0")}`;
      map.set(key, r.count);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, count]) => ({ month, count }));
  }

  /** Lấy Tỷ lệ khớp (Match Rate) theo từng tháng (dùng cho line chart) */
  async getMatchRateStats(limitMonths = 12): Promise<{
    labels: string[];
    rates: number[];
  }> {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - limitMonths + 1, 1);
    
    // Group approved LOST posts by month (thời điểm duyệt)
    const postsResult = await this.postModel.aggregate([
      { $match: { post_type: "LOST", status: "APPROVED", approved_at: { $gte: start } } },
      { $group: { _id: { year: { $year: "$approved_at" }, month: { $month: "$approved_at" } }, count: { $sum: 1 } } }
    ]).exec();

    // Group SUCCESSFUL claims by month (thời điểm khớp thành công)
    const claimsResult = await this.claimModel.aggregate([
      { $match: { status: "SUCCESSFUL", updated_at: { $gte: start } } },
      { $group: { _id: { year: { $year: "$updated_at" }, month: { $month: "$updated_at" } }, count: { $sum: 1 } } }
    ]).exec();

    const mapPosts = new Map<string, number>();
    const mapClaims = new Map<string, number>();
    
    for (let i = 0; i < limitMonths; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - limitMonths + 1 + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      mapPosts.set(key, 0);
      mapClaims.set(key, 0);
    }
    
    for (const p of postsResult) mapPosts.set(`${p._id.year}-${String(p._id.month).padStart(2, "0")}`, p.count);
    for (const c of claimsResult) mapClaims.set(`${c._id.year}-${String(c._id.month).padStart(2, "0")}`, c.count);

    const labels: string[] = [];
    const rates: number[] = [];
    
    for (const [month, postsCount] of Array.from(mapPosts.entries()).sort((a,b) => a[0].localeCompare(b[0]))) {
      labels.push(month);
      const claimsCount = mapClaims.get(month) ?? 0;
      // Tránh chia cho 0
      rates.push(postsCount > 0 ? (claimsCount / postsCount) * 100 : 0);
    }

    return { labels, rates };
  }

  /** Lấy dữ liệu khối lượng công việc kiểm duyệt (Rejected vs Approved vs Pending) */
  async getModerationWorkload(): Promise<{ approved: number; rejected: number; pending: number; needsUpdate: number }> {
    const [approved, rejected, pending, needsUpdate] = await Promise.all([
      this.postModel.countDocuments({ status: "APPROVED" }).exec(),
      this.postModel.countDocuments({ status: "REJECTED" }).exec(),
      this.postModel.countDocuments({ status: "PENDING_ADMIN" }).exec(),
      this.postModel.countDocuments({ status: "NEEDS_UPDATE" }).exec(),
    ]);
    return { approved, rejected, pending, needsUpdate };
  }

  /** Lấy tổng số lượng bài đăng theo từng trạng thái (dành cho tab trên trang kiểm duyệt) */
  async getPostCountsByStatus(): Promise<Record<string, number>> {
    const counts = await this.postModel.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]).exec();
    
    const result: Record<string, number> = {
      all: 0,
      pending: 0,
      approved: 0,
      needs_update: 0,
      rejected: 0,
      returned: 0,
      archived: 0
    };
    
    let total = 0;
    for (const c of counts) {
      const status = c._id;
      const count = c.count;
      total += count;
      if (status === 'PENDING_ADMIN') result.pending += count;
      else if (status === 'APPROVED') result.approved += count;
      else if (status === 'NEEDS_UPDATE') result.needs_update += count;
      else if (status === 'REJECTED') result.rejected += count;
      else if (status === 'RETURNED') result.returned += count;
      else if (status === 'ARCHIVED') result.archived += count;
    }
    result.all = total;
    return result;
  }

  /** Số bài đăng đã duyệt theo category (cho pie chart). Chuẩn hóa theo danh sách client: giá trị không nằm trong danh sách gom vào "Khác". */
  async getStatsByCategory(): Promise<{ category: string; count: number }[]> {
    const result = await this.postModel
      .aggregate<{ _id: string; count: number }>([
        { $match: { status: "APPROVED" } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
      ])
      .exec();
    const map = new Map<string, number>();
    for (const cat of STANDARD_CATEGORIES) {
      map.set(cat, 0);
    }
    for (const r of result) {
      const raw = (r._id || "").trim();
      const standard =
        STANDARD_CATEGORIES.includes(raw) ? raw : "Khác";
      map.set(standard, (map.get(standard) ?? 0) + r.count);
    }
    return STANDARD_CATEGORIES.map((category) => ({
      category,
      count: map.get(category) ?? 0,
    })).filter((row) => row.count > 0);
  }

  /** Báo cáo hàng tháng: tổng hợp (summary). year, month 1-based. */
  async getMonthlyReport(
    year: number,
    month: number,
  ): Promise<{
    year: number;
    month: number;
    summary: {
      newUsersCount: number;
      newPostsCount: number;
      newClaimsCount: number;
      successfulClaimsCount: number;
      approvedPostsCount: number;
    };
  }> {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);

    const [newUsersCount, newPostsCount, newClaimsCount, successfulInMonth, approvedInMonth] =
      await Promise.all([
        this.usersService.countCreatedInMonth(year, month),
        this.postModel.countDocuments({ createdAt: { $gte: start, $lte: end } }).exec(),
        this.claimModel.countDocuments({ created_at: { $gte: start, $lte: end } }).exec(),
        this.claimModel
          .countDocuments({
            status: "SUCCESSFUL",
            updated_at: { $gte: start, $lte: end },
          })
          .exec(),
        this.postModel
          .countDocuments({
            status: "APPROVED",
            approved_at: { $gte: start, $lte: end },
          })
          .exec(),
      ]);

    return {
      year,
      month,
      summary: {
        newUsersCount,
        newPostsCount,
        newClaimsCount,
        successfulClaimsCount: successfulInMonth,
        approvedPostsCount: approvedInMonth,
      },
    };
  }

  async getMonthlyUsersPaginated(year: number, month: number, page: number = 1, limit: number = 10) {
    return this.usersService.getCreatedInMonthPaginated(year, month, page, limit);
  }

  async getMonthlyPostsPaginated(year: number, month: number, page: number = 1, limit: number = 10) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.postModel
        .find({ createdAt: { $gte: start, $lte: end } })
        .select("_id title category post_type status createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.postModel.countDocuments({ createdAt: { $gte: start, $lte: end } }).exec()
    ]);

    const data = items.map((p: any) => ({
      _id: String(p._id),
      title: p.title ?? "",
      category: p.category ?? "",
      post_type: p.post_type ?? "",
      status: p.status ?? "",
      createdAt: p.createdAt,
    }));

    return { data, total, page, limit };
  }

  async getMonthlyClaimsPaginated(year: number, month: number, page: number = 1, limit: number = 10) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.claimModel
        .find({ created_at: { $gte: start, $lte: end } })
        .select("_id status target_post_id claimant_user_id created_at")
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.claimModel.countDocuments({ created_at: { $gte: start, $lte: end } }).exec()
    ]);

    const data = items.map((c: any) => ({
      _id: String(c._id),
      status: c.status ?? "",
      target_post_id: String(c.target_post_id ?? ""),
      claimant_user_id: String(c.claimant_user_id ?? ""),
      created_at: c.created_at,
    }));

    return { data, total, page, limit };
  }

  async updatePostStatus(
    postId: string,
    dto: UpdatePostStatusDto,
    adminUserId: string,
  ): Promise<PostDocument> {
    const post = await this.postModel.findById(postId).exec();
    if (!post) throw new NotFoundException("Post not found");

    const userId = (post.created_by_user_id as Types.ObjectId).toString();

    if (dto.status === "APPROVED") {
      await this.postModel
        .findByIdAndUpdate(postId, {
          status: "APPROVED",
          approved_at: new Date(),
          approved_by_user_id: new Types.ObjectId(adminUserId),
          reject_reason: null,
        })
        .exec();
      this.eventEmitter.emit("post.approved", { postId, userId, adminUserId });
    } else if (dto.status === "NEEDS_UPDATE") {
      await this.postModel
        .findByIdAndUpdate(postId, {
          status: "NEEDS_UPDATE",
          reject_reason: dto.reject_reason ?? null,
        })
        .exec();
      this.eventEmitter.emit("post.needs_update", { postId, userId, adminUserId });
    } else if (dto.status === "REJECTED") {
      await this.auditLogService.createRejectLog(
        postId,
        userId,
        dto.reject_reason ?? "",
        adminUserId,
      );

      await this.postModel
        .findByIdAndUpdate(postId, {
          status: "REJECTED",
          reject_reason: dto.reject_reason ?? null,
        })
        .exec();

      this.eventEmitter.emit("post.rejected", { postId, userId, adminUserId });

      const appConfig = this.configService.get<{ maxRejects24h: number }>("app");
      const maxRejects = appConfig?.maxRejects24h ?? 3;
      const count = await this.auditLogService.countRejectInLast24h(userId);

      if (count >= maxRejects) {
        await this.usersService.updateStatus(userId, "BANNED");
        await this.auditLogService.createBanLog(
          userId,
          "reject_limit",
          adminUserId,
        );
        this.eventEmitter.emit("user.banned", { userId, reason: "reject_limit" });
      }
    }

    const updated = await this.postModel.findById(postId).exec();
    if (!updated) throw new NotFoundException("Post not found");
    return updated;
  }
}
