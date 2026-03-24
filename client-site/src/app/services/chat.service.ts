import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { Socket } from "ngx-socket-io";
import { environment } from "../../environments/environment";
import { AuthService } from "./auth.service";

export type ChatMessageType = "TEXT" | "IMAGE";

export interface ChatUserLite {
  userId: string;
  name: string;
  username: string;
  isOnline: boolean;
  lastSeenAt: string | null;
}

export interface ConversationItem {
  conversationId: string;
  participants: ChatUserLite[];
  otherUser: ChatUserLite | null;
  lastMessagePreview: string;
  lastMessageAt: string | null;
  unreadCount: number;
}

export interface ChatMessage {
  messageId: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  messageType: ChatMessageType;
  content: string;
  imageUrl: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface UserStatusEvent {
  userId: string;
  name: string;
  username: string;
  isOnline: boolean;
  lastSeenAt: string | null;
}

@Injectable({ providedIn: "root" })
export class ChatService {
  private readonly baseUrl = environment.apiUrl;

  constructor(
    private readonly http: HttpClient,
    private readonly socket: Socket,
    private readonly authService: AuthService,
  ) {}

  connect(): void {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    this.socket.ioSocket.auth = { token: `Bearer ${token}` };
    if (this.socket.ioSocket.io?.opts) {
      this.socket.ioSocket.io.opts.query = {
        ...(this.socket.ioSocket.io.opts.query || {}),
        token: `Bearer ${token}`,
      };
    }
    if (!this.socket.ioSocket.connected) {
      this.socket.connect();
    }
  }

  disconnect(): void {
    if (this.socket.ioSocket.connected) {
      this.socket.disconnect();
    }
  }

  joinRoom(conversationId: string): void {
    this.socket.emit("joinRoom", { conversationId });
  }

  markAsReadRealtime(conversationId: string): void {
    this.socket.emit("markAsRead", { conversationId });
  }

  sendText(conversationId: string, content: string): void {
    this.socket.emit("sendMessage", {
      conversationId,
      messageType: "TEXT",
      content,
    });
  }

  sendImage(conversationId: string, imageUrl: string): void {
    this.socket.emit("sendMessage", {
      conversationId,
      messageType: "IMAGE",
      imageUrl,
    });
  }

  onNewMessage(): Observable<ChatMessage> {
    return this.socket.fromEvent<ChatMessage>("newMessage");
  }

  onUserStatusChanged(): Observable<UserStatusEvent> {
    return this.socket.fromEvent<UserStatusEvent>("userStatusChanged");
  }

  onConversationRead(): Observable<{
    conversationId: string;
    userId: string;
    updatedCount: number;
  }> {
    return this.socket.fromEvent("conversationRead");
  }

  onNewNotification(): Observable<any> {
    return this.socket.fromEvent("newNotification");
  }

  getConversations(): Observable<ConversationItem[]> {
    return this.http
      .get<{ data: ConversationItem[] }>(`${this.baseUrl}/chat/conversations`)
      .pipe(map((res) => res?.data || []));
  }

  createOrGetDirectConversation(targetUserId: string): Observable<string> {
    return this.http
      .post<{
        data: { conversationId: string };
      }>(`${this.baseUrl}/chat/conversations/direct`, { targetUserId })
      .pipe(map((res) => res?.data?.conversationId || ""));
  }

  getMessages(
    conversationId: string,
    page = 1,
    limit = 20,
  ): Observable<{ data: ChatMessage[]; hasMore: boolean; page: number }> {
    return this.http.get<{
      data: ChatMessage[];
      hasMore: boolean;
      page: number;
    }>(
      `${this.baseUrl}/chat/conversations/${conversationId}/messages?page=${page}&limit=${limit}`,
    );
  }

  markConversationRead(conversationId: string): Observable<any> {
    return this.http.patch(
      `${this.baseUrl}/chat/conversations/${conversationId}/read`,
      {},
    );
  }

  uploadChatImage(file: File): Observable<{ url: string; publicId: string }> {
    const fd = new FormData();
    fd.append("file", file, file.name);
    return this.http.post<{ url: string; publicId: string }>(
      `${this.baseUrl}/chat/upload-image`,
      fd,
    );
  }

  get currentUserId(): string {
    return this.authService.currentUserId || "";
  }
}
