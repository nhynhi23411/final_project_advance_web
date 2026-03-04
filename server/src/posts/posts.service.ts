import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { BaseCrudService } from "../common/base-crud.service";
import { Post, PostDocument } from "./schemas/post.schema";
import { CreatePostDto } from "./dto/create-post.dto";
import { UpdatePostDto } from "./dto/update-post.dto";
import { KeywordService } from "../keyword/keyword.service";
import { BadRequestException } from "@nestjs/common";

@Injectable()
export class PostsService extends BaseCrudService<
  PostDocument,
  CreatePostDto & { created_by_user_id: string; images?: string[]; image_public_ids?: string[] },
  UpdatePostDto
> {
  constructor(
    @InjectModel(Post.name) protected override readonly model: Model<PostDocument>,
    private readonly keywordService: KeywordService,
    private readonly eventEmitter: EventEmitter2
  ) {
    super(model);
  }

  async createPostWithUser(dto: CreatePostDto, userId: string, manualStatus?: string): Promise<PostDocument> {
    console.log('DỮ LIỆU NHẬN ĐƯỢC:', dto.title, dto.description);
    const hasProfanity = this.keywordService.checkProfanity(dto.title) ||
      this.keywordService.checkProfanity(dto.description || '');
    if (hasProfanity) {
      console.log('PHÁT HIỆN TỪ CẤM - CHUẨN BỊ THROW LỖI');
      throw new BadRequestException('Nội dung vi phạm chính sách!');
    }

    let locationData = dto.location;
    // Format location to GeoJSON Point if lat and lng exist
    if (locationData && typeof locationData.lat === "number" && typeof locationData.lng === "number") {
      locationData = {
        type: "Point",
        coordinates: [locationData.lng, locationData.lat],
        address: locationData.address || ""
      };
    }

    const payload = {
      ...dto,
      location: locationData,
      created_by_user_id: new Types.ObjectId(userId),
      images: dto.images ?? [],
      image_public_ids: dto.image_public_ids ?? [],
      status: "PENDING_SYSTEM",
    };

    const created = new this.model(payload);
    const saved = await created.save() as PostDocument;
    this.eventEmitter.emit('item.created', { itemId: saved._id });
    return saved;
  }

  async findAllByFilter(query: {
    type?: string;
    category?: string;
    location?: string;
    status?: string;
  }): Promise<PostDocument[]> {
    const filter: Record<string, unknown> = {};
    if (query.type) filter.post_type = query.type as "LOST" | "FOUND";
    if (query.category) filter.category = new RegExp(query.category, "i");
    if (query.status) filter.status = query.status as Post["status"];
    return this.findAll(filter);
  }

  async findByUser(userId: string): Promise<PostDocument[]> {
    return this.model
      .find({ created_by_user_id: userId })
      .sort({ createdAt: -1 })
      .exec();
  }
}
