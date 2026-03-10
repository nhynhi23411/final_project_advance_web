import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Claim, ClaimSchema } from "./schemas/claim.schema";
import { Post, PostSchema } from "../posts/schemas/post.schema";
import { ClaimsService } from "./claims.service";
import { ClaimsController } from "./claims.controller";
import { CloudinaryModule } from "../cloudinary/cloudinary.module";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Claim.name, schema: ClaimSchema },
            { name: Post.name, schema: PostSchema },
        ]),
        CloudinaryModule,
    ],
    controllers: [ClaimsController],
    providers: [ClaimsService],
    exports: [ClaimsService],
})
export class ClaimsModule { }
