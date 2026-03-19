import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, AuditLogEntry } from 'src/app/services/admin.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './audit-log.component.html',
  styleUrls: ['./audit-log.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditLogComponent implements OnInit, OnDestroy {
  logs: AuditLogEntry[] = [];
  isLoading = false;
  error = '';
  responseTimeMs = 0;

  readonly pageSize = 50;
  skip = 0;
  hasMore = false;

  filterUserId = '';
  filterAction = '';

  actionOptions = [
    { value: '', label: 'Tất cả hành động' },
    { value: 'REJECT_POST', label: 'Từ chối bài đăng' },
    { value: 'BAN_USER', label: 'Tự động khóa tài khoản' },
  ];

  private activeRequest: Subscription | null = null;
  private userFilterDebounceTimer: any = null;

  constructor(private readonly adminService: AdminService) {}

  ngOnInit(): void {
    this.filterUserId = '';
    this.filterAction = '';
    this.skip = 0;
    this.loadLogs(true);
  }

  loadLogs(forceRefresh = false): void {
    if (this.activeRequest) {
      this.activeRequest.unsubscribe();
      this.activeRequest = null;
    }

    this.isLoading = true;
    this.error = '';
    const startedAt = performance.now();

    this.activeRequest = this.adminService
      .getAuditLogs(this.filterUserId, this.skip, this.filterAction, {
        forceRefresh,
      })
      .subscribe({
      next: (rows) => {
        this.logs = rows || [];
        this.hasMore = this.logs.length === this.pageSize;
        this.responseTimeMs = Math.round(performance.now() - startedAt);
        this.isLoading = false;
      },
      error: () => {
        this.error = 'Không tải được nhật ký hoạt động.';
        this.isLoading = false;
      },
    });
  }

  ngOnDestroy(): void {
    if (this.activeRequest) {
      this.activeRequest.unsubscribe();
    }
    if (this.userFilterDebounceTimer) {
      clearTimeout(this.userFilterDebounceTimer);
    }
  }

  onUserIdInputChange(): void {
    if (this.userFilterDebounceTimer) {
      clearTimeout(this.userFilterDebounceTimer);
    }
    this.userFilterDebounceTimer = setTimeout(() => {
      this.applyFilters();
    }, 350);
  }

  onActionChange(): void {
    this.applyFilters();
  }

  applyFilters(): void {
    this.skip = 0;
    this.loadLogs();
  }

  clearFilters(): void {
    this.filterUserId = '';
    this.filterAction = '';
    this.applyFilters();
  }

  previousPage(): void {
    if (this.skip === 0) return;
    this.skip = Math.max(0, this.skip - this.pageSize);
    this.loadLogs();
  }

  nextPage(): void {
    if (!this.hasMore) return;
    this.skip += this.pageSize;
    this.loadLogs();
  }

  getActionClass(action: string): string {
    if (action === 'REJECT_POST') return 'action-reject';
    if (action === 'BAN_USER') return 'action-auto-ban';
    return 'action-default';
  }

  getActionLabel(action: string): string {
    if (action === 'BAN_USER') return 'TỰ ĐỘNG KHÓA';
    if (action === 'REJECT_POST') return 'TỪ CHỐI BÀI';
    return 'HÀNH ĐỘNG KHÁC';
  }

  getViolatedUser(log: AuditLogEntry): string {
    if (!log.user_id) return '--';
    return log.user_id.username || log.user_id.email || log.user_id.name || '--';
  }

  getRelatedPost(log: AuditLogEntry): string {
    return log.post_id?.title || '--';
  }

  getAdminUser(log: AuditLogEntry): string {
    if (!log.performed_by_user_id) return 'Hệ thống';
    return log.performed_by_user_id.username || log.performed_by_user_id.email || 'Admin';
  }

  formatDate(value: string): string {
    if (!value) return '--';
    return new Date(value).toLocaleString('vi-VN');
  }

  trackByLogId(_: number, log: AuditLogEntry): string {
    return log._id;
  }
}
