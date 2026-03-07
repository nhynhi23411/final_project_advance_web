import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Post, PostSchema } from "../posts/schemas/post.schema";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { UsersModule } from "../users/users.module";
import { AdminPostsController } from "./admin-posts.controller";
import { AdminPostsService } from "./admin-posts.service";
import { RolesGuard } from "../auth/roles.guard";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Post.name, schema: PostSchema }]),
    AuditLogModule,
    UsersModule,
  ],
  controllers: [AdminPostsController],
  providers: [AdminPostsService, RolesGuard],
})
export class AdminModule {}
