import { Component, OnDestroy, OnInit, HostListener } from "@angular/core";
import { Router } from "@angular/router";
import { forkJoin, Subscription } from "rxjs";
import { AuthService } from "../../../services/auth.service";
import { Item, ItemService, MatchSuggestion } from "../../../services/item.service";

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
  notifOpen = false;
  notifications: NavbarNotification[] = [];
  notifLoading = false;
  private authSubscription?: Subscription;
  private readonly notificationStoragePrefix = "navbar_notifications_seen";

  constructor(
    public authService: AuthService,
    private readonly itemService: ItemService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.authSubscription = this.authService.isLoggedIn$.subscribe((isLoggedIn) => {
      if (!isLoggedIn) {
        this.notifications = [];
        this.notifOpen = false;
        return;
      }
      this.loadNotifications();
    });
  }

  ngOnDestroy(): void {
    this.authSubscription?.unsubscribe();
  }

  get notifCount(): number {
    return this.notifications.filter((notification) => !notification.isRead).length;
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
    this.markNotificationAsRead(notification.id);
    this.notifOpen = false;
    this.router.navigate(["/items", notification.targetPostId]);
  }

  logout(): void {
    this.authService.logout();
  }

  private loadNotifications(): void {
    if (!this.authService.isLoggedIn) return;

    this.notifLoading = true;
    forkJoin({
      items: this.itemService.getMyItems(),
      suggestions: this.itemService.getMatchSuggestions(),
    }).subscribe({
      next: ({ items, suggestions }) => {
        const notifications = [
          ...this.buildApprovedNotifications(items),
          ...this.buildMatchNotifications(suggestions),
        ].sort(
          (left, right) =>
            new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime()
        );
        this.initializeSeenNotifications(notifications);
        const seenNotificationIds = this.getSeenNotificationIds();
        this.notifications = notifications.map((notification) => ({
          ...notification,
          isRead: seenNotificationIds.has(notification.id),
        }));
        this.notifLoading = false;
      },
      error: () => {
        this.notifications = [];
        this.notifLoading = false;
      },
    });
  }

  private buildApprovedNotifications(items: Item[]): NavbarNotification[] {
    return (Array.isArray(items) ? items : [])
      .filter((item) => item?._id && item.status === "APPROVED")
      .map((item) => {
        const approvedDate = this.getApprovedDate(item);
        return {
          id: `approved-${item._id}`,
          targetPostId: item._id,
          title: "Bài đăng của bạn đã được duyệt",
          message: `${item.title} vừa được duyệt. Bấm để xem bài đăng.`,
          occurredAt: approvedDate?.toISOString() || new Date(0).toISOString(),
          isRead: true,
        };
      });
  }

  private buildMatchNotifications(suggestions: MatchSuggestion[]): NavbarNotification[] {
    return (Array.isArray(suggestions) ? suggestions : [])
      .filter(
        (suggestion) =>
          suggestion?._id &&
          suggestion?.matched_post?._id &&
          (suggestion?.my_post?.type || suggestion?.my_post?.post_type) === "LOST"
      )
      .map((suggestion) => ({
        id: `match-${suggestion._id}`,
        targetPostId: suggestion.matched_post!._id,
        title: "Có gợi ý từ người đang giữ đồ",
        message: `${suggestion.matched_post?.title || "Một bài nhặt được"} có thể là món đồ bạn đang tìm. Bấm để xem bài đăng của Finder.`,
        occurredAt: suggestion.created_at || new Date(0).toISOString(),
        isRead: true,
      }));
  }

  private getApprovedDate(item: Item): Date | null {
    const rawDate = item.approved_at || item.updated_at || item.created_at;
    if (!rawDate) return null;
    const parsedDate = new Date(rawDate);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  }

  private getSeenStorageKey(): string | null {
    const userId = this.authService.currentUserId;
    return userId ? `${this.notificationStoragePrefix}:${userId}` : null;
  }

  private getSeenNotificationIds(): Set<string> {
    const storageKey = this.getSeenStorageKey();
    if (!storageKey) return new Set<string>();

    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return new Set<string>();
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return new Set<string>();
      return new Set<string>(parsed.filter((value): value is string => typeof value === "string"));
    } catch {
      return new Set<string>();
    }
  }

  private initializeSeenNotifications(notifications: NavbarNotification[]): void {
    const storageKey = this.getSeenStorageKey();
    if (!storageKey) return;

    try {
      if (localStorage.getItem(storageKey) !== null) return;
      localStorage.setItem(
        storageKey,
        JSON.stringify(notifications.map((notification) => notification.id))
      );
    } catch {
      // Ignore storage errors and continue without persisted notification state.
    }
  }

  private markNotificationAsRead(notificationId: string): void {
    const storageKey = this.getSeenStorageKey();
    if (!storageKey) return;

    const seenNotificationIds = this.getSeenNotificationIds();
    if (seenNotificationIds.has(notificationId)) return;

    seenNotificationIds.add(notificationId);
    try {
      localStorage.setItem(storageKey, JSON.stringify(Array.from(seenNotificationIds)));
    } catch {
      return;
    }

    this.notifications = this.notifications.map((notification) =>
      notification.id === notificationId
        ? { ...notification, isRead: true }
        : notification
    );
  }

  @HostListener("document:click", ["$event"])
  onDocumentClick(e: Event): void {
    const target = e.target as HTMLElement;
    if (!target.closest(".app-nav-user-wrap")) this.userMenuOpen = false;
    if (!target.closest(".app-nav-notif-wrap")) this.notifOpen = false;
  }
}
