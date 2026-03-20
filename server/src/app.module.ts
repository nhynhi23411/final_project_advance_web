import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { MongooseModule } from "@nestjs/mongoose";
import { ConfigModule, ConfigService } from "@nestjs/config";
import configuration from "./config/configuration";
import { AppController } from "./app.controller";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { CloudinaryModule } from "./cloudinary/cloudinary.module";
import { PostsModule } from "./posts/posts.module";
import { ClaimsModule } from "./claims/claims.module";
import { MeController } from "./me/me.controller";
import { KeywordModule } from "./keyword/keyword.module";
import { AuditLogModule } from "./audit-log/audit-log.module";
import { AdminModule } from "./admin/admin.module";
import { MatchesModule } from "./matches/matches.module";

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    KeywordModule,
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri:
          config.get<string>("MONGO_URI") ||
          "mongodb://127.0.0.1:27017/lost_found_db",
      }),
    }),
    CloudinaryModule,
    UsersModule,
    AuthModule,
    PostsModule,
    ClaimsModule,
    MatchesModule,
    AuditLogModule,
    AdminModule,
  ],
  controllers: [AppController, MeController],
  providers: [],
})
export class AppModule { }
