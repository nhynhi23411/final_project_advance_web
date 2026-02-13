import { Controller, Get, Request, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@Controller("me")
export class MeController {
  // GET /api/me
  @UseGuards(JwtAuthGuard)
  @Get()
  getProfile(@Request() req: any) {
    return {
      message: "Thông tin người dùng hiện tại",
      user: req.user,
    };
  }
}

