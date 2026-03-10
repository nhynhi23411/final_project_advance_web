import {
    Controller,
    Post,
    Patch,
    Get,
    Body,
    Param,
    UseGuards,
    Request,
    Query,
    UseInterceptors,
    UploadedFile,
    BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage, File } from "multer";
import { AuthGuard } from "@nestjs/passport";
import { ClaimsService } from "./claims.service";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { CreateClaimDto } from "./dto/create-claim.dto";
import { ReviewClaimDto } from "./dto/review-claim.dto";

const uploadOpts = {
    storage: memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
};

@Controller("claims")
export class ClaimsController {
    constructor(
        private readonly claimsService: ClaimsService,
        private readonly cloudinary: CloudinaryService,
    ) { }

    @Post("upload-proof")
    @UseGuards(AuthGuard("jwt"))
    @UseInterceptors(FileInterceptor("file", uploadOpts))
    async uploadProofImage(
        @UploadedFile() file: File | undefined,
    ): Promise<{ url: string; publicId: string }> {
        if (!file?.buffer) throw new BadRequestException("Chưa chọn ảnh");
        const result = await this.cloudinary.uploadBuffer(file.buffer, {
            folder: "claim-proofs",
        });
        return { url: result.secure_url, publicId: result.public_id };
    }

    @Post()
    @UseGuards(AuthGuard("jwt"))
    create(@Body() dto: CreateClaimDto, @Request() req: any) {
        return this.claimsService.create(dto, req.user.userId);
    }

    @Patch(":id/review")
    @UseGuards(AuthGuard("jwt"))
    review(
        @Param("id") id: string,
        @Body() dto: ReviewClaimDto,
        @Request() req: any,
    ) {
        return this.claimsService.review(id, dto, req.user.userId);
    }

    @Get("count/active")
    @UseGuards(AuthGuard("jwt"))
    countActive(@Request() req: any) {
        return this.claimsService.countActive(req.user.userId);
    }

    @Get("item/:id")
    @UseGuards(AuthGuard("jwt"))
    getMyClaimsForItem(@Param("id") itemId: string, @Request() req: any) {
        return this.claimsService.getMyClaimsForItem(itemId, req.user.userId);
    }

    @Get()
    @UseGuards(AuthGuard("jwt"))
    findAll(@Query("post_id") postId?: string, @Request() req?: any) {
        if (postId) return this.claimsService.findByPost(postId);
        return this.claimsService.findByUser(req.user.userId);
    }
}
