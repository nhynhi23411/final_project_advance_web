import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { AdminPostsService } from "./admin-posts.service";
import { UsersService } from "../users/users.service";
import { AuditLogService } from "../audit-log/audit-log.service";
import { AdminCreateUserDto } from "./dto/admin-create-user.dto";
import { AdminUpdateUserDto } from "./dto/admin-update-user.dto";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const bcrypt = require("bcryptjs");

@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
export class AdminController {
  constructor(
    private readonly adminPostsService: AdminPostsService,
    private readonly usersService: UsersService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get("dashboard-stats")
  getDashboardStats() {
    return this.adminPostsService.getDashboardStats();
  }

  @Get("stats/growth")
  getGrowthStats(@Query("months") months?: string) {
    const limitMonths = Math.min(
      24,
      Math.max(6, parseInt(months || "12", 10) || 12),
    );
    return this.adminPostsService.getGrowthStats(limitMonths);
  }

  @Get("stats/by-category")
  getStatsByCategory() {
    return this.adminPostsService.getStatsByCategory();
  }

  @Get("reports/monthly")
  getMonthlyReport(
    @Query("year") year?: string,
    @Query("month") month?: string,
  ) {
    const y = parseInt(year || String(new Date().getFullYear()), 10);
    const m = Math.min(12, Math.max(1, parseInt(month || String(new Date().getMonth() + 1), 10) || 1));
    return this.adminPostsService.getMonthlyReport(y, m);
  }

  @Get("users")
  getUsers(
    @Query("skip") skip?: string,
    @Query("limit") limit?: string,
  ) {
    const skipNum = Math.max(0, parseInt(skip || "0", 10) || 0);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit || "50", 10) || 50));
    return this.usersService.findAll(skipNum, limitNum);
  }

  @Get("audit-logs")
  getAuditLogs(
    @Query("userId") userId?: string,
    @Query("skip") skip?: string,
    @Query("action") action?: string,
  ) {
    return this.auditLogService.findAll(userId, skip, action as any);
  }

  @Post("users")
  async createUser(@Body() dto: AdminCreateUserDto) {
    if (await this.usersService.findByEmail(dto.email)) {
      throw new BadRequestException("Email đã được sử dụng");
    }
    if (await this.usersService.findByUsername(dto.username)) {
      throw new BadRequestException("Username đã được sử dụng");
    }
    if (await this.usersService.findByPhone(dto.phone)) {
      throw new BadRequestException("Số điện thoại đã được sử dụng");
    }
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({
      name: dto.name,
      username: dto.username,
      email: dto.email,
      password: hashedPassword,
      phone: dto.phone,
      role: dto.role || "USER",
      status: "ACTIVE",
      warning_count: 0,
    } as any);
    const u = user as any;
    return { message: "Tạo user thành công", user: { _id: u._id, username: u.username, name: u.name, email: u.email, phone: u.phone, role: u.role, status: u.status } };
  }

  @Patch("users/:id")
  async updateUser(@Param("id") id: string, @Body() dto: AdminUpdateUserDto) {
    const existing = await this.usersService.findById(id);
    if (!existing) throw new NotFoundException("Không tìm thấy user");
    if (dto.email && dto.email !== existing.email) {
      const dup = await this.usersService.findByEmail(dto.email);
      if (dup) throw new BadRequestException("Email đã được sử dụng");
    }
    const updated = await this.usersService.update(id, {
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      role: dto.role,
    });
    return { message: "Cập nhật thành công", user: updated };
  }

  @Patch("users/:id/status")
  async updateUserStatus(
    @Param("id") id: string,
    @Body("status") status: "ACTIVE" | "INACTIVE" | "BANNED",
  ) {
    const existing = await this.usersService.findById(id);
    if (!existing) throw new NotFoundException("Không tìm thấy user");
    if (!["ACTIVE", "INACTIVE", "BANNED"].includes(status)) {
      throw new BadRequestException("Trạng thái không hợp lệ");
    }
    await this.usersService.updateStatus(id, status);
    return { message: "Cập nhật trạng thái thành công", status };
  }

  @Delete("users/:id")
  async deleteUser(@Param("id") id: string) {
    const existing = await this.usersService.findById(id);
    if (!existing) throw new NotFoundException("Không tìm thấy user");
    await this.usersService.delete(id);
    return { message: "Xóa user thành công" };
  }
}
