import { Injectable, BadRequestException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { BaseCrudService } from "../common/base-crud.service";
import { Post, PostDocument } from "./schemas/post.schema";
import { CreatePostDto } from "./dto/create-post.dto";
import { UpdatePostDto } from "./dto/update-post.dto";
import { UsersService } from "../users/users.service";

const DUPLICATE_SIMILARITY_THRESHOLD = 0.85;
type RecentPostText = Pick<Post, "title" | "description">;

@Injectable()
export class PostsService extends BaseCrudService<
  PostDocument,
  CreatePostDto & {
    created_by_user_id: string;
    images?: string[];
    image_public_ids?: string[];
  },
  UpdatePostDto
> {
  constructor(
    @InjectModel(Post.name)
    protected override readonly model: Model<PostDocument>,
    private readonly usersService: UsersService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super(model);
  }

  async createPostWithUser(
    dto: CreatePostDto,
    userId: string,
    manualStatus?: string,
  ): Promise<PostDocument> {
    const newText = `${dto.title} ${dto.description || ""}`.trim();
    const recentPosts = await this.findRecentByUser(userId, 24);
    for (const old of recentPosts) {
      const oldText = `${old.title} ${old.description || ""}`.trim();
      if (
        this.textSimilarity(newText, oldText) >= DUPLICATE_SIMILARITY_THRESHOLD
      ) {
        throw new BadRequestException(
          "Bài đăng trùng lặp (spam). Vui lòng không đăng lại nội dung tương tự.",
        );
      }
    }

    const user = await this.usersService.findById(userId);
    if (user && (user as any).status === "BANNED") {
      throw new BadRequestException(
        "Tài khoản của bạn đã bị khóa. Liên hệ quản trị viên để được hỗ trợ.",
      );
    }

    const postType = dto.post_type || dto.type;

    let locationData = dto.location;
    if (!locationData && dto.location_text) {
      locationData = {
        type: "Point",
        coordinates: [0, 0],
        address: dto.location_text,
      };
    }
    if (
      locationData &&
      typeof locationData.lat === "number" &&
      typeof locationData.lng === "number"
    ) {
      locationData = {
        type: "Point",
        coordinates: [locationData.lng, locationData.lat],
        address: locationData.address || "",
      };
    }

    const metadata: Record<string, any> = { ...(dto.metadata || {}) };
    if (dto.color) metadata.color = dto.color;
    if (dto.brand) metadata.brand = dto.brand;
    if (dto.distinctive_marks)
      metadata.distinctive_marks = dto.distinctive_marks;
    if (dto.lost_found_date) metadata.lost_found_date = dto.lost_found_date;

    const {
      type,
      location_text,
      lost_found_date,
      color,
      brand,
      distinctive_marks,
      ...rest
    } = dto as any;

    const payload = {
      ...rest,
      post_type: postType,
      location: locationData,
      metadata,
      created_by_user_id: new Types.ObjectId(userId),
      images: dto.images ?? [],
      image_public_ids: dto.image_public_ids ?? [],
      status: manualStatus || "PENDING_SYSTEM",
    };

    const created = new this.model(payload);
    const saved = (await created.save()) as PostDocument;
    this.eventEmitter.emit("item.created", { itemId: saved._id });
    return saved;
  }

  async findAllByFilter(query: {
    type?: string;
    category?: string;
    location?: string;
    status?: string;
    q?: string;
  }): Promise<PostDocument[]> {
    const filter: Record<string, unknown> = {};
    if (query.type) filter.post_type = query.type as "LOST" | "FOUND";
    if (query.category) filter.category = new RegExp(query.category, "i");
    if (query.status) filter.status = query.status as Post["status"];

    if (query.q) {
      const regex = new RegExp(this.escapeRegex(query.q), "i");
      filter.$or = [
        { title: regex },
        { description: regex },
        { category: regex },
        { "location.address": regex },
      ];
    }

    return this.findAll(filter);
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  async findByUser(userId: string): Promise<PostDocument[]> {
    return this.model
      .find({ created_by_user_id: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  private async findRecentByUser(
    userId: string,
    hoursAgo: number,
  ): Promise<RecentPostText[]> {
    const since = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
    return this.model
      .find({
        created_by_user_id: new Types.ObjectId(userId),
        createdAt: { $gte: since },
      })
      .select("title description")
      .lean<RecentPostText[]>()
      .exec();
  }

  private textSimilarity(a: string, b: string): number {
    const toWords = (s: string) =>
      new Set(
        s.toLowerCase().replace(/\s+/g, " ").trim().split(" ").filter(Boolean),
      );
    const wordsA = toWords(a);
    const wordsB = toWords(b);
    if (wordsA.size === 0 && wordsB.size === 0) return 0;
    const intersection = [...wordsA].filter((w) => wordsB.has(w)).length;
    return (2 * intersection) / (wordsA.size + wordsB.size);
  }

  /**
   * Ghi đè update để luôn đồng bộ lại metadata + images.
   * Cho phép cập nhật ảnh (images, image_public_ids) và các trường mô tả cơ bản.
   */
  override async update(id: string, dto: UpdatePostDto): Promise<PostDocument | null> {
    const existing = await this.model.findById(id).exec();
    if (!existing) return null;

    // Merge metadata cũ với metadata mới từ dto
    const metadata: Record<string, any> = { ...(existing.metadata || {}) };
    if (dto.color !== undefined) metadata.color = dto.color;
    if (dto.brand !== undefined) metadata.brand = dto.brand;
    if (dto.distinctive_marks !== undefined)
      metadata.distinctive_marks = dto.distinctive_marks;
    if (dto.lost_found_date !== undefined)
      metadata.lost_found_date = dto.lost_found_date;

    const updateDoc: any = {
      ...dto,
      metadata,
    };

    // Nếu client gửi images / image_public_ids thì cập nhật, nếu không giữ nguyên
    if (dto.images) {
      updateDoc.images = dto.images;
    }
    if ((dto as any).image_public_ids) {
      updateDoc.image_public_ids = (dto as any).image_public_ids;
    }

    return this.model
      .findByIdAndUpdate(id, updateDoc, {
        new: true,
        runValidators: true,
      })
      .exec();
  }
}
