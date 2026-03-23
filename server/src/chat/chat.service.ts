import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  Conversation,
  ConversationDocument,
} from "./schemas/conversation.schema";
import { Message, MessageDocument } from "./schemas/message.schema";
import { User, UserDocument } from "../users/schemas/user.schema";

export interface SendMessageInput {
  conversationId?: string;
  receiverId?: string;
  messageType: "TEXT" | "IMAGE";
  content?: string;
  imageUrl?: string;
}

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<ConversationDocument>,
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  private toObjectId(id: string, fieldName: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`${fieldName} không hợp lệ`);
    }
    return new Types.ObjectId(id);
  }

  private buildConversationKey(userA: string, userB: string): string {
    const [a, b] = [userA, userB].sort();
    return `${a}:${b}`;
  }

  async updateUserPresence(userId: string, isOnline: boolean): Promise<void> {
    const patch: Record<string, any> = {
      is_online: isOnline,
      updated_at: new Date(),
    };
    if (!isOnline) patch.last_seen_at = new Date();

    await this.userModel.findByIdAndUpdate(userId, patch).exec();
  }

  async getUserPublicProfile(userId: string): Promise<{
    userId: string;
    name: string;
    username: string;
    isOnline: boolean;
    lastSeenAt: Date | null;
  }> {
    const user = await this.userModel
      .findById(userId)
      .select("name username is_online last_seen_at")
      .lean()
      .exec();
    if (!user) throw new NotFoundException("Người dùng không tồn tại");

    return {
      userId: String((user as any)._id),
      name: (user as any).name ?? "",
      username: (user as any).username ?? "",
      isOnline: !!(user as any).is_online,
      lastSeenAt: (user as any).last_seen_at ?? null,
    };
  }

  async getOrCreateDirectConversation(
    userId: string,
    targetUserId: string,
  ): Promise<ConversationDocument> {
    const myId = this.toObjectId(userId, "userId");
    const otherId = this.toObjectId(targetUserId, "targetUserId");

    if (String(myId) === String(otherId)) {
      throw new BadRequestException("Không thể tạo chat với chính bạn");
    }

    const key = this.buildConversationKey(String(myId), String(otherId));

    const existing = await this.conversationModel
      .findOne({ conversation_key: key })
      .exec();
    if (existing) return existing;

    const created = await this.conversationModel.create({
      participants: [myId, otherId],
      conversation_key: key,
      last_message_preview: "",
      last_message_at: null,
      unread_counts: {
        [String(myId)]: 0,
        [String(otherId)]: 0,
      },
    });

    return created;
  }

  async ensureUserInConversation(
    conversationId: string,
    userId: string,
  ): Promise<ConversationDocument> {
    const convId = this.toObjectId(conversationId, "conversationId");
    const conversation = await this.conversationModel.findById(convId).exec();
    if (!conversation) throw new NotFoundException("Không tìm thấy hội thoại");

    const isMember = conversation.participants.some(
      (p) => String(p) === userId,
    );
    if (!isMember) {
      throw new ForbiddenException("Bạn không có quyền truy cập hội thoại này");
    }

    return conversation;
  }

  async listConversations(userId: string): Promise<any[]> {
    const uid = this.toObjectId(userId, "userId");

    const conversations = await this.conversationModel
      .find({ participants: uid })
      .sort({ last_message_at: -1, updated_at: -1 })
      .populate("participants", "name username is_online last_seen_at")
      .lean()
      .exec();

    return conversations.map((conv: any) => {
      const participants = (conv.participants || []).map((p: any) => ({
        userId: String(p._id),
        name: p.name ?? "",
        username: p.username ?? "",
        isOnline: !!p.is_online,
        lastSeenAt: p.last_seen_at ?? null,
      }));

      const otherUser =
        participants.find((p: any) => p.userId !== userId) || null;
      const unreadRaw = conv.unread_counts?.[userId] ?? 0;
      const unreadCount = Number.isFinite(unreadRaw)
        ? Number(unreadRaw)
        : Number((conv.unread_counts?.get?.(userId) as any) ?? 0);

      return {
        conversationId: String(conv._id),
        participants,
        otherUser,
        lastMessagePreview: conv.last_message_preview ?? "",
        lastMessageAt: conv.last_message_at ?? null,
        unreadCount,
      };
    });
  }

  async getMessages(
    userId: string,
    conversationId: string,
    page = 1,
    limit = 20,
  ): Promise<{
    conversationId: string;
    page: number;
    limit: number;
    hasMore: boolean;
    data: any[];
  }> {
    await this.ensureUserInConversation(conversationId, userId);

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20));
    const skip = (safePage - 1) * safeLimit;

    const rows = await this.messageModel
      .find({
        conversation_id: this.toObjectId(conversationId, "conversationId"),
      })
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(safeLimit + 1)
      .lean()
      .exec();

    const hasMore = rows.length > safeLimit;
    const slice = rows.slice(0, safeLimit).reverse();

    return {
      conversationId,
      page: safePage,
      limit: safeLimit,
      hasMore,
      data: slice.map((m: any) => ({
        messageId: String(m._id),
        conversationId: String(m.conversation_id),
        senderId: String(m.sender_id),
        receiverId: String(m.receiver_id),
        messageType: m.message_type,
        content: m.content ?? "",
        imageUrl: m.image_url ?? "",
        isRead: !!m.is_read,
        readAt: m.read_at ?? null,
        createdAt: m.created_at,
      })),
    };
  }

  async sendMessage(senderId: string, payload: SendMessageInput): Promise<any> {
    const messageType = payload.messageType === "IMAGE" ? "IMAGE" : "TEXT";
    const text = String(payload.content || "").trim();
    const imageUrl = String(payload.imageUrl || "").trim();

    if (messageType === "TEXT" && !text) {
      throw new BadRequestException("Tin nhắn văn bản không được để trống");
    }
    if (messageType === "IMAGE" && !imageUrl) {
      throw new BadRequestException("Tin nhắn ảnh cần imageUrl");
    }

    let conversation: ConversationDocument;
    if (payload.conversationId) {
      conversation = await this.ensureUserInConversation(
        payload.conversationId,
        senderId,
      );
    } else if (payload.receiverId) {
      conversation = await this.getOrCreateDirectConversation(
        senderId,
        payload.receiverId,
      );
    } else {
      throw new BadRequestException("Thiếu conversationId hoặc receiverId");
    }

    const receiver = conversation.participants.find(
      (p) => String(p) !== senderId,
    );
    if (!receiver) {
      throw new BadRequestException("Không xác định được người nhận");
    }

    const created = await this.messageModel.create({
      conversation_id: conversation._id,
      sender_id: this.toObjectId(senderId, "senderId"),
      receiver_id: receiver,
      message_type: messageType,
      content: messageType === "TEXT" ? text : "",
      image_url: messageType === "IMAGE" ? imageUrl : "",
      is_read: false,
      read_at: null,
    });

    const receiverId = String(receiver);
    const currentUnreadRaw = (conversation.unread_counts as any)?.get
      ? Number((conversation.unread_counts as any).get(receiverId) ?? 0)
      : Number((conversation.unread_counts as any)?.[receiverId] ?? 0);

    const nextUnread = currentUnreadRaw + 1;

    const preview =
      messageType === "IMAGE"
        ? "[Hình ảnh]"
        : text.length > 120
          ? `${text.slice(0, 117)}...`
          : text;

    await this.conversationModel
      .findByIdAndUpdate(conversation._id, {
        $set: {
          last_message_id: created._id,
          last_message_preview: preview,
          last_message_at: created.created_at ?? new Date(),
          [`unread_counts.${receiverId}`]: nextUnread,
          [`unread_counts.${senderId}`]: 0,
          updated_at: new Date(),
        },
      })
      .exec();

    return {
      messageId: String(created._id),
      conversationId: String(created.conversation_id),
      senderId: String(created.sender_id),
      receiverId: String(created.receiver_id),
      messageType: created.message_type,
      content: created.content ?? "",
      imageUrl: created.image_url ?? "",
      isRead: !!created.is_read,
      readAt: created.read_at ?? null,
      createdAt: created.created_at,
    };
  }

  async markConversationAsRead(
    userId: string,
    conversationId: string,
  ): Promise<{
    updatedCount: number;
  }> {
    const conversation = await this.ensureUserInConversation(
      conversationId,
      userId,
    );

    const result = await this.messageModel
      .updateMany(
        {
          conversation_id: conversation._id,
          receiver_id: this.toObjectId(userId, "userId"),
          is_read: false,
        },
        {
          $set: {
            is_read: true,
            read_at: new Date(),
            updated_at: new Date(),
          },
        },
      )
      .exec();

    await this.conversationModel
      .findByIdAndUpdate(conversation._id, {
        $set: {
          [`unread_counts.${userId}`]: 0,
          updated_at: new Date(),
        },
      })
      .exec();

    return { updatedCount: result.modifiedCount || 0 };
  }
}
