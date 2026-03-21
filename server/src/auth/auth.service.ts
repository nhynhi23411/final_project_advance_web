import {
  Injectable,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { UsersService } from "../users/users.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
// Dùng require để tránh lỗi type khai báo bcryptjs
// (TypeScript sẽ xem bcrypt là kiểu any, đủ dùng cho project này)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const bcrypt = require("bcryptjs");
import { JwtService } from "@nestjs/jwt";
import { User } from "../users/schemas/user.schema";
import { MailService } from "../mail/mail.service";
import { createHash, randomBytes } from "crypto";

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly config: ConfigService,
  ) { }

  private buildUserResponse(user: User, accessToken: string) {
    return {
      message: "OK",
      accessToken,
      user: {
        id: (user as any)._id,
        username: user.username,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
      },
    };
  }

  async register(dto: RegisterDto) {
    const existingEmail = await this.usersService.findByEmail(dto.email);
    if (existingEmail) {
      throw new ConflictException("Email đã được sử dụng");
    }

    const existingUsername = await this.usersService.findByUsername(
      dto.username,
    );
    if (existingUsername) {
      throw new ConflictException("Username đã được sử dụng");
    }

    const existingPhone = await this.usersService.findByPhone(dto.phone);
    if (existingPhone) {
      throw new ConflictException("Số điện thoại đã được sử dụng");
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

    const payload = {
      sub: (user as any)._id.toString(),
      email: user.email,
      username: user.username,
      role: user.role,
    };
    const token = await this.jwtService.signAsync(payload);

    return this.buildUserResponse(user, token);
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException("Email hoặc mật khẩu không đúng");
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException("Email hoặc mật khẩu không đúng");
    }

    if (user.status === "BANNED") {
      throw new ForbiddenException("Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.");
    }

    const payload = {
      sub: (user as any)._id.toString(),
      email: user.email,
      username: user.username,
      role: user.role,
    };
    const token = await this.jwtService.signAsync(payload);

    return this.buildUserResponse(user, token);
  }

  async forgotPassword(email: string) {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const user = await this.usersService.findByEmail(normalizedEmail);
    const genericMessage =
      "Nếu email tồn tại trong hệ thống, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.";

    if (!user) return { message: genericMessage };

    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const expiresMinutes = Number(
      this.config.get<string>("RESET_PASSWORD_EXPIRES_MINUTES") || 20,
    );
    const expiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000);

    await this.usersService.setPasswordResetToken(
      (user as any)._id.toString(),
      tokenHash,
      expiresAt,
    );

    const baseUrl =
      user.role === "ADMIN"
        ? this.config.get<string>("ADMIN_RESET_PASSWORD_URL") ||
          "http://localhost:4200/reset-password"
        : this.config.get<string>("CLIENT_RESET_PASSWORD_URL") ||
          "http://localhost:4201/auth/reset-password";
    const separator = baseUrl.includes("?") ? "&" : "?";
    const resetUrl = `${baseUrl}${separator}token=${encodeURIComponent(rawToken)}`;

    await this.mailService.sendPasswordResetEmail({
      to: user.email,
      receiverName: user.name,
      resetUrl,
      expiresMinutes,
    });

    return { message: genericMessage };
  }

  async resetPassword(token: string, newPassword: string) {
    const raw = String(token || "").trim();
    if (!raw) throw new BadRequestException("Token đặt lại mật khẩu không hợp lệ");

    const tokenHash = createHash("sha256").update(raw).digest("hex");
    const user = await this.usersService.findByPasswordResetTokenHash(tokenHash);
    if (!user) {
      throw new BadRequestException("Token đã hết hạn hoặc không hợp lệ");
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.usersService.updatePassword((user as any)._id.toString(), hashedPassword);
    return { message: "Đặt lại mật khẩu thành công" };
  }
}
