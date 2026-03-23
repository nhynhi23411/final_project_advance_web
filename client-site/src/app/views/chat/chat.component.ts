import {
  AfterViewChecked,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { Subscription } from "rxjs";
import {
  ChatMessage,
  ChatService,
  ConversationItem,
  UserStatusEvent,
} from "../../services/chat.service";
import { Item, ItemService } from "../../services/item.service";

interface PostContextPayload {
  postId: string;
  title: string;
  url: string;
}

interface PostContextPreview {
  postId: string;
  title: string;
  url: string;
  imageUrl: string;
  category: string;
  location: string;
  postType: string;
}

type PostType = "LOST" | "FOUND";

@Component({
  selector: "app-chat",
  templateUrl: "./chat.component.html",
  styleUrls: ["./chat.component.scss"],
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  conversations: ConversationItem[] = [];
  selectedConversation: ConversationItem | null = null;
  messages: ChatMessage[] = [];

  loadingConversations = false;
  loadingMessages = false;
  loadingOlder = false;
  sending = false;
  error: string | null = null;

  draftMessage = "";
  imageUploading = false;

  page = 1;
  readonly limit = 20;
  hasMore = true;

  private shouldStickBottom = true;
  private readonly subs: Subscription[] = [];
  private pendingOpenConversationId = "";
  private pendingPostContext: { postId: string; postTitle: string } | null = null;
  private knownMessageIds = new Set<string>();
  private postContextByMessageId = new Map<string, PostContextPreview>();
  private postPreviewByPostId = new Map<string, PostContextPreview>();
  private loadingPostPreviewIds = new Set<string>();

  @ViewChild("messageScroller")
  messageScroller?: ElementRef<HTMLDivElement>;

  constructor(
    private readonly chatService: ChatService,
    private readonly route: ActivatedRoute,
    private readonly itemService: ItemService,
  ) {}

  ngOnInit(): void {
    this.loadingConversations = true;
    this.chatService.connect();

    this.subs.push(
      this.route.queryParamMap.subscribe((params) => {
        const targetUserId = (params.get("targetUserId") || "").trim();
        const postId = (params.get("postId") || "").trim();
        const postTitle = (params.get("postTitle") || "").trim();

        this.pendingPostContext = postId
          ? { postId, postTitle: postTitle || "Bài đăng" }
          : null;

        if (!targetUserId) return;
        this.openDirectConversationByUser(targetUserId);
      }),
    );

    this.subs.push(
      this.chatService.onNewMessage().subscribe((msg) => {
        if (this.knownMessageIds.has(msg.messageId)) return;
        this.knownMessageIds.add(msg.messageId);

        this.patchConversationPreview(msg);
        if (this.selectedConversation?.conversationId === msg.conversationId) {
          this.messages = [...this.messages, msg];
          this.hydratePostContexts([msg]);
          this.shouldStickBottom = true;
          this.markCurrentConversationRead();
        }
      }),
    );

    this.subs.push(
      this.chatService.onUserStatusChanged().subscribe((status) => {
        this.patchUserStatus(status);
      }),
    );

    this.subs.push(
      this.chatService.onConversationRead().subscribe((evt) => {
        const idx = this.conversations.findIndex(
          (c) => c.conversationId === evt.conversationId,
        );
        if (idx >= 0 && evt.userId === this.chatService.currentUserId) {
          this.conversations[idx].unreadCount = 0;
        }
      }),
    );

    this.loadConversations();
  }

  ngAfterViewChecked(): void {
    if (!this.shouldStickBottom) return;
    this.scrollToBottom();
    this.shouldStickBottom = false;
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
    this.chatService.disconnect();
  }

  loadConversations(): void {
    this.chatService.getConversations().subscribe({
      next: (list) => {
        this.conversations = list;
        this.loadingConversations = false;

        if (this.pendingOpenConversationId) {
          const found = list.find(
            (c) => c.conversationId === this.pendingOpenConversationId,
          );
          if (found) {
            this.pendingOpenConversationId = "";
            this.openConversation(found);
            return;
          }
        }

        if (!this.selectedConversation && list.length) {
          this.openConversation(list[0]);
        }
      },
      error: (err) => {
        this.loadingConversations = false;
        this.error = err?.error?.message || "Không thể tải cuộc hội thoại.";
      },
    });
  }

  openConversation(conversation: ConversationItem): void {
    this.selectedConversation = conversation;
    this.messages = [];
    this.knownMessageIds.clear();
    this.postContextByMessageId.clear();
    this.page = 1;
    this.hasMore = true;
    this.loadingMessages = true;

    this.chatService.joinRoom(conversation.conversationId);

    this.chatService
      .getMessages(conversation.conversationId, this.page, this.limit)
      .subscribe({
        next: (res) => {
          this.messages = res.data || [];
          this.knownMessageIds = new Set(
            this.messages
              .map((m) => m.messageId)
              .filter((id) => !!id),
          );
          this.hydratePostContexts(this.messages);
          this.hasMore = !!res.hasMore;
          this.loadingMessages = false;
          this.shouldStickBottom = true;
          this.markCurrentConversationRead();
          this.maybeSendPostContextMessage();
        },
        error: (err) => {
          this.loadingMessages = false;
          this.error = err?.error?.message || "Không thể tải tin nhắn.";
        },
      });
  }

  loadOlderMessages(): void {
    if (!this.selectedConversation || !this.hasMore || this.loadingOlder)
      return;
    this.loadingOlder = true;
    const oldHeight = this.messageScroller?.nativeElement.scrollHeight || 0;

    const nextPage = this.page + 1;
    this.chatService
      .getMessages(
        this.selectedConversation.conversationId,
        nextPage,
        this.limit,
      )
      .subscribe({
        next: (res) => {
          const older = (res.data || []).filter(
            (m) => !this.knownMessageIds.has(m.messageId),
          );
          older.forEach((m) => this.knownMessageIds.add(m.messageId));
          this.messages = [...older, ...this.messages];
          this.hydratePostContexts(older);
          this.page = nextPage;
          this.hasMore = !!res.hasMore;
          this.loadingOlder = false;

          setTimeout(() => {
            const el = this.messageScroller?.nativeElement;
            if (!el) return;
            const newHeight = el.scrollHeight;
            el.scrollTop = newHeight - oldHeight + el.scrollTop;
          }, 0);
        },
        error: () => {
          this.loadingOlder = false;
        },
      });
  }

  onScrollMessages(e: Event): void {
    const target = e.target as HTMLDivElement;
    if (target.scrollTop <= 36) {
      this.loadOlderMessages();
    }
  }

  sendText(): void {
    if (!this.selectedConversation || this.sending) return;
    const content = this.draftMessage.trim();
    if (!content) return;

    this.sending = true;
    this.chatService.sendText(
      this.selectedConversation.conversationId,
      content,
    );
    this.draftMessage = "";
    this.sending = false;
    this.shouldStickBottom = true;
  }

  onPickImage(evt: Event): void {
    if (!this.selectedConversation || this.imageUploading) return;
    const input = evt.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.imageUploading = true;
    this.chatService.uploadChatImage(file).subscribe({
      next: (res) => {
        this.chatService.sendImage(
          this.selectedConversation!.conversationId,
          res.url,
        );
        this.imageUploading = false;
        input.value = "";
      },
      error: () => {
        this.imageUploading = false;
        input.value = "";
      },
    });
  }

  private openDirectConversationByUser(targetUserId: string): void {
    this.chatService.createOrGetDirectConversation(targetUserId).subscribe({
      next: (conversationId) => {
        if (!conversationId) return;
        this.pendingOpenConversationId = conversationId;

        const found = this.conversations.find(
          (c) => c.conversationId === conversationId,
        );
        if (found) {
          this.pendingOpenConversationId = "";
          this.openConversation(found);
          return;
        }

        this.loadConversations();
      },
      error: () => {
        this.error = "Không thể mở hội thoại mới.";
      },
    });
  }

  private maybeSendPostContextMessage(): void {
    if (!this.pendingPostContext || !this.selectedConversation) return;

    const { postId, postTitle } = this.pendingPostContext;
    const marker = `/items/${postId}`;
    const exists = this.messages.some(
      (m) => m.messageType === "TEXT" && (m.content || "").includes(marker),
    );

    if (!exists) {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const url = `${origin}/items/${postId}`;
      const contextMessage = `[Bài đang trao đổi] ${postTitle}: ${url}`;
      this.chatService.sendText(this.selectedConversation.conversationId, contextMessage);
    }

    this.pendingPostContext = null;
  }

  isMine(msg: ChatMessage): boolean {
    return msg.senderId === this.chatService.currentUserId;
  }

  formatTime(value: string | null): string {
    if (!value) return "";
    return new Date(value).toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
    });
  }

  userStatusLabel(conv: ConversationItem | null): string {
    const user = conv?.otherUser;
    if (!user) return "";
    if (user.isOnline) return "Đang hoạt động";
    if (!user.lastSeenAt) return "Offline";
    return `Hoạt động lần cuối ${this.formatTime(user.lastSeenAt)}`;
  }

  trackByConversation(_: number, item: ConversationItem): string {
    return item.conversationId;
  }

  trackByMessage(_: number, msg: ChatMessage): string {
    return msg.messageId;
  }

  isPostContextMessage(msg: ChatMessage): boolean {
    return this.postContextByMessageId.has(msg.messageId);
  }

  getPostContextPreview(msg: ChatMessage): PostContextPreview | null {
    return this.postContextByMessageId.get(msg.messageId) || null;
  }

  getPostTypeLabel(type: string | undefined): string {
    const t = String(type || "").toUpperCase();
    return t === "LOST" ? "Mất đồ" : "Nhặt được";
  }

  getPostTypeClass(type: string | undefined): string {
    const t = String(type || "").toUpperCase();
    return t === "LOST" ? "post-badge-lost" : "post-badge-found";
  }

  openPostContext(msg: ChatMessage): void {
    const preview = this.getPostContextPreview(msg);
    if (!preview?.postId) return;
    window.open(`/items/${preview.postId}`, "_blank");
  }

  private markCurrentConversationRead(): void {
    const conversationId = this.selectedConversation?.conversationId;
    if (!conversationId) return;

    this.chatService.markConversationRead(conversationId).subscribe({
      next: () => {
        this.chatService.markAsReadRealtime(conversationId);
        const idx = this.conversations.findIndex(
          (c) => c.conversationId === conversationId,
        );
        if (idx >= 0) this.conversations[idx].unreadCount = 0;
      },
    });
  }

  private patchConversationPreview(msg: ChatMessage): void {
    const idx = this.conversations.findIndex(
      (c) => c.conversationId === msg.conversationId,
    );
    if (idx < 0) return;

    const context = this.extractPostContext(msg.content);
    const preview =
      msg.messageType === "IMAGE"
        ? "[Hình ảnh]"
        : context
          ? `[Bài đăng] ${context.title}`
          : msg.content;
    const updated: ConversationItem = {
      ...this.conversations[idx],
      lastMessagePreview: preview,
      lastMessageAt: msg.createdAt,
      unreadCount:
        msg.receiverId === this.chatService.currentUserId &&
        this.selectedConversation?.conversationId !== msg.conversationId
          ? this.conversations[idx].unreadCount + 1
          : this.conversations[idx].unreadCount,
    };

    const next = [...this.conversations];
    next.splice(idx, 1);
    this.conversations = [updated, ...next];
  }

  private patchUserStatus(status: UserStatusEvent): void {
    this.conversations = this.conversations.map((conv) => {
      if (conv.otherUser?.userId !== status.userId) return conv;
      return {
        ...conv,
        otherUser: {
          ...conv.otherUser,
          isOnline: status.isOnline,
          lastSeenAt: status.lastSeenAt,
        },
      };
    });
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const el = this.messageScroller?.nativeElement;
      if (!el) return;
      el.scrollTop = el.scrollHeight;
    }, 0);
  }

  private hydratePostContexts(messages: ChatMessage[]): void {
    for (const msg of messages) {
      const payload = this.extractPostContext(msg.content);
      if (!payload) continue;

      const cached = this.postPreviewByPostId.get(payload.postId);
      if (cached) {
        this.postContextByMessageId.set(msg.messageId, cached);
        continue;
      }

      const fallback = this.buildFallbackPreview(payload);
      this.postContextByMessageId.set(msg.messageId, fallback);

      if (this.loadingPostPreviewIds.has(payload.postId)) continue;
      this.loadingPostPreviewIds.add(payload.postId);

      this.itemService.getItemById(payload.postId).subscribe({
        next: (item: Item) => {
          const enriched = this.enrichPreviewFromItem(payload, item);
          this.postPreviewByPostId.set(payload.postId, enriched);

          this.messages
            .filter((m) => this.extractPostContext(m.content)?.postId === payload.postId)
            .forEach((m) => this.postContextByMessageId.set(m.messageId, enriched));

          this.loadingPostPreviewIds.delete(payload.postId);
        },
        error: () => {
          this.loadingPostPreviewIds.delete(payload.postId);
        },
      });
    }
  }

  private extractPostContext(content: string): PostContextPayload | null {
    const text = String(content || "").trim();
    if (!text.startsWith("[Bài đang trao đổi]")) return null;

    const urlMatch = text.match(/https?:\/\/\S+\/items\/([a-f\d]{24})/i);
    const pathMatch = text.match(/\/items\/([a-f\d]{24})/i);
    const postId = (urlMatch?.[1] || pathMatch?.[1] || "").trim();
    if (!postId) return null;

    const titleMatch = text.match(/^\[Bài đang trao đổi\]\s*(.*?):\s*(?:https?:\/\/\S+|\/items\/\w+)/i);
    const title = (titleMatch?.[1] || "Bài đăng").trim();
    return { postId, title, url: `/items/${postId}` };
  }

  private buildFallbackPreview(payload: PostContextPayload): PostContextPreview {
    return {
      postId: payload.postId,
      title: payload.title,
      url: payload.url,
      imageUrl: "",
      category: "",
      location: "",
      postType: "",
    };
  }

  private enrichPreviewFromItem(payload: PostContextPayload, item: Item): PostContextPreview {
    return {
      postId: payload.postId,
      title: item?.title || payload.title,
      url: payload.url,
      imageUrl: Array.isArray(item?.images) ? item.images[0] || "" : "",
      category: item?.category || "",
      location: item?.location_text || "",
      postType: String((item?.type || item?.post_type || "") as PostType).toUpperCase(),
    };
  }
}
