import { AfterViewChecked, ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, finalize, forkJoin, of } from 'rxjs';

import { AdminService, Item } from 'src/app/services/admin.service';
import { SharedModule } from 'src/app/theme/shared/shared.module';
import { PostStatus } from 'src/app/theme/shared/components/status-badge/status-badge.component';

type ModerationAction = 'REJECTED' | 'NEEDS_UPDATE';

interface AuditEntry {
  action: string;
  actor: string;
  time: string;
  note: string;
}

@Component({
  selector: 'app-moderation-detail',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './moderation-detail.component.html',
  styleUrls: ['./moderation-detail.component.scss']
})
export class ModerationDetailComponent implements OnInit, AfterViewChecked {
  @ViewChild('actionInput') actionInput?: ElementRef<HTMLTextAreaElement>;

  item: Item | null = null;
  loading = false;
  submitting = false;

  currentStatus: PostStatus = 'DRAFT';
  statusNotice = '';
  statusNoticeClass = 'alert alert-info';

  showActionModal = false;
  actionType: ModerationAction | null = null;
  actionMessage = '';
  modalTouched = false;

  private focusInputNextCheck = false;

  private readonly allowedStatuses: PostStatus[] = [
    'DRAFT',
    'ARCHIVED',
    'PENDING_SYSTEM',
    'PENDING_ADMIN',
    'PENDING_APPROVAL',
    'APPROVED',
    'NEEDS_UPDATE',
    'RETURN_PENDING_CONFIRM',
    'RETURNED',
    'REJECTED'
  ];

  constructor(
    private readonly adminService: AdminService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    const navItem = (history.state?.item ?? null) as Item | null;

    if (navItem && this.getItemId(navItem) === id) {
      this.item = navItem;
      this.currentStatus = this.normalizeStatus(navItem.status);
    }

    this.loadPendingItem(id);
  }

  ngAfterViewChecked(): void {
    if (this.focusInputNextCheck && this.actionInput?.nativeElement) {
      this.focusInputNextCheck = false;
      this.actionInput.nativeElement.focus();
    }
  }

  get pageTitle(): string {
    return this.item?.title || 'Chi tiet bai dang cho duyet';
  }

  get itemIdLabel(): string {
    return this.item ? this.getItemId(this.item) || '-' : '-';
  }

  get canModerate(): boolean {
    return this.currentStatus === 'PENDING_ADMIN' || this.currentStatus === 'NEEDS_UPDATE';
  }

  get rejectReasonRequired(): boolean {
    return this.actionType === 'REJECTED';
  }

  get showSendWithoutMessage(): boolean {
    return this.actionType === 'NEEDS_UPDATE';
  }

  get canConfirmAction(): boolean {
    if (!this.actionType) {
      return false;
    }

    if (this.rejectReasonRequired) {
      return this.actionMessage.trim().length > 0;
    }

    if (this.actionType === 'NEEDS_UPDATE') {
      return this.actionMessage.trim().length > 0;
    }

    return true;
  }

  get modalTitle(): string {
    return this.actionType === 'REJECTED' ? 'Từ chối bài đăng' : 'Cần cập nhật bài đăng';
  }

  get modalDescription(): string {
    if (this.actionType === 'REJECTED') {
      return 'Nhập lý do từ chối bài đăng (bắt buộc)';
    }

    return 'Nhập lời nhắn cho người đăng (không bắt buộc).';
  }

  get modalConfirmClass(): string {
    if (this.actionType === 'REJECTED') {
      return 'btn btn-danger';
    }

    return 'btn btn-warning text-dark';
  }

  get originalImageUrl(): string {
    const directImage = this.pickFirstValue([
      'original_image',
      'originalImage',
      'image',
      'image_url',
      'imageUrl',
      'photo'
    ]);

    if (typeof directImage === 'string' && directImage.trim()) {
      return directImage;
    }

    const imageList = this.pickFirstValue(['images', 'media', 'attachments', 'photos']);
    if (Array.isArray(imageList) && imageList.length > 0) {
      const first = imageList[0];
      if (typeof first === 'string' && first.trim()) {
        return first;
      }

      if (first && typeof first === 'object') {
        const firstObj = first as Record<string, unknown>;
        const candidate = firstObj['url'] ?? firstObj['image'] ?? firstObj['src'];
        if (typeof candidate === 'string' && candidate.trim()) {
          return candidate;
        }
      }
    }

    return 'assets/images/gallery-grid/img-grd-gal-1.jpg';
  }

