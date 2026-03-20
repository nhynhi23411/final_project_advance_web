import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Post, PostSchema } from "../posts/schemas/post.schema";
import { Claim, ClaimSchema } from "../claims/schemas/claim.schema";
import { Match, MatchSchema } from "../matches/schemas/match.schema";
import {
  MatchWeightConfig,
  MatchWeightConfigSchema,
} from "../matches/schemas/match-weight-config.schema";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { UsersModule } from "../users/users.module";
import { MatchesModule } from "../matches/matches.module";
import { AdminController } from "./admin.controller";
import { AdminPostsController } from "./admin-posts.controller";
import { AdminPostsService } from "./admin-posts.service";
import { RolesGuard } from "../auth/roles.guard";
import { AdminMatchesService } from "./admin-matches.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Post.name, schema: PostSchema },
      { name: Claim.name, schema: ClaimSchema },
      { name: Match.name, schema: MatchSchema },
      { name: MatchWeightConfig.name, schema: MatchWeightConfigSchema },
    ]),
    AuditLogModule,
    UsersModule,
    MatchesModule,
  ],
  controllers: [AdminController, AdminPostsController],
  providers: [AdminPostsService, AdminMatchesService, RolesGuard],
})
export class AdminModule {}
