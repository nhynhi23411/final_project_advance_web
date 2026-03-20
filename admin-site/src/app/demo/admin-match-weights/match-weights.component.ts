import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { finalize } from 'rxjs';
import { Router } from '@angular/router';
import { AdminService, MatchWeightConfig } from 'src/app/services/admin.service';
import { SharedModule } from 'src/app/theme/shared/shared.module';

@Component({
  selector: 'app-match-weights',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './match-weights.component.html',
  styleUrls: ['./match-weights.component.scss']
})
export class MatchWeightsComponent implements OnInit {
  loading = false;
  saving = false;
  recomputing = false;
  message = '';
  error = '';

  form: MatchWeightConfig = {
    category_weight: 20,
    text_weight: 35,
    location_weight: 25,
    time_weight: 10,
    attributes_weight: 10
  };

  constructor(
    private readonly adminService: AdminService,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadWeights();
  }

  get totalWeight(): number {
    return (
      Number(this.form.category_weight || 0) +
      Number(this.form.text_weight || 0) +
      Number(this.form.location_weight || 0) +
      Number(this.form.time_weight || 0) +
      Number(this.form.attributes_weight || 0)
    );
  }

  get isValid(): boolean {
    const vals = Object.values(this.form);
    return vals.every((v) => v >= 0 && v <= 100) && this.totalWeight === 100;
  }

  loadWeights(): void {
    this.loading = true;
    this.adminService
      .getMatchWeights()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (cfg) => {
          this.form = {
            category_weight: Number(cfg.category_weight ?? 20),
            text_weight: Number(cfg.text_weight ?? 35),
            location_weight: Number(cfg.location_weight ?? 25),
            time_weight: Number(cfg.time_weight ?? 10),
            attributes_weight: Number(cfg.attributes_weight ?? 10)
          };
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed to load match weights', err);
          this.error = 'Không thể tải cấu hình trọng số.';
        }
      });
  }

  saveWeights(): void {
    this.message = '';
    this.error = '';
    if (!this.isValid) {
      this.error = 'Tổng trọng số phải bằng 100 và mỗi giá trị nằm trong 0..100.';
      return;
    }
    this.saving = true;
    this.adminService
      .updateMatchWeights(this.form)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this.message = 'Đã lưu cấu hình trọng số thành công.';
        },
        error: (err) => {
          console.error('Failed to save match weights', err);
          this.error = err?.error?.message || 'Không thể lưu cấu hình trọng số.';
        }
      });
  }

  recompute(): void {
    this.message = '';
    this.error = '';
    this.recomputing = true;
    this.adminService
      .recomputeMatches()
      .pipe(finalize(() => (this.recomputing = false)))
      .subscribe({
        next: (res) => {
          void this.router.navigate(['/matches'], {
            state: {
              recomputeOk: true,
              processedPairs: res.processed_pairs,
              lostPosts: res.lost_posts,
              foundPosts: res.found_posts
            }
          });
        },
        error: (err) => {
          console.error('Failed to recompute matches', err);
          this.error = err?.error?.message || 'Không thể chạy lại ghép cặp.';
        }
      });
  }
}