  get metadataRows(): Array<{ label: string; value: string }> {
    const createdBy = this.pickFirstValue([
      'createdBy.name',
      'created_by.name',
      'author.name',
      'owner',
      'user.name',
      'user.username',
      'username'
    ]);

    const category = this.pickFirstValue(['category', 'post_type', 'type']);
    const location = this.pickFirstValue(['location', 'place', 'address']);
    const createdAt = this.pickFirstValue(['created_at', 'createdAt', 'created']);
    const updatedAt = this.pickFirstValue(['updated_at', 'updatedAt', 'modifiedAt']);

    return [
      { label: 'ID', value: this.itemIdLabel },
      { label: 'Tieu de', value: this.toText(this.item?.title, '-') },
      { label: 'Trang thai', value: this.statusLabel(this.currentStatus) },
      { label: 'Nguoi dang', value: this.toText(createdBy, '-') },
      { label: 'Danh muc', value: this.toText(category, '-') },
      { label: 'Khu vuc', value: this.toText(location, '-') },
      { label: 'Ngay tao', value: this.formatDate(createdAt) },
      { label: 'Cap nhat gan nhat', value: this.formatDate(updatedAt) }
    ];
  }

  get showNeedsUpdateBox(): boolean {
    return this.currentStatus === 'NEEDS_UPDATE';
  }

  get needsUpdateContent(): string {
    const content = this.pickFirstValue([
      'needs_update_message',
      'needsUpdateMessage',
      'admin_message',
      'adminMessage',
      'message_to_user',
      'messageToUser',
      'reject_reason',
      'rejectReason',
      'moderation_reason',
      'moderationReason',
      'note'
    ]);

    return this.toText(content, 'Chưa có nội dung cần cập nhật từ Admin');
  }

  get auditEntries(): AuditEntry[] {
    const rawLog = this.pickFirstValue(['auditLogs', 'audit_log', 'history', 'timeline', 'activityLogs']);

    if (Array.isArray(rawLog) && rawLog.length > 0) {
      return rawLog.map((entry, index) => {
        if (typeof entry === 'string') {
          return {
            action: `Ban ghi ${index + 1}`,
            actor: 'System',
            time: '-',
            note: entry
          };
        }

        if (entry && typeof entry === 'object') {
          const data = entry as Record<string, unknown>;
          return {
            action: this.toText(data['action'] ?? data['event'] ?? data['type'], `Ban ghi ${index + 1}`),
            actor: this.toText(data['actor'] ?? data['by'] ?? data['user'] ?? data['username'], 'System'),
            time: this.formatDate(data['time'] ?? data['timestamp'] ?? data['createdAt'] ?? data['created_at']),
            note: this.toText(data['note'] ?? data['message'] ?? data['reason'], '-')
          };
        }

        return {
          action: `Ban ghi ${index + 1}`,
          actor: 'System',
          time: '-',
          note: '-'
        };
      });
    }

    const createdAt = this.formatDate(this.pickFirstValue(['created_at', 'createdAt', 'created']));
    const createdBy = this.toText(
      this.pickFirstValue(['createdBy.name', 'author.name', 'owner', 'user.name', 'username']),
      'Người dùng'
    );

    const defaultLog: AuditEntry[] = [
      {
        action: 'Tạo bài đăng',
        actor: createdBy,
        time: createdAt,
        note: 'Bài đăng được gửi lên hệ thống.'
      },
      {
        action: 'Chờ duyệt bởi Admin',
        actor: 'Hệ thống',
        time: createdAt,
        note: 'Bài đăng đang trong trạng thái chờ duyệt.'
      }
    ];

    if (this.currentStatus !== 'PENDING_ADMIN') {
      defaultLog.push({
        action: 'Cập nhật trạng thái',
        actor: 'Admin',
        time: this.formatDate(new Date().toISOString()),
        note: `Trạng thái hiện tại: ${this.statusLabel(this.currentStatus)}.`
      });
    }

    return defaultLog;
  }

  goBackToPending(): void {
    this.router.navigate(['/moderation']);
  }

  approve(): void {
    if (!this.item || this.submitting || !this.canModerate) {
      return;
    }

    this.applyStatusChange('APPROVED');
  }

  openRejectModal(): void {
    if (!this.item || this.submitting || !this.canModerate) {
      return;
    }

    this.openActionModal('REJECTED');
  }

  openNeedsUpdateModal(): void {
    if (!this.item || this.submitting || !this.canModerate) {
      return;
    }

    this.openActionModal('NEEDS_UPDATE');
  }

  cancelActionModal(): void {
    this.showActionModal = false;
    this.actionType = null;
    this.actionMessage = '';
    this.modalTouched = false;
  }

  confirmActionModal(): void {
    if (!this.actionType || this.submitting) {
      return;
    }

    const message = this.actionMessage.trim();
    if (this.rejectReasonRequired && !message) {
      this.modalTouched = true;
      return;
    }

    if (!message && this.actionType === 'NEEDS_UPDATE') {
      this.modalTouched = true;
      return;
    }

    this.applyStatusChange(this.actionType, message);
  }

