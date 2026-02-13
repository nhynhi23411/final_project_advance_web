import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage, File } from "multer";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ItemsService } from "./items.service";
import { CreateItemDto } from "./dto/create-item.dto";
import { UpdateItemDto } from "./dto/update-item.dto";
import { CloudinaryService } from "../cloudinary/cloudinary.service";

const uploadOpts = {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
};

/** MongoDB ObjectId 24 ký tự hex - tránh "upload-image" hoặc path khác bị coi là id */
function isValidObjectId(id: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(id);
}

@Controller("items")
export class ItemsController {
  constructor(
    private readonly itemsService: ItemsService,
    private readonly cloudinary: CloudinaryService
  ) {}

  @Get()
  findAll(
    @Query("type") type?: string,
    @Query("category") category?: string,
    @Query("location") location?: string,
    @Query("status") status?: string
  ) {
    return this.itemsService.findAllByFilter({
      type,
      category,
      location,
      status,
    });
  }

  @Get("my")
  @UseGuards(JwtAuthGuard)
  findMy(@Request() req: { user: { userId: string } }) {
    return this.itemsService.findByUser(req.user.userId);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException("Id không hợp lệ. Dùng POST /api/items/upload-image để upload ảnh.");
    }
    return this.itemsService.findOne(id);
  }

  /** Upload một ảnh lên Cloudinary. Trả về { url, publicId } để client gửi vào POST /items. */
  @Post("upload-image")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor("file", uploadOpts))
  async uploadImage(
    @UploadedFile() file: File | undefined
  ): Promise<{ url: string; publicId: string }> {
    if (!file?.buffer) throw new BadRequestException("Chưa chọn ảnh");
    const result = await this.cloudinary.uploadBuffer(file.buffer, {
      folder: "lost-found",
    });
    return { url: result.secure_url, publicId: result.public_id };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Body() dto: CreateItemDto,
    @Request() req: { user: { userId: string } }
  ) {
    return this.itemsService.create({
      ...dto,
      created_by: req.user.userId,
      images: dto.images ?? [],
      image_public_ids: dto.image_public_ids ?? [],
    } as CreateItemDto & {
      created_by: string;
      images: string[];
      image_public_ids: string[];
    });
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard)
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateItemDto,
    @Request() req: { user: { userId: string } }
  ) {
    if (!isValidObjectId(id)) throw new BadRequestException("Id không hợp lệ");
    const item = await this.itemsService.findOne(id);
    if (!item) return null;
    const createdBy = (item as any).created_by?.toString?.();
    if (createdBy !== req.user.userId) {
      throw new BadRequestException("Chỉ sửa được bài của bạn");
    }
    return this.itemsService.update(id, dto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  async remove(
    @Param("id") id: string,
    @Request() req: { user: { userId: string } }
  ) {
    if (!isValidObjectId(id)) throw new BadRequestException("Id không hợp lệ");
    const item = await this.itemsService.findOne(id);
    if (!item) return null;
    const createdBy = (item as any).created_by?.toString?.();
    if (createdBy !== req.user.userId) {
      throw new BadRequestException("Chỉ xóa được bài của bạn");
    }
    const doc = item as any;
    if (Array.isArray(doc.image_public_ids)) {
      for (const pid of doc.image_public_ids) {
        await this.cloudinary.deleteByPublicId(pid).catch(() => {});
      }
    }
    return this.itemsService.delete(id);
  }
}
