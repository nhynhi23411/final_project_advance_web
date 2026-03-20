import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Post, PostSchema } from "../posts/schemas/post.schema";
import { Claim, ClaimSchema } from "../claims/schemas/claim.schema";
import { Match, MatchSchema } from "../matches/schemas/match.schema";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { UsersModule } from "../users/users.module";
import { AdminController } from "./admin.controller";
import { AdminPostsController } from "./admin-posts.controller";
import { SystemConfigController } from "./system-config.controller";
import { AdminPostsService } from "./admin-posts.service";
import { AdminMatchesService } from "./admin-matches.service";
import { RolesGuard } from "../auth/roles.guard";
import { TasksModule } from "../tasks/tasks.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Post.name, schema: PostSchema },
      { name: Claim.name, schema: ClaimSchema },
      { name: Match.name, schema: MatchSchema },
    ]),
    AuditLogModule,
    UsersModule,
    TasksModule,
  ],
  controllers: [AdminController, AdminPostsController, SystemConfigController],
  providers: [AdminPostsService, AdminMatchesService, RolesGuard],
})
export class AdminModule {}
