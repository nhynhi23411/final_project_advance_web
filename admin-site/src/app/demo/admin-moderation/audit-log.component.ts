import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { PageTitleComponent } from 'src/app/theme/shared/components/page-title/page-title.component';

interface AuditLogEntry {
  _id: string;
  action: string;
  reason?: string;
  createdAt: string;
  post_id?: {
    _id: string;
    title: string;
    status: string;
  };
  user_id?: {
    _id: string;
    username: string;
    email: string;
    name: string;
  };
  performed_by_user_id?: {
    _id: string;
    username: string;
    email: string;
    name: string;
  };
}

interface AuditLogResponse {
  message: string;
  data: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

@Component({
  selector: 'app-audit-log',
  templateUrl: './audit-log.component.html',
  styleUrls: ['./audit-log.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, PageTitleComponent],
})
export class AuditLogComponent implements OnInit {
  logs: AuditLogEntry[] = [];
  isLoading = false;
  error: string | null = null;

  // Pagination & Filtering
  currentPage = 1;
  pageSize = 20;
  totalPages = 1;
  totalRecords = 0;

  filterAction = '';
  filterUserId = '';
  filterPerformedBy = '';

  actionOptions = [
    'REJECT_POST',
    'BAN_USER',
    'UNBAN_USER',
    'UPDATE_POST',
    'DELETE_POST',
  ];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadLogs();
  }

  loadLogs(): void {
    this.isLoading = true;
    this.error = null;

    const params: any = {
      page: this.currentPage,
      limit: this.pageSize,
    };

    if (this.filterAction) params.action = this.filterAction;
    if (this.filterUserId) params.userId = this.filterUserId;
    if (this.filterPerformedBy) params.performed_by_user_id = this.filterPerformedBy;

    const queryString = new URLSearchParams(params).toString();
    const url = `${environment.apiUrl}/admin/audit-logs?${queryString}`;

    this.http.get<AuditLogResponse>(url).subscribe({
      next: (response) => {
        this.logs = response.data || [];
        this.totalRecords = response.total;
        this.totalPages = response.pages;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading audit logs:', err);
        this.error = 'Không thể tải nhật ký hoạt động. Vui lòng thử lại.';
        this.isLoading = false;
      },
    });
  }

  onFilterChange(): void {
    this.currentPage = 1; // Reset to first page
    this.loadLogs();
  }

  onPageChange(newPage: number): void {
    if (newPage >= 1 && newPage <= this.totalPages) {
      this.currentPage = newPage;
      this.loadLogs();
    }
  }

  getActionLabel(action: string): string {
    const labels: Record<string, string> = {
      REJECT_POST: 'Từ chối bài đăng',
      BAN_USER: 'Auto-ban',
      UNBAN_USER: 'Bỏ cấm người dùng',
      UPDATE_POST: 'Cập nhật bài đăng',
      DELETE_POST: 'Xóa bài đăng',
    };
    return labels[action] || action;
  }

  getActionClass(action: string): string {
    const classes: Record<string, string> = {
      REJECT_POST: 'action-reject',
      BAN_USER: 'action-ban',
      UNBAN_USER: 'action-unban',
      UPDATE_POST: 'action-update',
      DELETE_POST: 'action-delete',
    };
    return classes[action] || 'action-default';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN');
  }

  getPerformedByUser(log: AuditLogEntry): string {
    if (log.performed_by_user_id) {
      return log.performed_by_user_id.name || log.performed_by_user_id.username;
    }
    return 'Hệ thống';
  }

  getViolatedUser(log: AuditLogEntry): string {
    if (log.user_id) {
      return log.user_id.name || log.user_id.username;
    }
    return '--';
  }

  getRelatedPost(log: AuditLogEntry): string {
    if (log.post_id) return log.post_id.title;
    return '--';
  }
}
