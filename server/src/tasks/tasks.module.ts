import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Post, PostSchema } from "../posts/schemas/post.schema";
import { TasksService } from "./tasks.service";

@Module({
  imports: [MongooseModule.forFeature([{ name: Post.name, schema: PostSchema }])],
  providers: [TasksService],
})
export class TasksModule {}

