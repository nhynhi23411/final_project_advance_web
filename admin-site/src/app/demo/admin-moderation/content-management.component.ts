import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';

import { SharedModule } from 'src/app/theme/shared/shared.module';
import { PageTitleComponent } from 'src/app/theme/shared/components/page-title/page-title.component';
import { AdminService, Item } from 'src/app/services/admin.service';

export type ContentTab =
  | 'all'
  | 'pending'
  | 'approved'
  | 'needs_update'
  | 'rejected'
  | 'returned'
  | 'archived';

@Component({
  selector: 'app-content-management',
  standalone: true,
  imports: [SharedModule, PageTitleComponent],
  templateUrl: './content-management.component.html',
  styleUrls: ['./content-management.component.scss']
})
export class ContentManagementComponent implements OnInit {
  activeTab: ContentTab = 'all';
  items: Item[] = [];
  loading = false;
  searchTerm = '';
  filterCategory = '';
  filterDateFrom = '';
  filterDateTo = '';

  tabCounts: Record<ContentTab, number> = {
    all: 0, pending: 0, approved: 0, needs_update: 0, rejected: 0, returned: 0, archived: 0
  };

  showQuickEditModal = false;
  showDeleteModal = false;
  quickEditItem: Item | null = null;
  quickEditForm = { title: '', description: '', category: '' };
  deleteItem: Item | null = null;
  saving = false;
  deleting = false;

  constructor(
    private adminService: AdminService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadCounts();
    this.loadCurrentTab();
  }

  loadCounts() {
    this.adminService.getPostCountsByStatus().subscribe({
      next: (counts) => {
        this.tabCounts = counts as Record<ContentTab, number>;
        this.cdr.markForCheck();
      }
    });
  }

  get statusParam(): string {
    const map: Record<ContentTab, string> = {
      all: 'all',
      pending: 'PENDING_ADMIN',
      approved: 'APPROVED',
      needs_update: 'NEEDS_UPDATE',
      rejected: 'REJECTED',
      returned: 'RETURNED',
      archived: 'ARCHIVED'
    };
    return map[this.activeTab];
  }

  get filteredItems(): Item[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.items;
    return this.items.filter((item) => {
      const id = String(this.getItemId(item)).toLowerCase();
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
    if (typeof reason === 'string' && reason.trim()) return reason.trim();
    return '-';
  }

  getListTitle(): string {
    const titles: Record<ContentTab, string> = {
      all: 'Tất cả bài đăng',
      pending: 'Bài đăng chờ duyệt',
      approved: 'Bài đăng đã duyệt',
      needs_update: 'Bài đăng cần cập nhật',
      rejected: 'Bài đăng bị từ chối',
      returned: 'Bài đăng đã trả lại',
      archived: 'Bài đăng đã đóng'
    };
    return titles[this.activeTab];
  }

  loadCurrentTab() {
    this.loading = true;
    const params: { status: string; category?: string; dateFrom?: string; dateTo?: string } = {
      status: this.statusParam
    };
    if (this.filterCategory?.trim()) params.category = this.filterCategory.trim();
    if (this.filterDateFrom) params.dateFrom = this.filterDateFrom;
    if (this.filterDateTo) params.dateTo = this.filterDateTo;

    this.adminService.getPosts(params).pipe(
      catchError(() => of([])),
      finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: (list) => {
        this.items = list;
      },
      error: () => {
        this.items = [];
      }
    });
  }

  onTabChange(tab: ContentTab) {
    this.activeTab = tab;
    this.loadCurrentTab();
  }

  applyFilters() {
    this.loadCurrentTab();
  }

  openDetail(item: Item, event?: Event) {
    if (event) event.stopPropagation();
    const id = this.getItemId(item);
    if (!id) return;
    this.router.navigate(['/moderation/pending', id], { state: { item } });
  }

  openQuickEdit(item: Item, event?: Event) {
    if (event) event.stopPropagation();
    this.quickEditItem = item;
    this.quickEditForm = {
      title: item.title ?? '',
      description: (item.description ?? '').toString(),
      category: item.category ?? ''
    };
    this.showQuickEditModal = true;
  }

  closeQuickEdit() {
    this.showQuickEditModal = false;
    this.quickEditItem = null;
    this.saving = false;
  }

  saveQuickEdit() {
    if (!this.quickEditItem) return;
    const id = this.getItemId(this.quickEditItem);
    if (!id) return;
    this.saving = true;
    this.adminService.updatePost(id, {
      title: this.quickEditForm.title.trim() || undefined,
      description: this.quickEditForm.description || undefined,
      category: this.quickEditForm.category.trim() || undefined
    }).pipe(
      finalize(() => {
        this.saving = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: (updated) => {
        const idx = this.items.findIndex((i) => this.getItemId(i) === id);
        if (idx !== -1) this.items[idx] = { ...this.items[idx], ...updated };
        this.closeQuickEdit();
        this.loadCounts();
      },
      error: () => {}
    });
  }

  openDeleteConfirm(item: Item, event?: Event) {
    if (event) event.stopPropagation();
    this.deleteItem = item;
    this.showDeleteModal = true;
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.deleteItem = null;
    this.deleting = false;
  }

  confirmDelete() {
    if (!this.deleteItem) return;
    const id = this.getItemId(this.deleteItem);
    if (!id) return;
    this.deleting = true;
    this.adminService.deletePost(id).pipe(
      finalize(() => {
        this.deleting = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: () => {
        this.items = this.items.filter((i) => this.getItemId(i) !== id);
        this.closeDeleteModal();
        this.loadCounts();
      },
      error: () => {}
    });
  }

  getCreatedAt(item: Item): string {
    const d = item.createdAt ?? item.created_at;
    if (!d) return '—';
    const date = new Date(d);
    return isNaN(date.getTime()) ? '—' : date.toLocaleDateString('vi-VN');
  }
}
