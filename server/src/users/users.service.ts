import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { User, UserDocument } from "./schemas/user.schema";

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.userModel.findOne({ username }).exec();
  }

  async findByPhone(phone: string): Promise<User | null> {
    return this.userModel.findOne({ phone }).exec();
  }

  async findById(id: string): Promise<User | null> {
    return this.userModel.findById(id).exec();
  }

  /** Lấy danh sách user có role ADMIN (để gửi thông báo). */
  async findAdmins(): Promise<{ _id: string }[]> {
    const docs = await this.userModel
      .find({ role: "ADMIN" })
      .select("_id")
      .lean()
      .exec();
    return docs.map((d) => ({
      _id: String((d as any)._id ?? ""),
    }));
  }

  async create(data: Partial<User>): Promise<User> {
    const now = new Date();
    const dataWithTimestamps = {
      ...data,
      created_at: now,
      updated_at: now,
    };
    const created = new this.userModel(dataWithTimestamps);
    return await created.save();
  }

  async updateStatus(
    userId: string,
    status: "ACTIVE" | "INACTIVE" | "BANNED",
  ): Promise<void> {
    await this.userModel
      .findByIdAndUpdate(userId, { status, updated_at: new Date() })
      .exec();
  }

  async findAll(skip = 0, limit = 100): Promise<User[]> {
    return this.userModel
      .find()
      .select("-password")
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async countAll(): Promise<number> {
    return this.userModel.countDocuments().exec();
  }

  async update(
    userId: string,
    data: Partial<Pick<User, "name" | "email" | "phone" | "role">>,
  ): Promise<User | null> {
    const updated = await this.userModel
      .findByIdAndUpdate(
        userId,
        { ...data, updated_at: new Date() },
        { new: true },
      )
      .select("-password")
      .exec();
    return updated;
  }

  async delete(userId: string): Promise<boolean> {
    const result = await this.userModel.findByIdAndDelete(userId).exec();
    return !!result;
  }
}
