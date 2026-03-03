import {
    Injectable,
    BadRequestException,
    ForbiddenException,
    NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Claim, ClaimDocument } from "./schemas/claim.schema";
import { CreateClaimDto } from "./dto/create-claim.dto";
import { ReviewClaimDto } from "./dto/review-claim.dto";
import { Post, PostDocument } from "../posts/schemas/post.schema";
import { KeywordService } from "../keyword/keyword.service";

@Injectable()
export class ClaimsService {
    constructor(
        @InjectModel(Claim.name) private claimModel: Model<ClaimDocument>,
        @InjectModel(Post.name) private postModel: Model<PostDocument>,
        private readonly keywordService: KeywordService,
    ) { }

    async create(dto: CreateClaimDto, claimerId: string) {
        const post = await this.postModel.findById(dto.post_id);
        if (!post) throw new NotFoundException("Post không tồn tại");
        if (post.status !== "APPROVED") {
            throw new BadRequestException(
                "Chỉ được claim post đã được duyệt (APPROVED)",
            );
        }

        if (dto.message && this.keywordService.checkProfanity(dto.message)) {
            throw new BadRequestException("Lời nhắn chứa từ ngữ không phù hợp!");
        }

        const existingClaim = await this.claimModel.findOne({
            post_id: new Types.ObjectId(dto.post_id),
            claimer_id: new Types.ObjectId(claimerId),
            status: "PENDING",
        });
        if (existingClaim) {
            throw new BadRequestException("Bạn đã gửi claim cho post này rồi");
        }

        const claim = await this.claimModel.create({
            post_id: new Types.ObjectId(dto.post_id),
            claimer_id: new Types.ObjectId(claimerId),
            message: dto.message || "",
        });

        await this.postModel.findByIdAndUpdate(dto.post_id, {
            $inc: { active_claim_count: 1 },
        });

        return claim;
    }

    async review(claimId: string, dto: ReviewClaimDto, userId: string) {
        const claim = await this.claimModel.findById(claimId);
        if (!claim) throw new NotFoundException("Claim không tồn tại");
        if (claim.status !== "PENDING") {
            throw new BadRequestException("Claim đã được xử lý");
        }

        const post = await this.postModel.findById(claim.post_id);
        if (!post) throw new NotFoundException("Post không tồn tại");
        if (post.created_by_user_id.toString() !== userId) {
            throw new ForbiddenException("Chỉ người đăng tin mới được duyệt claim");
        }

        if (dto.action === "ACCEPTED") {
            claim.status = "ACCEPTED";
            await claim.save();

            await this.postModel.findByIdAndUpdate(claim.post_id, {
                status: "MATCHED",
            });
        } else {
            claim.status = "REJECTED";
            await claim.save();

            await this.postModel.findByIdAndUpdate(claim.post_id, {
                $inc: { active_claim_count: -1 },
            });
        }

        return claim;
    }

    async findByPost(postId: string) {
        return this.claimModel
            .find({ post_id: new Types.ObjectId(postId) })
            .sort({ createdAt: -1 });
    }

    async findByUser(userId: string) {
        return this.claimModel
            .find({ claimer_id: new Types.ObjectId(userId) })
            .sort({ createdAt: -1 });
    }
}
