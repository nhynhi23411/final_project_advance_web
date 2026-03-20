import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, BlacklistedKeyword, AlgorithmWeights } from '../../services/admin.service';
import { PageTitleComponent } from 'src/app/theme/shared/components/page-title/page-title.component';

type WeightKey = keyof AlgorithmWeights;

interface WeightSlider {
  key: WeightKey;
  label: string;
  icon: string;
  description: string;
  color: string;
}

@Component({
  selector: 'app-system-config',
  templateUrl: './system-config.component.html',
  styleUrls: ['./system-config.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, PageTitleComponent],
})
export class SystemConfigComponent implements OnInit {
  // ─── Blacklist State ──────────────────────────────────────────────────────
  keywords: BlacklistedKeyword[] = [];
  isLoadingKeywords = false;
  keywordError: string | null = null;
  keywordSuccess: string | null = null;

  newKeyword = '';
  isAddingKeyword = false;
  searchQuery = '';

  showEditModal = false;
  editTarget: BlacklistedKeyword | null = null;
  editKeywordValue = '';
  isSavingEdit = false;

  showDeleteModal = false;
  deleteTarget: BlacklistedKeyword | null = null;
  isDeletingKeyword = false;

  // ─── Weights State ────────────────────────────────────────────────────────
  weights: AlgorithmWeights = { category: 20, text: 35, location: 25, time: 10, attributes: 10 };
  originalWeights: AlgorithmWeights = { category: 20, text: 35, location: 25, time: 10, attributes: 10 };
  isLoadingWeights = false;
  isSavingWeights = false;
  weightsError: string | null = null;
  weightsSuccess: string | null = null;

  readonly weightSliders: WeightSlider[] = [
    { key: 'category',   label: 'Danh mục',    icon: 'fas fa-tags',         description: 'Mức độ ưu tiên theo danh mục đồ vật',   color: '#6366f1' },
    { key: 'text',       label: 'Văn bản',     icon: 'fas fa-align-left',   description: 'Mức độ ưu tiên theo mô tả văn bản',      color: '#3b82f6' },
    { key: 'location',   label: 'Địa điểm',    icon: 'fas fa-map-marker-alt', description: 'Mức độ ưu tiên theo vị trí địa lý',  color: '#10b981' },
    { key: 'time',       label: 'Thời gian',   icon: 'fas fa-clock',        description: 'Mức độ ưu tiên theo thời điểm mất/nhặt', color: '#f59e0b' },
    { key: 'attributes', label: 'Thuộc tính',  icon: 'fas fa-list-ul',      description: 'Mức độ ưu tiên theo đặc điểm chi tiết',  color: '#ec4899' },
  ];

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.loadKeywords();
    this.loadWeights();
  }

  // ─── Blacklist Methods ────────────────────────────────────────────────────

  loadKeywords(): void {
    this.isLoadingKeywords = true;
    this.keywordError = null;
    this.adminService.getBlacklistedKeywords().subscribe({
      next: (data) => {
        this.keywords = data;
        this.isLoadingKeywords = false;
      },
      error: (err) => {
        console.error(err);
        this.keywordError = 'Không thể tải danh sách từ khóa. Vui lòng thử lại.';
        this.isLoadingKeywords = false;
      },
    });
  }

  get filteredKeywords(): BlacklistedKeyword[] {
    if (!this.searchQuery.trim()) return this.keywords;
    const q = this.searchQuery.toLowerCase();
    return this.keywords.filter(k => k.keyword.toLowerCase().includes(q));
  }

  get activeCount(): number { return this.keywords.filter(k => k.is_active).length; }
  get inactiveCount(): number { return this.keywords.filter(k => !k.is_active).length; }

  addKeyword(): void {
    const kw = this.newKeyword.trim();
    if (!kw) return;
    this.isAddingKeyword = true;
    this.keywordError = null;
    this.adminService.createBlacklistedKeyword(kw).subscribe({
      next: (created) => {
        this.keywords.unshift(created);
        this.newKeyword = '';
        this.isAddingKeyword = false;
        this.showKeywordSuccess('Thêm từ khóa thành công!');
      },
      error: (err) => {
        console.error(err);
        this.keywordError = err.error?.message || 'Thêm từ khóa thất bại.';
        this.isAddingKeyword = false;
      },
    });
  }

  toggleKeyword(kw: BlacklistedKeyword): void {
    const newState = !kw.is_active;
    this.adminService.toggleBlacklistedKeyword(kw._id, newState).subscribe({
      next: (updated) => {
        const idx = this.keywords.findIndex(k => k._id === kw._id);
        if (idx !== -1) this.keywords[idx] = updated;
        this.showKeywordSuccess(`${newState ? 'Kích hoạt' : 'Vô hiệu hóa'} từ khóa thành công!`);
      },
      error: (err) => {
        console.error(err);
        this.keywordError = 'Cập nhật trạng thái thất bại.';
      },
    });
  }

  openEditModal(kw: BlacklistedKeyword): void {
    this.editTarget = kw;
    this.editKeywordValue = kw.keyword;
    this.showEditModal = true;
  }

  saveEdit(): void {
    if (!this.editTarget || !this.editKeywordValue.trim()) return;
    this.isSavingEdit = true;
    this.adminService.updateBlacklistedKeyword(this.editTarget._id, { keyword: this.editKeywordValue.trim() }).subscribe({
      next: (updated) => {
        const idx = this.keywords.findIndex(k => k._id === this.editTarget!._id);
        if (idx !== -1) this.keywords[idx] = updated;
        this.showEditModal = false;
        this.editTarget = null;
        this.isSavingEdit = false;
        this.showKeywordSuccess('Cập nhật từ khóa thành công!');
      },
      error: (err) => {
        console.error(err);
        this.keywordError = 'Cập nhật thất bại.';
        this.isSavingEdit = false;
      },
    });
  }

  openDeleteModal(kw: BlacklistedKeyword): void {
    this.deleteTarget = kw;
    this.showDeleteModal = true;
  }

  confirmDelete(): void {
    if (!this.deleteTarget) return;
    this.isDeletingKeyword = true;
    this.adminService.deleteBlacklistedKeyword(this.deleteTarget._id).subscribe({
      next: () => {
        this.keywords = this.keywords.filter(k => k._id !== this.deleteTarget!._id);
        this.showDeleteModal = false;
        this.deleteTarget = null;
        this.isDeletingKeyword = false;
        this.showKeywordSuccess('Xóa từ khóa thành công!');
      },
      error: (err) => {
        console.error(err);
        this.keywordError = 'Xóa thất bại.';
        this.isDeletingKeyword = false;
      },
    });
  }

  closeModals(): void {
    this.showEditModal = false;
    this.showDeleteModal = false;
    this.editTarget = null;
    this.deleteTarget = null;
  }

  private showKeywordSuccess(msg: string): void {
    this.keywordSuccess = msg;
    setTimeout(() => { this.keywordSuccess = null; }, 3000);
  }

  // ─── Weights Methods ──────────────────────────────────────────────────────

  loadWeights(): void {
    this.isLoadingWeights = true;
    this.adminService.getAlgorithmWeights().subscribe({
      next: (data) => {
        this.weights = { ...data };
        this.originalWeights = { ...data };
        this.isLoadingWeights = false;
      },
      error: (err) => {
        console.error(err);
        this.weightsError = 'Không thể tải trọng số. Vui lòng thử lại.';
        this.isLoadingWeights = false;
      },
    });
  }

  get rawTotal(): number {
    return Object.values(this.weights).reduce((s, v) => s + Number(v), 0);
  }

  getNormalized(key: WeightKey): string {
    const total = this.rawTotal;
    if (total === 0) return '0.0';
    return ((this.weights[key] / total) * 100).toFixed(1);
  }

  get isTotalValid(): boolean { return this.rawTotal > 0; }

  get hasChanges(): boolean {
    return (Object.keys(this.weights) as WeightKey[]).some(k => this.weights[k] !== this.originalWeights[k]);
  }

  saveWeights(): void {
    if (!this.isTotalValid) return;
    this.isSavingWeights = true;
    this.weightsError = null;
    this.weightsSuccess = null;
    this.adminService.updateAlgorithmWeights({ ...this.weights }).subscribe({
      next: (res) => {
        this.originalWeights = { ...res.weights };
        this.weights = { ...res.weights };
        this.isSavingWeights = false;
        this.weightsSuccess = 'Trọng số đã được lưu và áp dụng thành công! Hệ thống đang re-score các gợi ý ghép đôi.';
        setTimeout(() => { this.weightsSuccess = null; }, 5000);
      },
      error: (err) => {
        console.error(err);
        this.weightsError = err.error?.message || 'Lưu trọng số thất bại.';
        this.isSavingWeights = false;
      },
    });
  }

  resetWeights(): void {
    this.weights = { ...this.originalWeights };
  }

  getSliderBackground(key: WeightKey, color: string): string {
    const val = this.weights[key];
    return `linear-gradient(to right, ${color} 0%, ${color} ${val}%, #e5e7eb ${val}%, #e5e7eb 100%)`;
  }
}
