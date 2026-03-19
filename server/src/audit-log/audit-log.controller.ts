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
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("action") action?: AuditAction,
    @Query("user_id") user_id?: string,
    @Query("performed_by_user_id") performed_by_user_id?: string,
  ) {
    const result = await this.auditLogService.findAll({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      action,
      user_id,
      performed_by_user_id,
    });

    return {
      message: "Audit logs retrieved",
      ...result,
    };
  }
}
