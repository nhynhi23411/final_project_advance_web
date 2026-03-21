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
  Req,
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
import { AdminMatchesService } from "./admin-matches.service";

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
    private readonly adminMatchesService: AdminMatchesService,
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

  @Get("stats/match-rate")
  getMatchRateStats(@Query("months") months?: string) {
    const limitMonths = Math.min(
      24,
      Math.max(6, parseInt(months || "12", 10) || 12),
    );
    return this.adminPostsService.getMatchRateStats(limitMonths);
  }

  @Get("stats/moderation-workload")
  getModerationWorkload() {
    return this.adminPostsService.getModerationWorkload();
  }

  @Get("stats/platform-health")
  async getPlatformHealth() {
    const logs = await this.auditLogService.findAll({ action: "BAN_USER", limit: 10 });
    return logs.data;
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

  @Get("reports/monthly/users")
  getMonthlyUsers(
    @Query("year") year?: string,
    @Query("month") month?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const y = parseInt(year || String(new Date().getFullYear()), 10);
    const m = Math.min(12, Math.max(1, parseInt(month || String(new Date().getMonth() + 1), 10) || 1));
    const p = Math.max(1, parseInt(page || "1", 10));
    const l = Math.min(100, Math.max(1, parseInt(limit || "10", 10)));
    return this.adminPostsService.getMonthlyUsersPaginated(y, m, p, l);
  }

  @Get("reports/monthly/posts")
  getMonthlyPosts(
    @Query("year") year?: string,
    @Query("month") month?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const y = parseInt(year || String(new Date().getFullYear()), 10);
    const m = Math.min(12, Math.max(1, parseInt(month || String(new Date().getMonth() + 1), 10) || 1));
    const p = Math.max(1, parseInt(page || "1", 10));
    const l = Math.min(100, Math.max(1, parseInt(limit || "10", 10)));
    return this.adminPostsService.getMonthlyPostsPaginated(y, m, p, l);
  }

  @Get("reports/monthly/claims")
  getMonthlyClaims(
    @Query("year") year?: string,
    @Query("month") month?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const y = parseInt(year || String(new Date().getFullYear()), 10);
    const m = Math.min(12, Math.max(1, parseInt(month || String(new Date().getMonth() + 1), 10) || 1));
    const p = Math.max(1, parseInt(page || "1", 10));
    const l = Math.min(100, Math.max(1, parseInt(limit || "10", 10)));
    return this.adminPostsService.getMonthlyClaimsPaginated(y, m, p, l);
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
    @Req() req: any,
  ) {
    const existing = await this.usersService.findById(id);
    if (!existing) throw new NotFoundException("Không tìm thấy user");
    if (!["ACTIVE", "INACTIVE", "BANNED"].includes(status)) {
      throw new BadRequestException("Trạng thái không hợp lệ");
    }

    const previousStatus = (existing as any).status;
    // Admin id: lấy từ user token (guard đã gán req.user)
    const performedByUserId = req?.user?.id;

    await this.usersService.updateStatus(id, status);

    if (status === "BANNED" && previousStatus !== "BANNED") {
      await this.auditLogService.createBanLog(id, "admin_ban", performedByUserId);
    }
    if (status !== "BANNED" && previousStatus === "BANNED") {
      await this.auditLogService.createUnbanLog(id, performedByUserId);
    }
    return { message: "Cập nhật trạng thái thành công", status };
  }

  @Delete("users/:id")
  async deleteUser(@Param("id") id: string) {
    const existing = await this.usersService.findById(id);
    if (!existing) throw new NotFoundException("Không tìm thấy user");
    await this.usersService.delete(id);
    return { message: "Xóa user thành công" };
  }

  @Get("matches")
  getMatches(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("status") status?: string,
    @Query("minConfidence") minConfidence?: string,
    @Query("maxConfidence") maxConfidence?: string,
  ) {
    return this.adminMatchesService.findAllMatches({
      page,
      limit,
      status,
      minConfidence,
      maxConfidence,
    });
  }

  @Patch("matches/:id/status")
  updateMatchStatus(
    @Param("id") id: string,
    @Body("status") status: "CONFIRMED" | "REJECTED",
  ) {
    return this.adminMatchesService.updateMatchStatus(id, status);
  }
}
