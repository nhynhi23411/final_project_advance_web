import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef } from '@angular/core';
import { finalize } from 'rxjs';

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
export class ModerationComponent implements OnInit, AfterViewChecked {
  @ViewChild('reasonInput') reasonInput?: ElementRef<HTMLTextAreaElement>;

  activeTab: 'pending' | 'approved' = 'pending';
  pendingItems: Item[] = [];
  approvedItems: Item[] = [];
  loading = false;
  searchTerm = '';
  showReasonModal = false;
  modalReason = '';
  modalItem: Item | null = null;
  modalStatus: PostStatus | null = null;
  private focusReasonNextCheck = false;

  constructor(
    private adminService: AdminService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.loadPending();
  }

  ngAfterViewChecked() {
    if (this.focusReasonNextCheck && this.showReasonModal && this.reasonInput?.nativeElement) {
      this.focusReasonNextCheck = false;
      this.reasonInput.nativeElement.focus();
    }
  }

  get filteredItems(): Item[] {
    const list = this.activeTab === 'pending' ? this.pendingItems : this.approvedItems;
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return list;

    return list.filter((item) => {
      const id = String(item.id || item._id || '').toLowerCase();
      const title = (item.title || '').toLowerCase();
      return id.includes(term) || title.includes(term);
    });
  }

  loadPending() {
    this.loading = true;
    this.adminService.getPendingItems().pipe(
      finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: (items) => {
        this.pendingItems = items;
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
    this.focusReasonNextCheck = true;
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

