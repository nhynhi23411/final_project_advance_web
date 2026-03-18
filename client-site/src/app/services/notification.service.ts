import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { BehaviorSubject, Observable, Subscription, interval, of } from "rxjs";
import { startWith, switchMap, catchError, map } from "rxjs/operators";
import { environment } from "../../environments/environment";
import { AuthService } from "./auth.service";

export interface ApiNotification {
  _id: string;
  title: string;
  message: string;
  notification_type: string;
  /** Post id (string) or populated object from API */
  related_post_id?: string | { _id?: string };
  is_read?: boolean;
  created_at?: string;
  sender_user_id?: { name?: string; username?: string };
}

export interface NotificationsResponse {
  notifications: ApiNotification[];
  unreadCount: number;
}

@Injectable({ providedIn: "root" })
export class NotificationService {
  private readonly base = `${environment.apiUrl}/notifications`;
  private unreadCount = new BehaviorSubject<number>(0);
  unreadCount$ = this.unreadCount.asObservable();
  private pollingSubscription: Subscription | null = null;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    this.authService.isLoggedIn$.subscribe((isLoggedIn) => {
      if (!isLoggedIn) {
        this.unreadCount.next(0);
        this.stopPolling();
      } else {
        this.startPolling();
      }
    });
  }

  /** Poll every 30s; start immediately. Only runs when user is logged in. */
  private startPolling(): void {
    this.stopPolling();
    this.pollingSubscription = interval(30000)
      .pipe(
        startWith(0),
        switchMap(() => this.fetchUnreadCount())
      )
      .subscribe((count) => this.unreadCount.next(count));
  }

  private stopPolling(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = null;
    }
  }

  /** GET /notifications/unread-count → number */
  private fetchUnreadCount(): Observable<number> {
    return this.http.get<{ unreadCount: number }>(`${this.base}/unread-count`).pipe(
      map((res) => res.unreadCount ?? 0),
      catchError(() => of(0))
    );
  }

  /** One-shot refresh of unread count (e.g. after mark all read). */
  refreshUnreadCount(): void {
    if (!this.authService.isLoggedIn) {
      this.unreadCount.next(0);
      return;
    }
    this.fetchUnreadCount().subscribe((count) => this.unreadCount.next(count));
  }

  /** GET /notifications — full list and unread count. */
  getNotifications(unreadOnly = false): Observable<NotificationsResponse> {
    const params = unreadOnly ? { unreadOnly: "true" } : {};
    return this.http.get<NotificationsResponse>(this.base, { params });
  }

  /** PATCH /notifications/mark-all-read — mark all as read, then refresh count. */
  markAllAsRead(): void {
    if (!this.authService.isLoggedIn) return;
    this.http.patch<{ message: string }>(`${this.base}/mark-all-read`, {}).subscribe({
      next: () => this.unreadCount.next(0),
      error: () => {},
    });
  }

  /** PATCH /notifications/:id/read — mark one as read. */
  markAsRead(notificationId: string): Observable<unknown> {
    return this.http.patch(`${this.base}/${notificationId}/read`, {});
  }
}
