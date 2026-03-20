import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs';

import { SharedModule } from 'src/app/theme/shared/shared.module';
import { PageTitleComponent } from 'src/app/theme/shared/components/page-title/page-title.component';
import {
  AdminService,
  AdminMatchRow,
  AdminMatchPostSummary,
  AdminMatchReviewStatus,
} from 'src/app/services/admin.service';

type ReviewTab = 'all' | AdminMatchReviewStatus;

@Component({
  selector: 'app-match-management',
  standalone: true,
  imports: [SharedModule, RouterModule, PageTitleComponent],
  templateUrl: './match-management.component.html',
  styleUrls: ['./match-management.component.scss'],
})
export class MatchManagementComponent implements OnInit {
  items: AdminMatchRow[] = [];
  loading = false;
  error: string | null = null;

  activeTab: ReviewTab = 'PENDING';
  page = 1;
  limit = 10;
  total = 0;

  /** 0–100, optional minimum confidence filter */
  minConfidencePercent: number | null = null;

  updatingId: string | null = null;

  constructor(
    private adminService: AdminService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.load();
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.limit));
  }

  onTabChange(tab: ReviewTab): void {
    this.activeTab = tab;
    this.page = 1;
    this.load();
  }

  applyFilters(): void {
    this.page = 1;
    this.load();
  }

  prevPage(): void {
    if (this.page > 1) {
      this.page--;
      this.load();
    }
  }

  nextPage(): void {
    if (this.page < this.totalPages) {
      this.page++;
      this.load();
    }
  }

  load(): void {
    this.loading = true;
    this.error = null;
    const statusParam =
      this.activeTab === 'all' ? '' : this.activeTab;
    const minC =
      this.minConfidencePercent != null && this.minConfidencePercent > 0
        ? this.minConfidencePercent / 100
        : undefined;
    this.adminService
      .getMatches({
        page: this.page,
        limit: this.limit,
        status: statusParam as AdminMatchReviewStatus | '',
        minConfidence: minC,
      })
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (res) => {
          this.items = res.items;
          this.page = res.page;
          this.limit = res.limit;
          this.total = res.total;
        },
        error: (err) => {
          console.error(err);
          this.error =
            err.error?.message || 'Không tải được danh sách ghép cặp.';
        },
      });
  }

  confirmMatch(m: AdminMatchRow): void {
    this.patchStatus(m, 'CONFIRMED');
  }

  rejectMatch(m: AdminMatchRow): void {
    this.patchStatus(m, 'REJECTED');
  }

  private patchStatus(m: AdminMatchRow, status: 'CONFIRMED' | 'REJECTED'): void {
    const id = m._id;
    this.updatingId = id;
    this.adminService.updateMatchReviewStatus(id, status).subscribe({
      next: (updated) => {
        const idx = this.items.findIndex((x) => x._id === id);
        if (idx !== -1) this.items[idx] = { ...this.items[idx], ...updated };
        this.updatingId = null;
        if (this.activeTab !== 'all') this.load();
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error(err);
        this.error = err.error?.message || 'Cập nhật thất bại.';
        this.updatingId = null;
        this.cdr.markForCheck();
      },
    });
  }

  asPost(ref: AdminMatchPostSummary | string | undefined): AdminMatchPostSummary | null {
    if (ref && typeof ref === 'object' && '_id' in ref) return ref as AdminMatchPostSummary;
    return null;
  }

  confidenceLabel(m: AdminMatchRow): string {
    const pct =
      m.score_percent != null
        ? m.score_percent
        : Math.round((m.confidence_score ?? 0) * 100);
    return `${pct}%`;
  }

  textSimilarityLabel(m: AdminMatchRow): string {
    if (m.text_score == null) return '—';
    const v = m.text_score > 1 ? m.text_score / 100 : m.text_score;
    return `${Math.round(v * 100)}%`;
  }

  locationLabel(post: AdminMatchPostSummary | null): string {
    if (!post?.location) return '—';
    const loc = post.location as Record<string, unknown>;
    const addr = loc['address'];
    if (typeof addr === 'string' && addr.trim()) return addr.trim();
    const coords = loc['coordinates'];
    if (Array.isArray(coords) && coords.length >= 2) {
      return `${Number(coords[1]).toFixed(4)}, ${Number(coords[0]).toFixed(4)}`;
    }
    return '—';
  }

  metaDate(post: AdminMatchPostSummary | null): string {
    const d = post?.metadata?.['lost_found_date'];
    if (typeof d === 'string' && d) return d;
    if (post?.createdAt) return String(post.createdAt).slice(0, 10);
    return '—';
  }

  isPending(m: AdminMatchRow): boolean {
    return (m.review_status || 'PENDING') === 'PENDING';
  }
}
