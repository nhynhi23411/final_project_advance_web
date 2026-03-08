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
import { MAX_CLAIMS_LIMIT } from "../common/config/constants";

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
        if (dto.secret_info && this.keywordService.checkProfanity(dto.secret_info)) {
            throw new BadRequestException("Thông tin bí mật chứa từ ngữ không phù hợp!");
        }

        const existingClaim = await this.claimModel.findOne({
            target_post_id: new Types.ObjectId(dto.post_id),
            claimant_user_id: new Types.ObjectId(claimerId),
            status: "PENDING",
        });
        if (existingClaim) {
            throw new BadRequestException("Bạn đã gửi claim cho post này rồi");
        }

        const activePendingClaimsCount = await this.claimModel.countDocuments({
            claimant_user_id: new Types.ObjectId(claimerId),
            status: "PENDING",
        });

        if (activePendingClaimsCount >= MAX_CLAIMS_LIMIT) {
            throw new BadRequestException(`Bạn đã đạt giới hạn ${MAX_CLAIMS_LIMIT} claims đang chờ xử lý.`);
        }

        const claim = await this.claimModel.create({
            target_post_id: new Types.ObjectId(dto.post_id),
            claimant_user_id: new Types.ObjectId(claimerId),
            message: dto.message || "",
            secret_info: dto.secret_info || "",
            image_proof_url: dto.image_proof_url || "",
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

        if (dto.action === "CANCELLED") {
            if (claim.claimer_id.toString() !== userId) {
                throw new ForbiddenException("Chỉ người tạo claim mới được hủy claim của mình");
            }
        } else {
            if (post.created_by_user_id.toString() !== userId) {
                throw new ForbiddenException("Chỉ người đăng tin mới được duyệt claim");
            }
        }

        if (dto.action === "UNDER_VERIFICATION") {
            claim.status = "UNDER_VERIFICATION";
            await claim.save();

            // Set all other pending claims for this post to REJECTED
            const rejectedClaimsResponse = await this.claimModel.updateMany({
                target_post_id: claim.target_post_id,
                _id: { $ne: claim._id },
                status: "PENDING"
            }, {
                $set: { status: "REJECTED" }
            });
            const rejectedCount = rejectedClaimsResponse.modifiedCount;

            if (rejectedCount > 0) {
                await this.postModel.findByIdAndUpdate(claim.post_id, {
                    $inc: { active_claim_count: -rejectedCount },
                });
            }

        } else if (dto.action === "SUCCESSFUL") {
            claim.status = "SUCCESSFUL";
            await claim.save();

            // Also set any remaining pending claims to REJECTED just in case
            const rejectedClaimsResponse = await this.claimModel.updateMany({
                target_post_id: claim.target_post_id,
                _id: { $ne: claim._id },
                status: "PENDING"
            }, {
                $set: { status: "REJECTED" }
            });

            const rejectedCount = rejectedClaimsResponse.modifiedCount;

            await this.postModel.findByIdAndUpdate(claim.post_id, {
                status: "RETURNED",
                $inc: { active_claim_count: -rejectedCount },
            });
        } else if (dto.action === "REJECTED" || dto.action === "CANCELLED") {
            claim.status = dto.action;
            await claim.save();

            await this.postModel.findByIdAndUpdate(claim.post_id, {
                $inc: { active_claim_count: -1 },
            });
        }

        return claim;
    }

    async findByPost(postId: string) {
        return this.claimModel
            .find({ target_post_id: new Types.ObjectId(postId) })
            .sort({ createdAt: -1 });
    }

    async findByUser(userId: string) {
        return this.claimModel
            .find({ claimant_user_id: new Types.ObjectId(userId) })
            .sort({ createdAt: -1 });
    }
}
