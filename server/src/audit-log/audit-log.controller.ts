import { Controller, Get, Query, UseGuards, Req } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { AuditLogService } from "./audit-log.service";
import { AuditAction } from "./schemas/audit-log.schema";

@Controller("admin/audit-logs")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin")
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  async findAll(
    // Ticket query params
    @Query("userId") userId?: string,
    @Query("skip") skip?: string,

    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("action") action?: AuditAction,
    @Query("user_id") user_id?: string,
    @Query("performed_by_user_id") performed_by_user_id?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const skipNum = skip ? Math.max(0, parseInt(skip, 10) || 0) : undefined;
    const pageNum = page
      ? Math.max(1, parseInt(page, 10) || 1)
      : skipNum !== undefined
        ? Math.floor(skipNum / limitNum) + 1
        : 1;

    const result = await this.auditLogService.findAll({
      page: pageNum,
      limit: limitNum,
      skip: skipNum,
      action,
      userId,
      user_id,
      performed_by_user_id,
    });

    return {
      message: "Audit logs retrieved",
      ...result,
    };
  }
}
