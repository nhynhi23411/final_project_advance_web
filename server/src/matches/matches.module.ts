import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Match, MatchSchema } from "./schemas/match.schema";
import { MatchWeightConfig, MatchWeightConfigSchema } from "./schemas/match-weight-config.schema";
import { Post, PostSchema } from "../posts/schemas/post.schema";
import { MatchesService } from "./matches.service";
import { MatchScoringService } from "./match-scoring.service";
import { MatchGenerationService } from "./match-generation.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Match.name, schema: MatchSchema },
      { name: MatchWeightConfig.name, schema: MatchWeightConfigSchema },
      { name: Post.name, schema: PostSchema },
    ]),
  ],
  providers: [MatchesService, MatchScoringService, MatchGenerationService],
  exports: [MongooseModule, MatchesService, MatchScoringService, MatchGenerationService],
})
export class MatchesModule {}

