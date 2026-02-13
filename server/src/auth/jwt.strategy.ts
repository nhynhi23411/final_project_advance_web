import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>("JWT_SECRET") || "CHANGE_THIS_SECRET_IN_ENV",
    });
  }

  async validate(payload: JwtPayload) {
    // Giá trị return sẽ được gắn vào request.user
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}

