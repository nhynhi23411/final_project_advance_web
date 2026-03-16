import { Body, Controller, Get, Patch, Request, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { UsersService } from "../users/users.service";
import { UpdateMeDto } from "./dto/update-me.dto";

@Controller("me")
export class MeController {
  constructor(private readonly usersService: UsersService) {}

  // GET /api/me
  @UseGuards(JwtAuthGuard)
  @Get()
  async getProfile(@Request() req: any) {
    const dbUser = await this.usersService.findById(req.user.userId);
    if (!dbUser) {
      return { message: "Thông tin người dùng hiện tại", user: req.user };
    }
    const u = dbUser as any;
    return {
      message: "Thông tin người dùng hiện tại",
      user: {
        userId: u._id?.toString(),
        username: u.username,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        status: u.status,
      },
    };
  }

  // PATCH /api/me – cập nhật hồ sơ (name, email, phone)
  @UseGuards(JwtAuthGuard)
  @Patch()
  async updateProfile(@Request() req: any, @Body() dto: UpdateMeDto) {
    const userId = req.user.userId;
    const updated = await this.usersService.update(userId, {
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
    });
    if (!updated) {
      return { message: "Không tìm thấy người dùng", user: null };
    }
    const u = updated as any;
    return {
      message: "Cập nhật hồ sơ thành công",
      user: {
        userId: u._id?.toString(),
        username: u.username,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        status: u.status,
      },
    };
  }
}

