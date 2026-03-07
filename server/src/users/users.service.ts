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
}
