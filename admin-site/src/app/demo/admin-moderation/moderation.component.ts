import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, forkJoin, of } from 'rxjs';

import { SharedModule } from 'src/app/theme/shared/shared.module';
import { AdminService, Item } from 'src/app/services/admin.service';

@Component({
  selector: 'app-moderation',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './moderation.component.html',
  styleUrls: ['./moderation.component.scss']
})
export class ModerationComponent implements OnInit {
  activeTab: 'pending' | 'approved' | 'rejected' = 'pending';
  pendingItems: Item[] = [];
  approvedItems: Item[] = [];
  rejectedItems: Item[] = [];
  loading = false;
  searchTerm = '';

  constructor(
    private adminService: AdminService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) { }

  ngOnInit() {
    this.loadPending();
  }

  get filteredItems(): Item[] {
    let list: Item[] = [];
    if (this.activeTab === 'pending') {
      list = this.pendingItems;
    } else if (this.activeTab === 'approved') {
      list = this.approvedItems;
    } else {
      list = this.rejectedItems;
    }

    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return list;

    return list.filter((item) => {
      const id = String(item.id || item._id || '').toLowerCase();
      const title = (item.title || '').toLowerCase();
      const reason = this.getRejectedReason(item).toLowerCase();
      return id.includes(term) || title.includes(term) || reason.includes(term);
    });
  }

  getItemId(item: Item): string {
    const id = item._id ?? item.id;
    return id === undefined || id === null ? '' : String(id);
  }

  getRejectedReason(item: Item): string {
    const reason =
      item['reject_reason'] ??
      item['rejectReason'] ??
      item['reason'] ??
      item['moderation_reason'] ??
      item['moderationReason'] ??
      item['note'];

    if (typeof reason === 'string' && reason.trim()) {
      return reason.trim();
    }

    return '-';
  }

  getListTitle(): string {
    if (this.activeTab === 'pending') {
      return 'Danh sách bài đăng chờ duyệt';
    }

    if (this.activeTab === 'approved') {
      return 'Danh sách bài đăng đã duyệt';
    }

    return 'Danh sách bài đăng bị từ chối';
  }

  loadPending() {
    this.loading = true;
    forkJoin({
      pending: this.adminService.getPendingItems().pipe(
        catchError((err) => {
          console.error('Failed to fetch pending admin items', err);
          return of([] as Item[]);
        })
      ),
      needsUpdate: this.adminService.getNeedsUpdateItems().pipe(
        catchError((err) => {
          console.error('Failed to fetch needs-update items', err);
          return of([] as Item[]);
        })
      )
    }).pipe(
      finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: ({ pending, needsUpdate }) => {
        const merged = [...pending, ...needsUpdate];
        this.pendingItems = this.uniqueByItemId(merged);
      },
      error: (err) => {
        console.error('Failed to fetch pending items', err);
        this.pendingItems = [];
      }
    });
  }

  loadApproved() {
    this.loading = true;
    this.adminService.getApprovedItems().pipe(
      finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: (items) => {
        this.approvedItems = items;
      },
      error: (err) => {
        console.error('Failed to fetch approved items', err);
        this.approvedItems = [];
      }
    });
  }

  loadRejected() {
    this.loading = true;
    this.adminService.getRejectedItems().pipe(
      finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: (items) => {
        this.rejectedItems = items;
      },
      error: (err) => {
        console.error('Failed to fetch rejected items', err);
        this.rejectedItems = [];
      }
    });
  }

  openPendingDetail(item: Item, event?: Event) {
    if (event) {
      event.stopPropagation();
    }

    if (this.activeTab !== 'pending') {
      return;
    }

    const id = this.getItemId(item);
    if (!id) {
      return;
    }

    this.router.navigate(['/moderation/pending', id], {
      state: { item }
    });
  }

  private uniqueByItemId(items: Item[]): Item[] {
    const map = new Map<string, Item>();
    for (const item of items) {
      const id = this.getItemId(item);
      if (!id) {
        continue;
      }

      if (!map.has(id)) {
        map.set(id, item);
      }
    }

    return Array.from(map.values());
  }
}

