import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { PostStatus } from 'src/app/theme/shared/components/status-badge/status-badge.component';

export interface Item {
  _id?: string;
  id?: string | number;
  title?: string;
  status?: PostStatus;
  isUpdating?: boolean;
  [key: string]: any;
}

export interface DashboardStats {
  totalUsers: number;
  activePosts: number;
  resolvedClaims: number;
  pendingAdmin: number;
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

@Injectable({ providedIn: 'root' })
export class AdminService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.baseUrl}/admin/dashboard-stats`);
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

