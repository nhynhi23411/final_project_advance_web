import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
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

export interface MatchRateStats {
  labels: string[];
  rates: number[];
}

export interface ModerationWorkload {
  approved: number;
  rejected: number;
  pending: number;
  needsUpdate: number;
}

export interface PlatformHealthLog {
  _id: string;
  action: string;
  user_id?: { _id: string; username: string; email: string; name: string };
  reason?: string;
  createdAt: string;
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
}

export interface MonthlyNewUser {
  _id: string;
  name: string;
  email: string;
  created_at: string;
}

export interface MonthlyNewPost {
  _id: string;
  title: string;
  category: string;
  post_type: string;
  status: string;
  createdAt: string;
}

export interface MonthlyClaim {
  _id: string;
  status: string;
  target_post_id: string;
  claimant_user_id: string;
  created_at: string;
}

export interface PaginatedMonthlyResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
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

export interface BlacklistedKeyword {
  _id: string;
  keyword: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AlgorithmWeights {
  category: number;
  text: number;
  location: number;
  time: number;
  attributes: number;
}

export interface UpdateWeightsResponse {
  message: string;
  weights: AlgorithmWeights;
}

export type AdminMatchReviewStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED';

export interface AdminMatchPostSummary {
  _id: string;
  title?: string;
  description?: string;
  category?: string;
  post_type?: string;
  status?: string;
  location?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  images?: string[];
  createdAt?: string;
}

export interface AdminMatchRow {
  _id: string;
  lost_post_id: AdminMatchPostSummary | string;
  found_post_id: AdminMatchPostSummary | string;
  score?: number;
  score_percent?: number;
  confidence_score: number;
  text_score?: number | null;
  distance_km?: number | null;
  source?: string;
  status?: string;
  review_status?: AdminMatchReviewStatus;
  created_at?: string;
  updated_at?: string;
}

export interface AdminMatchesPage {
  items: AdminMatchRow[];
  page: number;
  limit: number;
  total: number;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.baseUrl}/admin/dashboard-stats`);
  }

  getGrowthStats(months = 12): Observable<GrowthStats> {
    return this.http.get<GrowthStats>(`${this.baseUrl}/admin/stats/growth`, {
      params: { months: String(months) }
    });
  }

  getMatchRateStats(months = 12): Observable<MatchRateStats> {
    return this.http.get<MatchRateStats>(`${this.baseUrl}/admin/stats/match-rate`, {
      params: { months: String(months) }
    });
  }

  getModerationWorkload(): Observable<ModerationWorkload> {
    return this.http.get<ModerationWorkload>(`${this.baseUrl}/admin/stats/moderation-workload`);
  }

  getPlatformHealth(): Observable<PlatformHealthLog[]> {
    return this.http.get<PlatformHealthLog[]>(`${this.baseUrl}/admin/stats/platform-health`);
  }

  getStatsByCategory(): Observable<CategoryStat[]> {
    return this.http.get<CategoryStat[]>(`${this.baseUrl}/admin/stats/by-category`);
  }

  getMonthlyReport(year: number, month: number): Observable<MonthlyReport> {
    return this.http.get<MonthlyReport>(`${this.baseUrl}/admin/reports/monthly`, {
      params: { year: String(year), month: String(month) }
    });
  }

  getMonthlyUsers(year: number, month: number, page: number = 1, limit: number = 10): Observable<PaginatedMonthlyResponse<MonthlyNewUser>> {
    return this.http.get<PaginatedMonthlyResponse<MonthlyNewUser>>(`${this.baseUrl}/admin/reports/monthly/users`, {
      params: { year: String(year), month: String(month), page: String(page), limit: String(limit) }
    });
  }

  getMonthlyPosts(year: number, month: number, page: number = 1, limit: number = 10): Observable<PaginatedMonthlyResponse<MonthlyNewPost>> {
    return this.http.get<PaginatedMonthlyResponse<MonthlyNewPost>>(`${this.baseUrl}/admin/reports/monthly/posts`, {
      params: { year: String(year), month: String(month), page: String(page), limit: String(limit) }
    });
  }

  getMonthlyClaims(year: number, month: number, page: number = 1, limit: number = 10): Observable<PaginatedMonthlyResponse<MonthlyClaim>> {
    return this.http.get<PaginatedMonthlyResponse<MonthlyClaim>>(`${this.baseUrl}/admin/reports/monthly/claims`, {
      params: { year: String(year), month: String(month), page: String(page), limit: String(limit) }
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

  getPostCountsByStatus(): Observable<Record<string, number>> {
    return this.http.get<Record<string, number>>(`${this.baseUrl}/admin/posts/counts`);
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

  // ─── System Config: Blacklist ────────────────────────────────────────────────

  getBlacklistedKeywords(): Observable<BlacklistedKeyword[]> {
    return this.http.get<BlacklistedKeyword[]>(`${this.baseUrl}/admin/system-config/blacklist`);
  }

  createBlacklistedKeyword(keyword: string): Observable<BlacklistedKeyword> {
    return this.http.post<BlacklistedKeyword>(`${this.baseUrl}/admin/system-config/blacklist`, { keyword });
  }

  updateBlacklistedKeyword(id: string, dto: { keyword?: string; is_active?: boolean }): Observable<BlacklistedKeyword> {
    return this.http.patch<BlacklistedKeyword>(`${this.baseUrl}/admin/system-config/blacklist/${id}`, dto);
  }

  toggleBlacklistedKeyword(id: string, is_active: boolean): Observable<BlacklistedKeyword> {
    return this.http.patch<BlacklistedKeyword>(`${this.baseUrl}/admin/system-config/blacklist/${id}/toggle`, { is_active });
  }

  deleteBlacklistedKeyword(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/admin/system-config/blacklist/${id}`);
  }

  // ─── System Config: Algorithm Weights ───────────────────────────────────────

  getAlgorithmWeights(): Observable<AlgorithmWeights> {
    return this.http.get<AlgorithmWeights>(`${this.baseUrl}/admin/system-config/weights`);
  }

  updateAlgorithmWeights(weights: AlgorithmWeights): Observable<UpdateWeightsResponse> {
    return this.http.patch<UpdateWeightsResponse>(`${this.baseUrl}/admin/system-config/weights`, weights);
  }

  // ─── Match management ───────────────────────────────────────────────────────

  getMatches(params?: {
    page?: number;
    limit?: number;
    status?: AdminMatchReviewStatus | '';
    minConfidence?: number;
    maxConfidence?: number;
  }): Observable<AdminMatchesPage> {
    const p: Record<string, string> = {};
    if (params?.page != null) p['page'] = String(params.page);
    if (params?.limit != null) p['limit'] = String(params.limit);
    if (params?.status) p['status'] = params.status;
    if (params?.minConfidence != null) p['minConfidence'] = String(params.minConfidence);
    if (params?.maxConfidence != null) p['maxConfidence'] = String(params.maxConfidence);
    return this.http.get<AdminMatchesPage>(`${this.baseUrl}/admin/matches`, { params: p });
  }

  updateMatchReviewStatus(
    id: string,
    status: 'CONFIRMED' | 'REJECTED'
  ): Observable<AdminMatchRow> {
    return this.http.patch<AdminMatchRow>(`${this.baseUrl}/admin/matches/${id}/status`, { status });
  }
}

