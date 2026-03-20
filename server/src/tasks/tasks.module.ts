import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Post, PostSchema } from "../posts/schemas/post.schema";
import { Claim, ClaimSchema } from "../claims/schemas/claim.schema";
import { MatchesModule } from "../matches/matches.module";
import { TasksService } from "./tasks.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Post.name, schema: PostSchema },
      { name: Claim.name, schema: ClaimSchema },
    ]),
    MatchesModule,
  ],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}

