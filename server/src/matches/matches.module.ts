import { Global, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Match, MatchSchema } from "./schemas/match.schema";
import { Post, PostSchema } from "../posts/schemas/post.schema";
import { MatchesService } from "./matches.service";
import { MatchesController } from "./matches.controller";

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Match.name, schema: MatchSchema },
      { name: Post.name, schema: PostSchema },
    ]),
  ],
  controllers: [MatchesController],
  providers: [MatchesService],
  exports: [MatchesService],
})
export class MatchesModule {}

