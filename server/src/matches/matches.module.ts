import { Global, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Match, MatchSchema } from "./schemas/match.schema";
import { MatchesService } from "./matches.service";

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Match.name, schema: MatchSchema }]),
  ],
  providers: [MatchesService],
  exports: [MatchesService],
})
export class MatchesModule {}

