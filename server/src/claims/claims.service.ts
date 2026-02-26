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
import { Item, ItemDocument } from "../items/schemas/item.schema";

@Injectable()
export class ClaimsService {
    constructor(
        @InjectModel(Claim.name) private claimModel: Model<ClaimDocument>,
        @InjectModel(Item.name) private itemModel: Model<ItemDocument>,
    ) { }

    async create(dto: CreateClaimDto, claimerId: string) {
        const item = await this.itemModel.findById(dto.item_id);
        if (!item) throw new NotFoundException("Item không tồn tại");
        if (item.status !== "APPROVED") {
            throw new BadRequestException(
                "Chỉ được claim item đã được duyệt (APPROVED)",
            );
        }

        const existingClaim = await this.claimModel.findOne({
            item_id: new Types.ObjectId(dto.item_id),
            claimer_id: new Types.ObjectId(claimerId),
            status: "PENDING",
        });
        if (existingClaim) {
            throw new BadRequestException("Bạn đã gửi claim cho item này rồi");
        }

        const claim = await this.claimModel.create({
            item_id: new Types.ObjectId(dto.item_id),
            claimer_id: new Types.ObjectId(claimerId),
            message: dto.message || "",
        });

        await this.itemModel.findByIdAndUpdate(dto.item_id, {
            $inc: { activeClaimCount: 1 },
        });

        return claim;
    }

    async review(claimId: string, dto: ReviewClaimDto, userId: string) {
        const claim = await this.claimModel.findById(claimId);
        if (!claim) throw new NotFoundException("Claim không tồn tại");
        if (claim.status !== "PENDING") {
            throw new BadRequestException("Claim đã được xử lý");
        }

        const item = await this.itemModel.findById(claim.item_id);
        if (!item) throw new NotFoundException("Item không tồn tại");
        if (item.created_by.toString() !== userId) {
            throw new ForbiddenException("Chỉ người đăng tin mới được duyệt claim");
        }

        if (dto.action === "ACCEPTED") {
            claim.status = "ACCEPTED";
            await claim.save();

            await this.itemModel.findByIdAndUpdate(claim.item_id, {
                status: "MATCHED",
            });
        } else {
            claim.status = "REJECTED";
            await claim.save();

            await this.itemModel.findByIdAndUpdate(claim.item_id, {
                $inc: { activeClaimCount: -1 },
            });
        }

        return claim;
    }

    async findByItem(itemId: string) {
        return this.claimModel
            .find({ item_id: new Types.ObjectId(itemId) })
            .sort({ createdAt: -1 });
    }

    async findByUser(userId: string) {
        return this.claimModel
            .find({ claimer_id: new Types.ObjectId(userId) })
            .sort({ createdAt: -1 });
    }
}
