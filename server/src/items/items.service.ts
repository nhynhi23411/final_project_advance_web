import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { BaseCrudService } from "../common/base-crud.service";
import { Item, ItemDocument } from "./schemas/item.schema";
import { CreateItemDto } from "./dto/create-item.dto";
import { UpdateItemDto } from "./dto/update-item.dto";

@Injectable()
export class ItemsService extends BaseCrudService<
  ItemDocument,
  CreateItemDto & { created_by: string; images?: string[]; image_public_ids?: string[] },
  UpdateItemDto
> {
  constructor(
    @InjectModel(Item.name) protected override readonly model: Model<ItemDocument>
  ) {
    super(model);
  }

  async findAllByFilter(query: {
    type?: string;
    category?: string;
    location?: string;
    status?: string;
  }): Promise<ItemDocument[]> {
    const filter: Record<string, unknown> = {};
    if (query.type) filter.type = query.type as "LOST" | "FOUND";
    if (query.category) filter.category = new RegExp(query.category, "i");
    if (query.location) filter.location_text = new RegExp(query.location, "i");
    if (query.status) filter.status = query.status as Item["status"];
    return this.findAll(filter);
  }

  async findByUser(userId: string): Promise<ItemDocument[]> {
    return this.model
      .find({ created_by: userId })
      .sort({ createdAt: -1 })
      .exec();
  }
}
