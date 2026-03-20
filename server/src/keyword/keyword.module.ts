import { Global, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import {
  BlacklistedKeyword,
  BlacklistedKeywordSchema,
} from "./schemas/blacklisted-keyword.schema";
import { BlacklistedKeywordRepository } from "./blacklisted-keyword.repository";
import { KeywordService } from "./keyword.service";
import { AdminKeywordService } from "./admin-keyword.service";
import {
  AlgorithmWeights,
  AlgorithmWeightsSchema,
} from "./schemas/algorithm-weights.schema";
import { AlgorithmWeightsRepository } from "./algorithm-weights.repository";

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BlacklistedKeyword.name, schema: BlacklistedKeywordSchema },
      { name: AlgorithmWeights.name, schema: AlgorithmWeightsSchema },
    ]),
  ],
  providers: [
    BlacklistedKeywordRepository,
    AlgorithmWeightsRepository,
    KeywordService,
    AdminKeywordService,
  ],
  exports: [KeywordService, AdminKeywordService],
})
export class KeywordModule {}
