import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

// Decorator Guard dùng chung cho các route cần đăng nhập
// Ví dụ: @UseGuards(JwtAuthGuard)
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {}

