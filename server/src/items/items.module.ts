import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Item, ItemSchema } from "./schemas/item.schema";
import { ItemsService } from "./items.service";
import { ItemsController } from "./items.controller";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Item.name, schema: ItemSchema }]),
  ],
  controllers: [ItemsController],
  providers: [ItemsService],
  exports: [ItemsService],
})
export class ItemsModule {}
