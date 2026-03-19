import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { PostStatus } from 'src/app/theme/shared/components/status-badge/status-badge.component';

export interface Item {
  _id?: string;
  id?: string | number;
  title?: string;
  description?: string;
  category?: string;
  status?: PostStatus;
  createdAt?: string | Date;
  created_at?: string | Date;
  updatedAt?: string | Date;
  updated_at?: string | Date;
  isUpdating?: boolean;
  [key: string]: any;
}

export interface DashboardStats {
  totalUsers: number;
  activePosts: number;
  resolvedClaims: number;
  pendingAdmin: number;
  approvedLostCount?: number;
  matchRate?: number;
}

export interface GrowthStats {
  labels: string[];
  users: number[];
  posts: number[];
}

export interface CategoryStat {
  category: string;
  count: number;
}

export interface MonthlyReport {
  year: number;
  month: number;
  summary: {
    newUsersCount: number;
    newPostsCount: number;
    newClaimsCount: number;
    successfulClaimsCount: number;
    approvedPostsCount: number;
  };
  newUsers: { _id: string; name: string; email: string; created_at: string }[];
  newPosts: { _id: string; title: string; category: string; post_type: string; status: string; createdAt: string }[];
  claims: { _id: string; status: string; target_post_id: string; claimant_user_id: string; created_at: string }[];
}

export interface AdminUser {
  _id: string;
  username: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  status?: string;
  created_at?: string;
}

export interface AuditLogUser {
  _id: string;
  username: string;
  email?: string;
  name?: string;
}

export interface AuditLogPost {
  _id: string;
  title: string;
}

export interface AuditLogEntry {
  _id: string;
  action: string;
  reason?: string;
  createdAt: string;
  user_id?: AuditLogUser | null;
  post_id?: AuditLogPost | null;
  performed_by_user_id?: AuditLogUser | null;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private baseUrl = environment.apiUrl;
  private readonly auditLogCache = new Map<string, { expiresAt: number; data: AuditLogEntry[] }>();
  private readonly auditLogCacheTtlMs = 15000;

  constructor(private http: HttpClient) { }

  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.baseUrl}/admin/dashboard-stats`);
  }

  getGrowthStats(months = 12): Observable<GrowthStats> {
    return this.http.get<GrowthStats>(`${this.baseUrl}/admin/stats/growth`, {
      params: { months: String(months) }
    });
  }

  getStatsByCategory(): Observable<CategoryStat[]> {
    return this.http.get<CategoryStat[]>(`${this.baseUrl}/admin/stats/by-category`);
  }

  getMonthlyReport(year: number, month: number): Observable<MonthlyReport> {
    return this.http.get<MonthlyReport>(`${this.baseUrl}/admin/reports/monthly`, {
      params: { year: String(year), month: String(month) }
    });
  }

  getUsers(skip = 0, limit = 50): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(`${this.baseUrl}/admin/users`, {
      params: { skip: String(skip), limit: String(limit) }
    });
  }

  createUser(dto: { name: string; username: string; email: string; password: string; phone: string; role?: string }): Observable<{ message: string; user: AdminUser }> {
    return this.http.post<{ message: string; user: AdminUser }>(`${this.baseUrl}/admin/users`, dto);
  }

  updateUser(id: string, dto: { name?: string; email?: string; phone?: string; role?: string }): Observable<{ message: string; user: AdminUser }> {
    return this.http.patch<{ message: string; user: AdminUser }>(`${this.baseUrl}/admin/users/${id}`, dto);
  }

  updateUserStatus(id: string, status: 'ACTIVE' | 'INACTIVE' | 'BANNED'): Observable<{ message: string; status: string }> {
    return this.http.patch<{ message: string; status: string }>(`${this.baseUrl}/admin/users/${id}/status`, { status });
  }

  deleteUser(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/admin/users/${id}`);
  }

  getAuditLogs(
    userId = '',
    skip = 0,
    action = '',
    options?: { forceRefresh?: boolean },
  ): Observable<AuditLogEntry[]> {
    const params: Record<string, string> = {
      skip: String(Math.max(0, skip)),
    };

    if (userId.trim()) params['userId'] = userId.trim();
    if (action.trim()) params['action'] = action.trim();

    const cacheKey = JSON.stringify(params);
    const now = Date.now();
    const cached = this.auditLogCache.get(cacheKey);
    if (!options?.forceRefresh && cached && cached.expiresAt > now) {
      return of(cached.data);
    }

    return this.http
      .get<AuditLogEntry[]>(`${this.baseUrl}/admin/audit-logs`, {
        params,
      })
      .pipe(
        tap((data) => {
          this.auditLogCache.set(cacheKey, {
            data: data || [],
            expiresAt: now + this.auditLogCacheTtlMs,
          });
        }),
      );
  }

  getPendingItems(): Observable<Item[]> {
    return this.http.get<Item[]>(`${this.baseUrl}/admin/posts`, {
      params: { status: 'PENDING_ADMIN' }
    });
  }

  getApprovedItems(): Observable<Item[]> {
    return this.http.get<Item[]>(`${this.baseUrl}/admin/posts`, {
      params: { status: 'APPROVED' }
    });
  }

  getNeedsUpdateItems(): Observable<Item[]> {
    return this.http.get<Item[]>(`${this.baseUrl}/admin/posts`, {
      params: { status: 'NEEDS_UPDATE' }
    });
  }

  getRejectedItems(): Observable<Item[]> {
    return this.http.get<Item[]>(`${this.baseUrl}/admin/posts`, {
      params: { status: 'REJECTED' }
    });
  }

  /** Get posts with optional status (use 'all' for all) and filters. */
  getPosts(params?: {
    status?: string;
    category?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Observable<Item[]> {
    const p: Record<string, string> = {};
    if (params?.status != null) p['status'] = params.status;
    if (params?.category?.trim()) p['category'] = params.category.trim();
    if (params?.dateFrom) p['dateFrom'] = params.dateFrom;
    if (params?.dateTo) p['dateTo'] = params.dateTo;
    return this.http.get<Item[]>(`${this.baseUrl}/admin/posts`, { params: p });
  }

  /** Admin override: update post content (title, description, category). */
  updatePost(id: string, dto: { title?: string; description?: string; category?: string }): Observable<Item> {
    return this.http.patch<Item>(`${this.baseUrl}/admin/posts/${id}`, dto);
  }

  /** Soft delete post (sets status to ARCHIVED). */
  deletePost(id: string): Observable<Item> {
    return this.http.delete<Item>(`${this.baseUrl}/admin/posts/${id}`);
  }

  changeStatus(
    id: string | number,
    status: PostStatus,
    reason?: string
  ): Observable<any> {
    const body: any = { status };
    if (reason && reason.trim()) {
      body.reject_reason = reason.trim();
    }
    return this.http.patch(`${this.baseUrl}/admin/posts/${id}/status`, body);
  }
}

