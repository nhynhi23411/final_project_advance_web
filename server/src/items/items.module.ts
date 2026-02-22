import {
  Module,
  NestModule,
  MiddlewareConsumer,
  RequestMethod,
} from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Item, ItemSchema } from "./schemas/item.schema";
import { ItemsService } from "./items.service";
import { ItemsController } from "./items.controller";
import { AutoModerationMiddleware } from "./middlewares/auto-moderation.middleware";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Item.name, schema: ItemSchema }]),
  ],
  controllers: [ItemsController],
  providers: [ItemsService],
  exports: [ItemsService],
})
export class ItemsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AutoModerationMiddleware)
      .forRoutes({ path: "items", method: RequestMethod.POST });
  }
}
