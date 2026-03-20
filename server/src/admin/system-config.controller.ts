import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { AdminKeywordService } from "../keyword/admin-keyword.service";
import { TasksService } from "../tasks/tasks.service";

@Controller("admin/system-config")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
export class SystemConfigController {
  constructor(
    private readonly adminKeywordService: AdminKeywordService,
    private readonly tasksService: TasksService,
  ) {}

  // ---------- Blacklist ----------

  @Get("blacklist")
  async listBlacklist() {
    return this.adminKeywordService.findAllBlacklistedKeywords();
  }

  @Post("blacklist")
  async createBlacklistKeyword(@Body() body: { keyword?: string }) {
    const keyword = body?.keyword?.trim();
    if (!keyword) throw new BadRequestException("keyword is required");
    return this.adminKeywordService.create(keyword);
  }

  @Patch("blacklist/:id")
  async updateBlacklistKeyword(
    @Param("id") id: string,
    @Body()
    body: { keyword?: string; is_active?: boolean },
  ) {
    const updates: any = {};
    if (body.keyword !== undefined) updates.keyword = body.keyword.trim();
    if (body.is_active !== undefined)
      updates.is_active = Boolean(body.is_active);

    if (Object.keys(updates).length === 0) {
      throw new BadRequestException("No valid fields to update");
    }

    const updated = await this.adminKeywordService.update(id, updates);
    if (!updated) throw new NotFoundException("Blacklist keyword not found");
    return updated;
  }

  @Patch("blacklist/:id/toggle")
  async toggleBlacklistKeyword(
    @Param("id") id: string,
    @Body() body: { is_active?: boolean },
  ) {
    if (body?.is_active === undefined) {
      throw new BadRequestException("is_active is required");
    }
    const updated = await this.adminKeywordService.toggleStatus(
      id,
      Boolean(body.is_active),
    );
    if (!updated) throw new NotFoundException("Blacklist keyword not found");
    return updated;
  }

  @Delete("blacklist/:id")
  async deleteBlacklistKeyword(@Param("id") id: string) {
    const ok = await this.adminKeywordService.delete(id);
    if (!ok) throw new NotFoundException("Blacklist keyword not found");
    return { message: "Xóa blacklist keyword thành công" };
  }

  // ---------- Algorithm Weights ----------

  @Get("weights")
  async getWeights() {
    const w = this.adminKeywordService.getAlgorithmWeights();
    return {
      category: Math.round(w.category * 100),
      text: Math.round(w.text * 100),
      location: Math.round(w.location * 100),
      time: Math.round(w.time * 100),
      attributes: Math.round(w.attributes * 100),
    };
  }

  @Patch("weights")
  async updateWeights(
    @Body()
    body: {
      category?: number;
      text?: number;
      location?: number;
      time?: number;
      attributes?: number;
    },
  ) {
    const next = await this.adminKeywordService.updateAlgorithmWeights({
      category: body.category ?? 0,
      text: body.text ?? 0,
      location: body.location ?? 0,
      time: body.time ?? 0,
      attributes: body.attributes ?? 0,
    });

    // Re-score match suggestions immediately.
    await this.tasksService.suggestMatchesNow();

    return {
      message: "Cập nhật trọng số thuật toán thành công",
      weights: {
        category: Math.round(next.category * 100),
        text: Math.round(next.text * 100),
        location: Math.round(next.location * 100),
        time: Math.round(next.time * 100),
        attributes: Math.round(next.attributes * 100),
      },
    };
  }
}