  sendWithoutMessage(): void {
    if (this.actionType !== 'NEEDS_UPDATE' || this.submitting) {
      return;
    }

    this.applyStatusChange('NEEDS_UPDATE');
  }

  getItemId(item: Item): string {
    const id = item._id ?? item.id;
    return id === undefined || id === null ? '' : String(id);
  }

  private openActionModal(action: ModerationAction): void {
    this.showActionModal = true;
    this.actionType = action;
    this.actionMessage = '';
    this.modalTouched = false;
    this.focusInputNextCheck = true;
  }

  private applyStatusChange(status: PostStatus, message?: string): void {
    if (!this.item) {
      return;
    }

    const id = this.getItemId(this.item);
    if (!id) {
      return;
    }

    this.submitting = true;
    this.adminService
      .changeStatus(id, status, message)
      .pipe(
        finalize(() => {
          this.submitting = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          this.currentStatus = status;
          this.item = { ...this.item, status };
          this.statusNotice = this.getNoticeMessage(status);
          this.statusNoticeClass = this.getNoticeClass(status);
          this.cancelActionModal();
        },
        error: (err) => {
          console.error('Failed to update post status', err);
          alert('Không thể cập nhật trạng thái bài đăng. Vui lòng thử lại.');
        }
      });
  }

  private loadPendingItem(id: string): void {
    if (!id) {
      return;
    }

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
    })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: ({ pending, needsUpdate }) => {
          const items = [...pending, ...needsUpdate];
          const found = items.find((entry) => this.getItemId(entry) === id);
          if (found) {
            this.item = found;
            this.currentStatus = this.normalizeStatus(found.status);
            return;
          }

          if (!this.item) {
            this.item = {
              id,
              title: 'Không tìm thấy bài đăng trong danh sách chờ duyệt.',
              status: 'DRAFT'
            };
            this.currentStatus = 'DRAFT';
          }
        },
        error: (err) => {
          console.error('Failed to fetch pending post detail', err);
          if (!this.item) {
            this.item = {
              id,
              title: 'Không thể tải dữ liệu bài đăng.',
              status: 'DRAFT'
            };
            this.currentStatus = 'DRAFT';
          }
        }
      });
  }

  private normalizeStatus(status: unknown): PostStatus {
    if (typeof status !== 'string') {
      return 'DRAFT';
    }

    const normalized = status.toUpperCase() as PostStatus;
    return this.allowedStatuses.includes(normalized) ? normalized : 'DRAFT';
  }

  private readPath(source: unknown, path: string): unknown {
    return path.split('.').reduce<unknown>((acc, key) => {
      if (!acc || typeof acc !== 'object') {
        return undefined;
      }

      const obj = acc as Record<string, unknown>;
      return obj[key];
    }, source);
  }

  private pickFirstValue(paths: string[]): unknown {
    for (const path of paths) {
      const value = this.readPath(this.item, path);
      if (value !== undefined && value !== null && value !== '') {
        return value;
      }
    }

    return undefined;
  }

  private toText(value: unknown, fallback: string): string {
    if (value === undefined || value === null || value === '') {
      return fallback;
    }

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    return fallback;
  }

  private formatDate(value: unknown): string {
    if (!value) {
      return '-';
    }

    const text = String(value);
    const parsed = new Date(text);

    if (Number.isNaN(parsed.getTime())) {
      return text;
    }

    return parsed.toLocaleString('vi-VN');
  }

  private statusLabel(status: PostStatus): string {
    const map: Record<PostStatus, string> = {
      DRAFT: 'Draft',
      ARCHIVED: 'Archived',
      PENDING_SYSTEM: 'Pending System',
      PENDING_ADMIN: 'Pending Admin',
      PENDING_APPROVAL: 'Pending Approval',
      APPROVED: 'Approved',
      NEEDS_UPDATE: 'Needs Update',
      RETURN_PENDING_CONFIRM: 'Return Pending',
      RETURNED: 'Returned',
      REJECTED: 'Rejected'
    };

    return map[status] || status;
  }

  private getNoticeMessage(status: PostStatus): string {
    if (status === 'APPROVED') {
      return 'Trạng thái bài đăng đã chuyển sang APPROVED.';
    }

    if (status === 'NEEDS_UPDATE') {
      return 'Đã gửi yêu cầu cập nhật cho người đăng bài.';
    }

    if (status === 'REJECTED') {
      return 'Bài đăng đã bị từ chối.';
    }

    return 'Trạng thái bài đăng đã được cập nhật.';
  }

  private getNoticeClass(status: PostStatus): string {
    if (status === 'APPROVED') {
      return 'alert alert-success';
    }

    if (status === 'NEEDS_UPDATE') {
      return 'alert alert-warning';
    }

    if (status === 'REJECTED') {
      return 'alert alert-danger';
    }

    return 'alert alert-info';
  }
}
