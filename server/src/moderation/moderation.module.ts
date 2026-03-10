import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Post, PostSchema } from "../posts/schemas/post.schema";
import { UsersModule } from "../users/users.module";
import { ModerationListener } from "./moderation.listener";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Post.name, schema: PostSchema }]),
    UsersModule,
  ],
  providers: [ModerationListener],
})
export class ModerationModule {}

