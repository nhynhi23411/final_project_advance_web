import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ItemsService } from '../../services/items.service';
import { AuthService } from '../../services/auth.service';
import { Item } from '../../models/item.model';

@Component({
  selector: 'app-detail',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './detail.component.html',
})
export class DetailComponent implements OnInit {
  item = signal<Item | null>(null);
  loading = signal(true);
  error = signal('');

  constructor(
    private route: ActivatedRoute,
    private itemsService: ItemsService,
    public auth: AuthService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Thiếu id tin');
      this.loading.set(false);
      return;
    }
    this.itemsService.getById(id).subscribe({
      next: (data) => {
        this.item.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.message || 'Không tải được tin');
        this.loading.set(false);
      },
    });
  }

  isOwner(item: Item): boolean {
    const user = this.auth.currentUser();
    if (!user || !item.created_by) return false;
    return String(item.created_by) === String(user.id);
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

  fmtDate(d: string | undefined): string {
    if (!d) return '';
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return String(d);
    return dt.toLocaleString();
  }
}
