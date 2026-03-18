import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Notification, NotificationDocument, NotificationType } from "./schemas/notification.schema";
import { Post, PostDocument } from "../posts/schemas/post.schema";
import { User, UserDocument } from "../users/schemas/user.schema";

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  /** Create a notification record. */
  async createNotification(
    recipientUserId: string,
    senderUserId: string,
    type: NotificationType,
    relatedPostId: string,
    title: string,
    message: string,
    relatedClaimId?: string,
    relatedMatchId?: string,
  ): Promise<NotificationDocument> {
    const notif = await this.notificationModel.create({
      recipient_user_id: new Types.ObjectId(recipientUserId),
      sender_user_id: new Types.ObjectId(senderUserId),
      notification_type: type,
      related_post_id: new Types.ObjectId(relatedPostId),
      related_claim_id: relatedClaimId ? new Types.ObjectId(relatedClaimId) : null,
      related_match_id: relatedMatchId ? new Types.ObjectId(relatedMatchId) : null,
      title,
      message,
      is_read: false,
    });
    return notif;
  }

  /** Get all notifications for a user (optionally unread only). */
  async getUserNotifications(
    userId: string,
    unreadOnly: boolean = false,
  ): Promise<NotificationDocument[]> {
    const filter: any = { recipient_user_id: new Types.ObjectId(userId) };
    if (unreadOnly) filter.is_read = false;
    return this.notificationModel
      .find(filter)
      .sort({ created_at: -1 })
      .populate("sender_user_id", "name username")
      .lean()
      .exec() as any;
  }

  /** Mark a notification as read. */
  async markAsRead(notificationId: string): Promise<void> {
    await this.notificationModel
      .findByIdAndUpdate(notificationId, { is_read: true })
      .exec();
  }

  /** Mark all notifications for a user as read. */
  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationModel
      .updateMany(
        { recipient_user_id: new Types.ObjectId(userId) },
        { is_read: true },
      )
      .exec();
  }

  /** Get unread count for a user. */
  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationModel
      .countDocuments({
        recipient_user_id: new Types.ObjectId(userId),
        is_read: false,
      })
      .exec();
  }

  // ─── Event listeners ────────────────────────────────────────────────────────────────

  /**
   * Listen for claim.created event and notify the post owner.
   */
  @OnEvent("claim.created")
  async handleClaimCreated(payload: {
    claimId: string;
    postId: string;
    claimerId: string;
    claimerName?: string;
  }): Promise<void> {
    const { claimId, postId, claimerId, claimerName } = payload;

    const post = await this.postModel
      .findById(postId)
      .select("created_by_user_id title post_type")
      .exec();
    if (!post || !post.created_by_user_id) return;

    const postOwnerId = post.created_by_user_id.toString();
    if (postOwnerId === claimerId) return; // Don't notify self

    const type = (post.post_type || "FOUND") === "LOST" ? "claim" : "claim";
    await this.createNotification(
      postOwnerId,
      claimerId,
      "claim",
      postId,
      `Có yêu cầu xác nhận từ ${claimerName || "người dùng"}`,
      `${claimerName || "Người dùng"} vừa gửi yêu cầu xác nhận cho bài "${post.title}"`,
      claimId,
    );
    this.logger.log(`Notification sent: claim ${claimId} for post ${postId}`);
  }

  /**
   * Listen for match.suggested event and notify the lost item owner.
   */
  @OnEvent("match.suggested")
  async handleMatchSuggested(payload: {
    matchId: string;
    lostPostId: string;
    foundPostId: string;
    finderId: string;
    finderName?: string;
  }): Promise<void> {
    const { matchId, lostPostId, foundPostId, finderId, finderName } = payload;

    const lostPost = await this.postModel
      .findById(lostPostId)
      .select("created_by_user_id title")
      .exec();
    if (!lostPost || !lostPost.created_by_user_id) return;

    const lostOwnerId = lostPost.created_by_user_id.toString();
    if (lostOwnerId === finderId) return; // Don't notify self

    await this.createNotification(
      lostOwnerId,
      finderId,
      "match_suggestion",
      lostPostId,
      `${finderName || "Người dùng"} có thể đang giữ đồ của bạn`,
      `${finderName || "Người dùng"} gửi gợi ý rằng họ có thể đang giữ "${lostPost.title}"`,
      undefined,
      matchId,
    );
    this.logger.log(
      `Notification sent: match suggestion ${matchId} for lost post ${lostPostId}`,
    );
  }

  /**
   * Listen for claim.reviewed event and notify the claimer.
   */
  @OnEvent("claim.reviewed")
  async handleClaimReviewed(payload: {
    claimId: string;
    postId: string;
    claimerId: string;
    reviewerName: string;
    action: "UNDER_VERIFICATION" | "SUCCESSFUL" | "REJECTED" | "CANCELLED";
    postTitle: string;
  }): Promise<void> {
    const { claimId, postId, claimerId, reviewerName, action, postTitle } = payload;

    let title = "";
    let message = "";

    switch (action) {
      case "UNDER_VERIFICATION":
        title = "Yêu cầu của bạn được chọn để xác minh";
        message = `${reviewerName} đã chọn yêu cầu của bạn để xác minh bài "${postTitle}"`;
        break;
      case "SUCCESSFUL":
        title = "🎉 Yêu cầu của bạn đã được chấp thuận!";
        message = `Xin chúc mừng! Yêu cầu của bạn cho bài "${postTitle}" đã được chấp thuận bởi ${reviewerName}`;
        break;
      case "REJECTED":
        title = "Yêu cầu của bạn bị từ chối";
        message = `Yêu cầu của bạn cho bài "${postTitle}" đã bị từ chối bởi ${reviewerName}`;
        break;
      case "CANCELLED":
        title = "Yêu cầu của bạn đã bị hủy";
        message = `Bạn đã hủy yêu cầu cho bài "${postTitle}"`;
        break;
    }

    await this.createNotification(
      claimerId,
      reviewerName === "bạn" ? claimerId : postId, // Self-notification for CANCELLED
      "claim",
      postId,
      title,
      message,
      claimId,
    );
    this.logger.log(
      `Notification sent: claim ${claimId} reviewed (action: ${action})`,
    );
  }

  /**
   * Notify post owner when admin approves their post.
   */
  @OnEvent("post.approved")
  async handlePostApproved(payload: {
    postId: string;
    userId: string;
    adminUserId: string;
  }): Promise<void> {
    const { postId, userId, adminUserId } = payload;
    const post = await this.postModel
      .findById(postId)
      .select("title")
      .lean()
      .exec();
    const title = (post as any)?.title ?? "Bài đăng";
    await this.createNotification(
      userId,
      adminUserId,
      "post_approved",
      postId,
      "Bài đăng của bạn đã được duyệt",
      `"${title}" đã được phê duyệt và hiển thị công khai.`,
    );
    this.logger.log(`Notification sent: post approved ${postId} to user ${userId}`);
  }

  /**
   * Notify post owner when admin sets status to NEEDS_UPDATE.
   */
  @OnEvent("post.needs_update")
  async handlePostNeedsUpdate(payload: {
    postId: string;
    userId: string;
    adminUserId: string;
  }): Promise<void> {
    const { postId, userId, adminUserId } = payload;
    const post = await this.postModel
      .findById(postId)
      .select("title")
      .lean()
      .exec();
    const title = (post as any)?.title ?? "Bài đăng";
    await this.createNotification(
      userId,
      adminUserId,
      "post_needs_update",
      postId,
      "Bài đăng cần cập nhật",
      `Bài đăng "${title}" cần được chỉnh sửa theo góp ý của quản trị viên. Vui lòng xem và cập nhật.`,
    );
    this.logger.log(`Notification sent: post needs_update ${postId} to user ${userId}`);
  }

  /**
   * Notify post owner when admin rejects their post.
   */
  @OnEvent("post.rejected")
  async handlePostRejected(payload: {
    postId: string;
    userId: string;
    adminUserId: string;
  }): Promise<void> {
    const { postId, userId, adminUserId } = payload;
    const post = await this.postModel
      .findById(postId)
      .select("title")
      .lean()
      .exec();
    const title = (post as any)?.title ?? "Bài đăng";
    await this.createNotification(
      userId,
      adminUserId,
      "post_rejected",
      postId,
      "Bài đăng của bạn đã bị từ chối",
      `Bài đăng "${title}" đã bị từ chối. Vui lòng xem lý do và đăng lại nếu cần.`,
    );
    this.logger.log(`Notification sent: post rejected ${postId} to user ${userId}`);
  }

  /**
   * Notify all admins when a user closes their own post (archived with reason).
   */
  @OnEvent("post.closed_by_user")
  async handlePostClosedByUser(payload: {
    postId: string;
    userId: string;
    reason: string;
    postTitle: string;
  }): Promise<void> {
    const { postId, userId, reason, postTitle } = payload;
    const admins = await this.userModel
      .find({ role: "ADMIN" })
      .select("_id")
      .lean()
      .exec();
    const senderName = "Người dùng";
    for (const admin of admins) {
      const adminId = (admin as any)._id?.toString?.();
      if (!adminId || adminId === userId) continue;
      await this.createNotification(
        adminId,
        userId,
        "post_closed_by_user",
        postId,
        "Người dùng đã đóng bài đăng",
        `Bài đăng "${postTitle}" đã được chủ đăng đóng. Lý do: ${reason}`,
      );
    }
    this.logger.log(`Notifications sent: post closed by user ${postId} to ${admins.length} admin(s)`);
  }
}

