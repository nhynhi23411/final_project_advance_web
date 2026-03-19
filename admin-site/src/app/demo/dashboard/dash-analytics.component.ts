// angular import
import { Component, OnInit, viewChild, ChangeDetectorRef } from '@angular/core';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs';

// project import
import { SharedModule } from 'src/app/theme/shared/shared.module';
import { ProductSaleComponent } from './product-sale/product-sale.component';
import { AdminService, DashboardStats } from 'src/app/services/admin.service';

// 3rd party import
import { ApexOptions, ChartComponent, NgApexchartsModule } from 'ng-apexcharts';

@Component({
  selector: 'app-dash-analytics',
  imports: [SharedModule, RouterModule, NgApexchartsModule, ProductSaleComponent],
  templateUrl: './dash-analytics.component.html',
  styleUrls: ['./dash-analytics.component.scss']
})
export class DashAnalyticsComponent implements OnInit {
  // public props
  chart = viewChild<ChartComponent>('chart');
  customerChart = viewChild<ChartComponent>('customerChart');
  chartOptions!: Partial<ApexOptions>;
  chartOptions_1!: Partial<ApexOptions>;
  chartOptions_2!: Partial<ApexOptions>;
  chartOptions_3!: Partial<ApexOptions>;

  statsLoading = true;
  cards: Array<{ background: string; title: string; icon: string; text: string; number: string; no?: string; url?: string }> = [];
  images: Array<{ src: string; title: string; size: string }> = [];

  constructor(
    private adminService: AdminService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.statsLoading = true;
    this.adminService.getDashboardStats().pipe(
      finalize(() => {
        this.statsLoading = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: (stats: DashboardStats) => {
        this.cards = [
          {
            background: 'bg-c-blue',
            title: 'Tổng người dùng',
            icon: 'feather icon-users',
            text: 'User',
            number: String(stats.totalUsers),
            url: '/users'
          },
          {
            background: 'bg-c-green',
            title: 'Bài đăng đã duyệt',
            icon: 'feather icon-check-circle',
            text: 'Approved',
            number: String(stats.activePosts),
            url: '/moderation'
          },
          {
            background: 'bg-c-yellow',
            title: 'Bài chờ duyệt',
            icon: 'feather icon-clock',
            text: 'Pending',
            number: String(stats.pendingAdmin),
            url: '/moderation'
          },
          {
            background: 'bg-c-red',
            title: 'Yêu cầu đã giải quyết',
            icon: 'feather icon-award',
            text: 'Claims',
            number: String(stats.resolvedClaims),
            url: '/moderation'
          }
        ];
      },
      error: () => {
        this.cards = [];
      }
    });
  }
}
