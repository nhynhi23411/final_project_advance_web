import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ItemsService } from '../../services/items.service';
import { Item } from '../../models/item.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home.component.html',
})
export class HomeComponent implements OnInit {
  items = signal<Item[]>([]);
  loading = signal(true);
  error = signal('');
  filters = signal<{ type?: string; category?: string; location?: string; status?: string }>({});

  constructor(private itemsService: ItemsService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.itemsService.list(this.filters()).subscribe({
      next: (list) => {
        this.items.set(list);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.message || 'Không tải được danh sách');
        this.loading.set(false);
      },
    });
  }

  onFilterChange(key: string, value: string): void {
    this.filters.update((f) => ({ ...f, [key]: value || undefined }));
    this.load();
  }

  statusBadge(status: string): string {
    const map: Record<string, string> = {
      PENDING_APPROVAL: 'warning',
      APPROVED: 'success',
      REJECTED: 'danger',
      MATCHED: 'info',
      RETURN_PENDING: 'primary',
      RETURNED: 'secondary',
      CLOSED: 'dark',
    };
    const tone = map[status] || 'secondary';
    return `badge bg-${tone} lf-badge`;
  }

  fmtDate(d: string | undefined): string {
    if (!d) return '';
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return String(d);
    return dt.toLocaleString();
  }
}
