import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ItemsService } from '../../services/items.service';
import { Item } from '../../models/item.model';

@Component({
  selector: 'app-my-items',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './my-items.component.html',
})
export class MyItemsComponent implements OnInit {
  items = signal<Item[]>([]);
  loading = signal(true);
  error = signal('');
  deletingId = signal<string | null>(null);

  constructor(private itemsService: ItemsService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.itemsService.myItems().subscribe({
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

  delete(id: string): void {
    if (!confirm('Bạn có chắc muốn xóa tin này?')) return;
    this.deletingId.set(id);
    this.itemsService.delete(id).subscribe({
      next: () => {
        this.items.update((list) => list.filter((i) => i._id !== id));
        this.deletingId.set(null);
      },
      error: (err) => {
        this.error.set(err?.message || 'Xóa thất bại');
        this.deletingId.set(null);
      },
    });
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
    return `badge bg-${map[status] || 'secondary'} lf-badge`;
  }
}
