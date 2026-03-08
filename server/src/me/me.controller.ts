import { Controller, Get, Request, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { UsersService } from "../users/users.service";

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
}

