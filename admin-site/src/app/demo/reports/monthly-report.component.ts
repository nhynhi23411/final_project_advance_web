import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { SharedModule } from 'src/app/theme/shared/shared.module';
import { AdminService, MonthlyReport } from 'src/app/services/admin.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-monthly-report',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './monthly-report.component.html',
  styleUrls: ['./monthly-report.component.scss']
})
export class MonthlyReportComponent implements OnInit {
  report: MonthlyReport | null = null;
  loading = false;
  error = '';

  years: number[] = [];
  months: { value: number; label: string }[] = [];
  selectedYear = new Date().getFullYear();
  selectedMonth = new Date().getMonth() + 1;

  constructor(
    private adminService: AdminService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const currentYear = new Date().getFullYear();
    for (let y = currentYear; y >= currentYear - 5; y--) {
      this.years.push(y);
    }
    for (let m = 1; m <= 12; m++) {
      this.months.push({ value: m, label: `Tháng ${m}` });
    }
    this.loadReport();
  }

  onPeriodChange(): void {
    this.loadReport();
  }

  loadReport(): void {
    this.loading = true;
    this.error = '';
    this.adminService.getMonthlyReport(this.selectedYear, this.selectedMonth).pipe(
      finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: (data) => {
        this.report = data;
      },
      error: (err) => {
        this.report = null;
        this.error = err?.error?.message || err?.message || 'Không tải được báo cáo.';
      }
    });
  }

  getMonthLabel(): string {
    return `Tháng ${this.selectedMonth}/${this.selectedYear}`;
  }

  formatDate(d: string | Date | undefined): string {
    if (!d) return '-';
    const date = typeof d === 'string' ? new Date(d) : d;
    return date.toLocaleDateString('vi-VN');
  }

  getClaimStatusBadge(status: string): string {
    const map: Record<string, string> = {
      PENDING: 'badge bg-warning',
      UNDER_VERIFICATION: 'badge bg-info',
      SUCCESSFUL: 'badge bg-success',
      REJECTED: 'badge bg-danger',
      CANCELLED: 'badge bg-secondary'
    };
    return map[status] || 'badge bg-secondary';
  }

  getPostStatusBadge(status: string): string {
    const map: Record<string, string> = {
      APPROVED: 'badge bg-success',
      PENDING_ADMIN: 'badge bg-warning',
      PENDING_SYSTEM: 'badge bg-info',
      NEEDS_UPDATE: 'badge bg-warning',
      REJECTED: 'badge bg-danger',
      RETURNED: 'badge bg-primary',
      ARCHIVED: 'badge bg-secondary'
    };
    return map[status] || 'badge bg-secondary';
  }
}
