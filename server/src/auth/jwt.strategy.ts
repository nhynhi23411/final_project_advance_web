import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { UsersService } from "../users/users.service";

export interface JwtPayload {
  sub: string;
  email: string;
  username: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>("JWT_SECRET") || "CHANGE_THIS_SECRET_IN_ENV",
    });
  }

  async validate(payload: JwtPayload) {
    // Check if user is banned in DB on every authenticated request
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException("Tài khoản không tồn tại.");
    }
    if (user.status === "BANNED") {
      throw new UnauthorizedException("ACCOUNT_BANNED");
    }

    // Giá trị return sẽ được gắn vào request.user
    return {
      userId: payload.sub,
      email: payload.email,
      username: payload.username,
      role: payload.role,
    };
  }
}
