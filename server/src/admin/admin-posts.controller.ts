import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  BadRequestException,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { AdminPostsService } from "./admin-posts.service";
import { UpdatePostStatusDto } from "./dto/update-post-status.dto";
import { AdminUpdatePostDto } from "./dto/admin-update-post.dto";

function isValidObjectId(id: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(id);
}

@Controller("admin/posts")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
export class AdminPostsController {
  constructor(private readonly adminPostsService: AdminPostsService) {}

  @Get()
  findPosts(
    @Query("status") status?: string,
    @Query("category") category?: string,
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
  ) {
    const filters =
      category || dateFrom || dateTo
        ? { category, dateFrom, dateTo }
        : undefined;
    return this.adminPostsService.getPosts(
      status || "PENDING_ADMIN",
      filters,
    );
  }

  @Patch(":id/status")
  async updateStatus(
    @Param("id") id: string,
    @Body() dto: UpdatePostStatusDto,
    @Request() req: { user: { userId: string } },
  ) {
    if (!isValidObjectId(id)) throw new BadRequestException("Invalid post ID");
    if (dto.status === "REJECTED" && !dto.reject_reason?.trim()) {
      throw new BadRequestException(
        "reject_reason required when status is REJECTED",
      );
    }
    return this.adminPostsService.updatePostStatus(id, dto, req.user.userId);
  }

  @Patch(":id")
  async updatePost(
    @Param("id") id: string,
    @Body() dto: AdminUpdatePostDto,
  ) {
    if (!isValidObjectId(id)) throw new BadRequestException("Invalid post ID");
    return this.adminPostsService.updatePostContent(id, dto);
  }

  @Delete(":id")
  async deletePost(@Param("id") id: string) {
    if (!isValidObjectId(id)) throw new BadRequestException("Invalid post ID");
    return this.adminPostsService.deletePost(id);
  }
}
