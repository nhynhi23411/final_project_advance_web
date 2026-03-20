import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { finalize } from 'rxjs';
import { Router } from '@angular/router';
import {
  AdminMatch,
  AdminService,
  MatchStatus
} from 'src/app/services/admin.service';
import { SharedModule } from 'src/app/theme/shared/shared.module';

@Component({
  selector: 'app-admin-matches',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './matches.component.html',
  styleUrls: ['./matches.component.scss']
})
export class MatchesComponent implements OnInit {
  matches: AdminMatch[] = [];
  loading = false;
  page = 1;
  limit = 20;
  total = 0;
  statusFilter: '' | MatchStatus = '';
  minConfidence = 0;
  /** Thông báo một lần sau khi recompute từ trang trọng số */
  recomputeFlash = '';

  constructor(
    private readonly adminService: AdminService,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.consumeRecomputeNavigationState();
    this.loadMatches();
  }

  private consumeRecomputeNavigationState(): void {
    const st = history.state as Record<string, unknown> | null;
    if (!st || st['recomputeOk'] !== true) return;
    const pairs = Number(st['processedPairs'] ?? 0);
    const lost = Number(st['lostPosts'] ?? 0);
    const found = Number(st['foundPosts'] ?? 0);
    this.recomputeFlash = `Recompute thành công: ${pairs} cặp (${lost} LOST, ${found} FOUND).`;
    const next = { ...st };
    delete next['recomputeOk'];
    delete next['processedPairs'];
    delete next['lostPosts'];
    delete next['foundPosts'];
    history.replaceState(next, '');
  }

  dismissRecomputeFlash(): void {
    this.recomputeFlash = '';
  }

  loadMatches(): void {
    this.loading = true;
    this.cdr.detectChanges();
    this.adminService
      .getMatches({
        page: this.page,
        limit: this.limit,
        status: this.statusFilter || undefined,
        minConfidence: this.minConfidence || undefined
      })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (res) => {
          this.matches = res.items || [];
          this.total = res.total || 0;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed to load matches', err);
          this.matches = [];
          this.total = 0;
          this.cdr.detectChanges();
        }
      });
  }

  updateStatus(item: AdminMatch, status: 'CONFIRMED' | 'REJECTED'): void {
    this.adminService.updateMatchStatus(item._id, status).subscribe({
      next: () => {
        item.status = status;
      },
      error: (err) => {
        console.error('Failed to update match status', err);
        alert('Không thể cập nhật trạng thái ghép cặp. Vui lòng thử lại.');
      }
    });
  }

  goToWeightConfig(): void {
    this.router.navigate(['/matches/weights']);
  }

  recomputeNow(): void {
    this.loading = true;
    this.cdr.detectChanges();
    this.adminService
      .recomputeMatches()
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => this.loadMatches(),
        error: (err) => {
          console.error('Failed to recompute matches', err);
          alert('Không thể chạy lại ghép cặp. Vui lòng thử lại.');
        }
      });
  }

  asPost(post: unknown): { _id: string; title?: string; category?: string; images?: string[] } | null {
    if (!post || typeof post !== 'object') return null;
    const p = post as any;
    if (!p._id) return null;
    return p;
  }
}

