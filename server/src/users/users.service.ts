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

  /** Số user đăng ký mới theo từng tháng (dùng cho chart tăng trưởng). limitMonths = số tháng lấy (mặc định 12). */
  async getCountGroupedByMonth(limitMonths = 12): Promise<{ month: string; count: number }[]> {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - limitMonths + 1, 1);
    const result = await this.userModel
      .aggregate<{ _id: { year: number; month: number }; count: number }>([
        { $match: { created_at: { $gte: start } } },
        {
          $group: {
            _id: {
              year: { $year: "$created_at" },
              month: { $month: "$created_at" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ])
      .exec();
    const map = new Map<string, number>();
    for (let i = 0; i < limitMonths; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - limitMonths + 1 + i, 1);
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

  /** User đăng ký trong tháng (year, month 1-based). Dùng cho báo cáo hàng tháng. */
  async getCreatedInMonth(
    year: number,
    month: number,
  ): Promise<{ _id: string; name: string; email: string; created_at: Date }[]> {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);
    const docs = await this.userModel
      .find({ created_at: { $gte: start, $lte: end } })
      .select("_id name email created_at")
      .sort({ created_at: 1 })
      .lean()
      .exec();
    return docs.map((d: any) => ({
      _id: String(d._id),
      name: d.name ?? "",
      email: d.email ?? "",
      created_at: d.created_at,
    }));
  }
}
