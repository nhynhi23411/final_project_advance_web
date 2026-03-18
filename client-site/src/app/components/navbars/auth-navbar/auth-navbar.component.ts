import { Component, OnDestroy, OnInit, HostListener } from "@angular/core";
import { Router } from "@angular/router";
import { Subscription } from "rxjs";
import { AuthService } from "../../../services/auth.service";
import { NotificationService, ApiNotification } from "../../../services/notification.service";

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
  notifOpen = false;
  notifications: NavbarNotification[] = [];
  notifLoading = false;
  private authSubscription?: Subscription;

  constructor(
    public authService: AuthService,
    private readonly router: Router,
    public notificationService: NotificationService
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

  logout(): void {
    this.authService.logout();
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

  @HostListener("document:click", ["$event"])
  onDocumentClick(e: Event): void {
    const target = e.target as HTMLElement;
    if (!target.closest(".app-nav-user-wrap")) this.userMenuOpen = false;
    if (!target.closest(".app-nav-notif-wrap")) this.notifOpen = false;
  }
}
