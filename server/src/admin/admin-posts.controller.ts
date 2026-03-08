import {
  Controller,
  Get,
  Patch,
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

function isValidObjectId(id: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(id);
}

@Controller("admin/posts")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
export class AdminPostsController {
  constructor(private readonly adminPostsService: AdminPostsService) {}

  @Get()
  findPosts(@Query("status") status?: string) {
    return this.adminPostsService.getPosts(status || "PENDING_ADMIN");
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
}
