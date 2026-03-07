import {
  Module,
  NestModule,
  MiddlewareConsumer,
  RequestMethod,
} from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Post, PostSchema } from "./schemas/post.schema";
import { PostsService } from "./posts.service";
import { PostsController } from "./posts.controller";
import { AutoModerationMiddleware } from "./middlewares/auto-moderation.middleware";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Post.name, schema: PostSchema }]),
  ],
  controllers: [PostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AutoModerationMiddleware)
      .forRoutes({ path: "items", method: RequestMethod.POST });
  }
}
