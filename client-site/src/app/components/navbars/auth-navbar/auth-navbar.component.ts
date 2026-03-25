import { Component, OnDestroy, OnInit, HostListener } from "@angular/core";
import { NavigationEnd, Router } from "@angular/router";
import { Subscription } from "rxjs";
import { filter } from "rxjs/operators";
import { AuthService } from "../../../services/auth.service";
import { NotificationService, ApiNotification } from "../../../services/notification.service";
import { ChatMessage, ChatService } from "../../../services/chat.service";
import { ToastService } from "../../../services/toast.service";

/** Item shown in navbar notification dropdown — from server API. */
interface NavbarNotification {
  id: string;
  targetPostId: string;
  title: string;
  message: string;
  occurredAt: string;
  isRead: boolean;
}

@Component({
  selector: "app-auth-navbar",
  templateUrl: "./auth-navbar.component.html",
})
export class AuthNavbarComponent implements OnInit {
  navbarOpen = false;
  userMenuOpen = false;
  showLogoutModal = false;
  notifOpen = false;
  chatUnreadCount = 0;
  notifications: NavbarNotification[] = [];
  notifLoading = false;
  private authSubscription?: Subscription;
  private chatSubscriptions: Subscription[] = [];

  constructor(
    public authService: AuthService,
    private readonly router: Router,
    public notificationService: NotificationService,
    private readonly chatService: ChatService,
    private readonly toastService: ToastService,
  ) {}

  ngOnInit(): void {
    this.authSubscription = this.authService.isLoggedIn$.subscribe((isLoggedIn) => {
      if (!isLoggedIn) {
        this.notifications = [];
        this.notifOpen = false;
        this.chatUnreadCount = 0;
        this.teardownChatRealtime();
        return;
      }
      this.loadNotifications();
      this.setupChatRealtime();
      this.refreshChatUnreadCount();
    });
  }

  ngOnDestroy(): void {
    this.authSubscription?.unsubscribe();
    this.teardownChatRealtime();
  }

  setNavbarOpen(): void {
    this.navbarOpen = !this.navbarOpen;
  }

  toggleUserMenu(): void {
    this.userMenuOpen = !this.userMenuOpen;
  }

  closeUserMenu(): void {
    this.userMenuOpen = false;
  }

  toggleNotif(): void {
    this.notifOpen = !this.notifOpen;
    if (this.notifOpen) {
      this.loadNotifications();
    }
  }

  openNotification(notification: NavbarNotification): void {
    this.notificationService.markAsRead(notification.id).subscribe({
      next: () => this.notificationService.refreshUnreadCount(),
    });
    this.notifications = this.notifications.map((n) =>
      n.id === notification.id ? { ...n, isRead: true } : n
    );
    this.notifOpen = false;
    this.router.navigate(["/items", notification.targetPostId]);
  }

  openLogoutModal(): void {
    this.showLogoutModal = true;
    this.closeUserMenu();
  }

  closeLogoutModal(): void {
    this.showLogoutModal = false;
  }

  confirmLogout(): void {
    this.showLogoutModal = false;
    this.authService.logout();
    this.router.navigate(["/"]);
  }

  onChatLinkClick(): void {
    this.notifOpen = false;
  }

  /** Load notifications from server API (claim, match_suggestion, post_approved, post_needs_update, post_rejected). */
  private loadNotifications(): void {
    if (!this.authService.isLoggedIn) return;

    this.notifLoading = true;
    this.notificationService.getNotifications(false).subscribe({
      next: (res) => {
        this.notifications = this.mapApiToNavbar(res.notifications ?? []);
        this.notifLoading = false;
      },
      error: () => {
        this.notifications = [];
        this.notifLoading = false;
      },
    });
  }

  private mapApiToNavbar(list: ApiNotification[]): NavbarNotification[] {
    return list.map((n) => ({
      id: n._id,
      targetPostId: this.getPostId(n.related_post_id),
      title: n.title ?? "",
      message: n.message ?? "",
      occurredAt: n.created_at ?? new Date(0).toISOString(),
      isRead: !!n.is_read,
    }));
  }

  private getPostId(related: string | { _id?: string } | undefined): string {
    if (!related) return "";
    if (typeof related === "string") return related;
    return (related as { _id?: string })._id ?? "";
  }

  private setupChatRealtime(): void {
    if (this.chatSubscriptions.length > 0) {
      return;
    }

    this.chatService.connect();

    const newMessageSub = this.chatService.onNewMessage().subscribe((message) => {
      this.handleIncomingChatMessage(message);
    });

    const routeSub = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        if (this.isOnChatRoute()) {
          this.refreshChatUnreadCount();
        }
      });

    this.chatSubscriptions.push(newMessageSub, routeSub);
  }

  private teardownChatRealtime(): void {
    this.chatSubscriptions.forEach((sub) => sub.unsubscribe());
    this.chatSubscriptions = [];
    this.chatService.disconnect();
  }

  private handleIncomingChatMessage(message: ChatMessage): void {
    const currentUserId = this.chatService.currentUserId;
    if (!currentUserId) return;

    const isMine = message.senderId === currentUserId;
    const isIncoming = message.receiverId === currentUserId;
    if (isMine || !isIncoming) return;

    if (this.isOnChatRoute()) {
      this.refreshChatUnreadCount();
      return;
    }

    this.chatUnreadCount += 1;
    this.toastService.info("Bạn vừa nhận được 1 tin nhắn mới", "Tin nhắn mới", 3500);
  }

  private refreshChatUnreadCount(): void {
    if (!this.authService.isLoggedIn) {
      this.chatUnreadCount = 0;
      return;
    }

    this.chatService.getConversations().subscribe({
      next: (conversations) => {
        this.chatUnreadCount = conversations.reduce(
          (sum, conversation) => sum + (conversation.unreadCount || 0),
          0,
        );
      },
      error: () => {
        this.chatUnreadCount = 0;
      },
    });
  }

  private isOnChatRoute(): boolean {
    return this.router.url.startsWith("/chat");
  }

  @HostListener("document:click", ["$event"])
  onDocumentClick(e: Event): void {
    const target = e.target as HTMLElement;
    if (!target.closest(".app-nav-user-wrap")) this.userMenuOpen = false;
    if (!target.closest(".app-nav-notif-wrap")) this.notifOpen = false;
  }
}
