import { Controller, Get, Patch, Param, UseGuards, Req, Query } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { NotificationsService } from "./notifications.service";

@Controller("notifications")
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  /**
   * GET /notifications
   * Get all notifications for the current user.
   * Query: unreadOnly=true to get only unread
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async getNotifications(
    @Req() req: { user: { userId: string } },
    @Query("unreadOnly") unreadOnly?: string,
  ) {
    const isUnreadOnly = unreadOnly === "true";
    const notifications = await this.notificationsService.getUserNotifications(
      req.user.userId,
      isUnreadOnly,
    );
    const unreadCount = await this.notificationsService.getUnreadCount(req.user.userId);
    return { notifications, unreadCount };
  }

  /**
   * GET /notifications/unread-count
   * Get unread notification count.
   */
  @Get("unread-count")
  @UseGuards(JwtAuthGuard)
  async getUnreadCount(@Req() req: { user: { userId: string } }) {
    const count = await this.notificationsService.getUnreadCount(req.user.userId);
    return { unreadCount: count };
  }

  /**
   * PATCH /notifications/:id/read
   * Mark a single notification as read.
   */
  @Patch(":id/read")
  @UseGuards(JwtAuthGuard)
  async markAsRead(@Param("id") notificationId: string) {
    await this.notificationsService.markAsRead(notificationId);
    return { message: "Notification marked as read" };
  }

  /**
   * PATCH /notifications/mark-all-read
   * Mark all notifications for current user as read.
   */
  @Patch("mark-all-read")
  @UseGuards(JwtAuthGuard)
  async markAllAsRead(@Req() req: { user: { userId: string } }) {
    await this.notificationsService.markAllAsRead(req.user.userId);
    return { message: "All notifications marked as read" };
  }
}
