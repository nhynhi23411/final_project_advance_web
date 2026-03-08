import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { AdminPostsService } from "./admin-posts.service";
import { UsersService } from "../users/users.service";

@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
export class AdminController {
  constructor(
    private readonly adminPostsService: AdminPostsService,
    private readonly usersService: UsersService,
  ) {}

  @Get("dashboard-stats")
  getDashboardStats() {
    return this.adminPostsService.getDashboardStats();
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
}
