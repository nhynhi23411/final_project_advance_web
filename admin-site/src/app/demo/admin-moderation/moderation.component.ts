import { Component, OnInit } from '@angular/core';

import { SharedModule } from 'src/app/theme/shared/shared.module';
import { AdminService, Item } from 'src/app/services/admin.service';
import { PostStatus } from 'src/app/theme/shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-moderation',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './moderation.component.html',
  styleUrls: ['./moderation.component.scss']
})
export class ModerationComponent implements OnInit {
  pendingItems: Item[] = [];
  loading = false;
  searchTerm = '';
  showReasonModal = false;
  modalReason = '';
  modalItem: Item | null = null;
  modalStatus: PostStatus | null = null;

  constructor(private adminService: AdminService) { }

  ngOnInit() {
    this.loadPending();
  }

  get filteredItems(): Item[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      return this.pendingItems;
    }

    return this.pendingItems.filter((item) => {
      const id = String(item.id || item._id || '').toLowerCase();
      const title = (item.title || '').toLowerCase();
      return id.includes(term) || title.includes(term);
    });
  }

  loadPending() {
    this.loading = true;
    this.adminService.getPendingItems().subscribe({
      next: (items) => {
        this.pendingItems = items;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to fetch pending items', err);
        this.pendingItems = [];
        this.loading = false;
      }
    });
  }

  private updateStatus(item: Item, status: PostStatus, reason?: string) {
    if (!item || !item.id && !item._id) {
      return;
    }

    item.isUpdating = true;
    this.adminService.changeStatus(item._id || item.id!, status, reason).subscribe({
      next: () => {
        this.loadPending();
      },
      error: (err) => {
        console.error('Failed to update status', err);
        alert('Không thể cập nhật trạng thái. Vui lòng thử lại.');
        item.isUpdating = false;
      }
    });
  }

  approve(item: Item) {
    this.updateStatus(item, 'APPROVED');
  }

  reject(item: Item) {
    this.openReasonModal(item, 'REJECTED');
  }

  requestUpdate(item: Item) {
    this.openReasonModal(item, 'NEEDS_UPDATE');
  }

  openReasonModal(item: Item, status: PostStatus) {
    this.modalItem = item;
    this.modalStatus = status;
    this.modalReason = '';
    this.showReasonModal = true;
  }

  cancelReasonModal() {
    this.showReasonModal = false;
    this.modalItem = null;
    this.modalStatus = null;
    this.modalReason = '';
  }

  confirmReasonModal() {
    if (!this.modalItem || !this.modalStatus) return;
    const reason = (this.modalReason || '').trim();
    if (!reason) {
      alert('Vui lòng nhập lý do.');
      return;
    }
    this.updateStatus(this.modalItem, this.modalStatus, reason);
    this.cancelReasonModal();
  }
}

