import { Injectable } from "@nestjs/common";
import { Model, Document } from "mongoose";

/**
 * Base CRUD service chuẩn, có thể kế thừa cho bất kỳ resource nào (Item, Claim, ...).
 * Class con: constructor(@InjectModel(Entity.name) model: Model<EntityDocument>) { super(model); }
 */
@Injectable()
export abstract class BaseCrudService<
  T extends Document,
  C = Partial<T>,
  U = Partial<C>
> {
  constructor(protected readonly model: Model<T>) {}

  async findAll(filter: Record<string, unknown> = {}): Promise<T[]> {
    return this.model.find(filter).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string): Promise<T | null> {
    return this.model.findById(id).exec();
  }

  async create(dto: C): Promise<T> {
    const created = new this.model(dto);
    return created.save() as Promise<T>;
  }

  async update(id: string, dto: U): Promise<T | null> {
    return this.model
      .findByIdAndUpdate(id, dto as Record<string, unknown>, {
        new: true,
        runValidators: true,
      })
      .exec();
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.model.findByIdAndDelete(id).exec();
    return !!result;
  }
}
