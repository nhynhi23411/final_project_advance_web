// angular import
import { Component, OnInit, viewChild, ChangeDetectorRef } from '@angular/core';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs';

// project import
import { SharedModule } from 'src/app/theme/shared/shared.module';
import { PageTitleComponent } from 'src/app/theme/shared/components/page-title/page-title.component';
import { AdminService, DashboardStats } from 'src/app/services/admin.service';

// 3rd party import
import { ApexOptions, ChartComponent, NgApexchartsModule } from 'ng-apexcharts';

@Component({
  selector: 'app-dash-analytics',
  imports: [SharedModule, RouterModule, NgApexchartsModule, PageTitleComponent],
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

  matchRateOptions!: Partial<ApexOptions>;
  moderationOptions!: Partial<ApexOptions>;
  
  platformHealthLogs: any[] = [];
  healthLoading = true;

  statsLoading = true;
  chartsLoading = true;
  cards: Array<{ background: string; title: string; icon: string; text: string; number: string; no?: string; url?: string }> = [];
  images: Array<{ src: string; title: string; size: string }> = [];

  constructor(
    private adminService: AdminService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.statsLoading = true;
    this.chartsLoading = true;
    this.adminService.getDashboardStats().pipe(
      finalize(() => {
        this.statsLoading = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: (stats: DashboardStats) => {
        this.buildCards(stats);
      },
      error: () => {
        this.cards = [];
      }
    });
    this.adminService.getGrowthStats(12).pipe(
      finalize(() => this.cdr.markForCheck())
    ).subscribe({
      next: (data) => {
        this.chartOptions = this.buildLineChartOptions(data);
        this.chartsLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.chartsLoading = false;
        this.cdr.markForCheck();
      }
    });
    this.adminService.getStatsByCategory().pipe(
      finalize(() => this.cdr.markForCheck())
    ).subscribe({
      next: (data) => {
        this.chartOptions_1 = this.buildPieChartOptions(data);
        if (!this.chartOptions) this.chartsLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        if (!this.chartOptions) this.chartsLoading = false;
        this.cdr.markForCheck();
      }
    });

    // Match Rate Line Chart
    this.adminService.getMatchRateStats(12).subscribe({
      next: (data) => {
        this.matchRateOptions = this.buildMatchRateChartOptions(data);
        this.cdr.markForCheck();
      }
    });

    // Moderation Workload Donut/Pie Chart
    this.adminService.getModerationWorkload().subscribe({
      next: (data) => {
        this.moderationOptions = this.buildModerationChartOptions(data);
        this.cdr.markForCheck();
      }
    });

    // Platform Health Table Data
    this.healthLoading = true;
    this.adminService.getPlatformHealth().subscribe({
      next: (data) => {
        this.platformHealthLogs = data;
        this.healthLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.platformHealthLogs = [];
        this.healthLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private buildCards(stats: DashboardStats): void {
    type CardItem = { background: string; title: string; icon: string; text: string; number: string; no?: string; url?: string };
    const base: CardItem[] = [
      {
        background: 'bg-c-blue',
        title: 'Tổng người dùng',
        icon: 'feather icon-users',
        text: 'Người dùng',
        number: String(stats.totalUsers),
        url: '/users'
      },
      {
        background: 'bg-c-green',
        title: 'Bài đăng đã duyệt',
        icon: 'feather icon-check-circle',
        text: 'Đã duyệt',
        number: String(stats.activePosts),
        url: '/moderation'
      },
      {
        background: 'bg-c-yellow',
        title: 'Bài chờ duyệt',
        icon: 'feather icon-clock',
        text: 'Chờ duyệt',
        number: String(stats.pendingAdmin),
        url: '/moderation'
      },
      {
        background: 'bg-c-red',
        title: 'Yêu cầu đã giải quyết',
        icon: 'feather icon-award',
        text: 'Đã giải quyết',
        number: String(stats.resolvedClaims),
        url: '/moderation'
      }
    ];
    if (stats.matchRate !== undefined) {
      const pct = (stats.matchRate * 100).toFixed(1);
      base.push({
        background: 'bg-c-purple',
        title: 'Tỷ lệ khớp',
        icon: 'feather icon-percent',
        text: 'Claim thành công / Bài thất lạc đã duyệt',
        number: pct + '%',
        no: 'Thấp => cần cải thiện thuật toán ghép cặp'
      });
    }
    this.cards = base;
  }

  private buildLineChartOptions(data: { labels: string[]; users: number[]; posts: number[] }): Partial<ApexOptions> {
    const labels = data.labels.map((m) => {
      const [y, mo] = m.split('-');
      return `${mo}/${y}`;
    });
    return {
      chart: { height: 300, type: 'line', zoom: { enabled: false } },
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: [2, 2] },
      colors: ['#4099ff', '#0e9e4a'],
      series: [
        { name: 'Người dùng mới', data: data.users },
        { name: 'Bài đăng mới', data: data.posts }
      ],
      title: { text: 'Tăng trưởng người dùng và bài đăng theo tháng', align: 'left' },
      xaxis: { categories: labels },
      legend: { position: 'top' },
      grid: { borderColor: '#f1f1f1' },
      fill: { opacity: 0.1 },
      markers: { size: 0 },
      yaxis: {}
    };
  }

  private buildPieChartOptions(data: { category: string; count: number }[]): Partial<ApexOptions> {
    if (!data?.length) {
      return { chart: { type: 'donut', height: 320 }, series: [], labels: [] };
    }
    const colors = ['#4099ff', '#0e9e4a', '#00acc1', '#FFB64D', '#FF5370', '#7c4dff', '#18ffff', '#ffab91'];
    return {
      chart: { height: 320, type: 'donut' },
      labels: data.map((d) => d.category),
      series: data.map((d) => d.count),
      colors: data.map((_, i) => colors[i % colors.length]),
      legend: { show: true, position: 'bottom' },
      dataLabels: { enabled: true },
      plotOptions: {
        pie: {
          donut: {
            labels: { show: true, name: { show: true }, value: { show: true } }
          }
        }
      }
    };
  }

  private buildMatchRateChartOptions(data: { labels: string[]; rates: number[] }): Partial<ApexOptions> {
    const labels = data.labels.map((m) => {
      const [y, mo] = m.split('-');
      return `${mo}/${y}`;
    });
    return {
      chart: { height: 300, type: 'area', zoom: { enabled: false } },
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: [3] },
      colors: ['#7c4dff'],
      series: [
        { name: 'Tỷ lệ khớp (%)', data: data.rates.map(r => Number(r.toFixed(1))) }
      ],
      title: { text: 'Tỷ lệ khớp bài LOST đã duyệt theo tháng', align: 'left' },
      xaxis: { categories: labels },
      yaxis: { min: 0, max: 100, labels: { formatter: (val) => val + '%' } },
      legend: { position: 'top' },
      grid: { borderColor: '#f1f1f1' },
      fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.7, opacityTo: 0.9, stops: [0, 90, 100] } },
      markers: { size: 4 }
    };
  }

  private buildModerationChartOptions(data: { approved: number; rejected: number; pending: number; needsUpdate: number }): Partial<ApexOptions> {
    const series = [data.approved, data.rejected, data.pending, data.needsUpdate];
    const labels = ['Đã duyệt', 'Từ chối (Hủy)', 'Chờ duyệt', 'Y/C Sửa đổi'];
    const colors = ['#0e9e4a', '#FF5370', '#FFB64D', '#4099ff'];
    
    return {
      chart: { height: 320, type: 'donut' },
      labels: labels,
      series: series,
      colors: colors,
      legend: { show: true, position: 'bottom' },
      dataLabels: { enabled: true },
      plotOptions: {
        pie: {
          donut: {
            labels: { show: true, name: { show: true }, value: { show: true } }
          }
        }
      }
    };
  }
}
