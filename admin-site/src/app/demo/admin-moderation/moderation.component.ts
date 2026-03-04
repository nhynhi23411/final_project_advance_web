// angular imports
import { Component, OnInit } from '@angular/core';

// project imports
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
  // modal state for entering reject_reason when needed
  showReasonModal = false;
  modalReason = '';
  modalItem: Item | null = null;
  modalStatus: PostStatus | null = null;

  constructor(private adminService: AdminService) {}

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
    this.adminService.getPendingItems().subscribe(
      (items) => {
        this.pendingItems = items;
        this.loading = false;
      },
      (err) => {
        // fall back to mock data if server isn't available yet
        console.warn('Could not fetch pending items from API, using mock data', err);
        import('src/app/theme/shared/mock-data/items.mock').then((m) => {
          this.pendingItems = m.getItemsByStatus('PENDING_ADMIN');
          this.loading = false;
        });
      }
    );
  }

  private updateStatus(item: Item, status: PostStatus, reason?: string) {
    if (!item || !item.id && !item._id) {
      return;
    }

    item.isUpdating = true;
    this.adminService.changeStatus(item._id || item.id!, status, reason).subscribe({
      next: () => {
        item.status = status;
      },
      error: (err) => {
        console.error('Failed to update status', err);
        alert('Không thể cập nhật trạng thái. Vui lòng thử lại.');
      },
      complete: () => {
        item.isUpdating = false;
      }
    });
  }

  approve(item: Item) {
    this.updateStatus(item, 'APPROVED');
  }

  // open modal to require a reason before rejecting
  reject(item: Item) {
    this.openReasonModal(item, 'REJECTED');
  }

  // open modal to require a reason before requesting update
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
      alert('Vui lòng nhập lý do từ chối.');
      return;
    }
    this.updateStatus(this.modalItem, this.modalStatus, reason);
    this.cancelReasonModal();
  }
}
