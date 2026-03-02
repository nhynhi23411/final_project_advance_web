import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { BaseCrudService } from "../common/base-crud.service";
import { Post, PostDocument } from "./schemas/post.schema";
import { CreatePostDto } from "./dto/create-post.dto";
import { UpdatePostDto } from "./dto/update-post.dto";

@Injectable()
export class PostsService extends BaseCrudService<
  PostDocument,
  CreatePostDto & { created_by_user_id: string; images?: string[]; image_public_ids?: string[] },
  UpdatePostDto
> {
  constructor(
    @InjectModel(Post.name) protected override readonly model: Model<PostDocument>
  ) {
    super(model);
  }

  async createPostWithUser(dto: CreatePostDto, userId: string, manualStatus?: string): Promise<PostDocument> {
    const payload = {
      ...dto,
      created_by_user_id: new Types.ObjectId(userId),
      images: dto.images ?? [],
      image_public_ids: dto.image_public_ids ?? [],
      status: manualStatus || dto.status || "PENDING_APPROVAL",
    };
    
    const created = new this.model(payload);
    return created.save() as Promise<PostDocument>;
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
