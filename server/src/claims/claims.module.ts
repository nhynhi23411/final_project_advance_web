import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Claim, ClaimSchema } from "./schemas/claim.schema";
import { Item, ItemSchema } from "../items/schemas/item.schema";
import { ClaimsService } from "./claims.service";
import { ClaimsController } from "./claims.controller";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Claim.name, schema: ClaimSchema },
            { name: Item.name, schema: ItemSchema },
        ]),
    ],
    controllers: [ClaimsController],
    providers: [ClaimsService],
    exports: [ClaimsService],
})
export class ClaimsModule { }
