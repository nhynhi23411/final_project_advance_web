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
import { PostsService } from "./posts.service";
import { CreatePostDto } from "./dto/create-post.dto";
import { UpdatePostDto } from "./dto/update-post.dto";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { KeywordService } from "../keyword/keyword.service";

const uploadOpts = {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
};

/** MongoDB ObjectId 24 ký tự hex - tránh "upload-image" hoặc path khác bị coi là id */
function isValidObjectId(id: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(id);
}

@Controller("items")
export class PostsController {
  constructor(
    private readonly postsService: PostsService,
    private readonly cloudinary: CloudinaryService,
    private readonly keywordService: KeywordService,
  ) { }

  @Get()
  findAll(
    @Query("type") type?: string,
    @Query("category") category?: string,
    @Query("location") location?: string,
    @Query("status") status?: string,
    @Query("q") q?: string,
  ) {
    const effectiveStatus = status || "APPROVED";
    if (effectiveStatus === "PENDING_ADMIN") {
      throw new BadRequestException(
        "Chỉ admin mới xem được bài chờ duyệt. Dùng endpoint /api/admin/posts.",
      );
    }
    return this.postsService.findAllByFilter({
      type,
      category,
      location,
      status: effectiveStatus,
      q: q?.trim() || undefined,
    });
  }

  @Get("my")
  @UseGuards(JwtAuthGuard)
  findMy(@Request() req: { user: { userId: string } }) {
    return this.postsService.findByUser(req.user.userId);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException(
        "Id không hợp lệ. Dùng POST /api/posts/upload-image để upload ảnh.",
      );
    }
    return this.postsService.findOne(id);
  }

  /** Upload một ảnh lên Cloudinary. Trả về { url, publicId } để client gửi vào POST /posts. */
  @Post("upload-image")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor("file", uploadOpts))
  async uploadImage(
    @UploadedFile() file: File | undefined,
  ): Promise<{ url: string; publicId: string }> {
    if (!file?.buffer) throw new BadRequestException("Chưa chọn ảnh");
    const result = await this.cloudinary.uploadBuffer(file.buffer, {
      folder: "lost-found",
    });
    return { url: result.secure_url, publicId: result.public_id };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() dto: CreatePostDto, @Request() req: any) {
    const created = await this.postsService.createPostWithUser(dto, req.user.userId, req.body.status);
    return { message: 'Bài đăng đang được kiểm duyệt', data: created };
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard)
  async update(
    @Param("id") id: string,
    @Body() dto: UpdatePostDto,
    @Request() req: { user: { userId: string } },
  ) {
    if (!isValidObjectId(id)) throw new BadRequestException("Id không hợp lệ");
    const post = await this.postsService.findOne(id);
    if (!post) return null;
    const createdBy = (post as any).created_by_user_id?.toString?.();
    if (createdBy !== req.user.userId) {
      throw new BadRequestException("Chỉ sửa được bài của bạn");
    }

    // profanity check when updating
    if (dto.title && this.keywordService.checkProfanity(dto.title)) {
      throw new BadRequestException("Tiêu đề chứa từ ngữ không phù hợp");
    }
    if (dto.description && this.keywordService.checkProfanity(dto.description)) {
      throw new BadRequestException("Mô tả chứa từ ngữ không phù hợp");
    }

    return this.postsService.update(id, dto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  async remove(
    @Param("id") id: string,
    @Request() req: { user: { userId: string } },
  ) {
    if (!isValidObjectId(id)) throw new BadRequestException("Id không hợp lệ");
    const post = await this.postsService.findOne(id);
    if (!post) return null;
    const createdBy = (post as any).created_by_user_id?.toString?.();
    if (createdBy !== req.user.userId) {
      throw new BadRequestException("Chỉ xóa được bài của bạn");
    }
    const doc = post as any;
    if (Array.isArray(doc.image_public_ids)) {
      for (const pid of doc.image_public_ids) {
        await this.cloudinary.deleteByPublicId(pid).catch(() => { });
      }
    }
    return this.postsService.delete(id);
  }
}
