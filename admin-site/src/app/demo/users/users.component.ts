import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

import { SharedModule } from 'src/app/theme/shared/shared.module';
import { PageTitleComponent } from 'src/app/theme/shared/components/page-title/page-title.component';
import { AdminService, AdminUser } from 'src/app/services/admin.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [SharedModule, PageTitleComponent],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss']
})
export class UsersComponent implements OnInit {
  users: AdminUser[] = [];
  loading = false;
  searchTerm = '';

  showAddModal = false;
  addForm!: FormGroup;
  addSubmitting = false;
  addError = '';

  showEditModal = false;
  editForm!: FormGroup;
  editTarget: AdminUser | null = null;
  editSubmitting = false;
  editError = '';

  showStatusModal = false;
  statusTarget: AdminUser | null = null;
  statusSubmitting = false;
  statusError = '';

  showDeleteModal = false;
  deleteTarget: AdminUser | null = null;
  deleteSubmitting = false;
  deleteError = '';

  constructor(
    private adminService: AdminService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.addForm = this.fb.group({
      name: ['', Validators.required],
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      phone: ['', Validators.required],
      role: ['USER'],
    });
    this.editForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      role: ['USER'],
    });
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    this.adminService.getUsers(0, 100).pipe(
      finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: (list) => {
        this.users = list;
      },
      error: () => {
        this.users = [];
      }
    });
  }

  get filteredUsers(): AdminUser[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.users;
    return this.users.filter(
      (u) =>
        (u.username || '').toLowerCase().includes(term) ||
        (u.name || '').toLowerCase().includes(term) ||
        (u.email || '').toLowerCase().includes(term) ||
        (u.role || '').toLowerCase().includes(term) ||
        (u.status || '').toLowerCase().includes(term)
    );
  }

  getStatusBadgeClass(status: string | undefined): string {
    if (status === 'BANNED') return 'badge bg-danger';
    if (status === 'INACTIVE') return 'badge bg-secondary';
    return 'badge bg-success';
  }

  getRoleLabel(role: string | undefined): string {
    const map: Record<string, string> = {
      ADMIN: 'Admin',
      USER: 'Thành viên'
    };
    return map[role || ''] || role || '-';
  }

  private getApiMessage(err: any): string {
    const body = err?.error;
    if (body && typeof body === 'object' && body.message) {
      const m = body.message;
      return Array.isArray(m) ? m.join('. ') : String(m);
    }
    return err?.message || 'Có lỗi xảy ra. Vui lòng thử lại.';
  }

  openAddModal(): void {
    this.addForm.reset({ name: '', username: '', email: '', password: '', phone: '', role: 'USER' });
    this.addError = '';
    this.showAddModal = true;
  }

  closeAddModal(): void {
    this.showAddModal = false;
    this.addError = '';
  }

  submitAdd(): void {
    if (this.addForm.invalid) return;
    this.addSubmitting = true;
    this.addError = '';
    const v = this.addForm.value;
    this.adminService.createUser({
      name: v.name.trim(),
      username: v.username.trim().toLowerCase(),
      email: v.email.trim().toLowerCase(),
      password: v.password,
      phone: v.phone.trim(),
      role: v.role,
    }).subscribe({
      next: () => {
        this.closeAddModal();
        this.loadUsers();
      },
      error: (err) => {
        this.addError = this.getApiMessage(err);
      }
    }).add(() => {
      this.addSubmitting = false;
      this.cdr.markForCheck();
    });
  }

  openEditModal(u: AdminUser): void {
    this.editTarget = u;
    this.editForm.patchValue({
      name: u.name,
      email: u.email,
      phone: u.phone || '',
      role: u.role || 'USER',
    });
    this.editError = '';
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.editTarget = null;
    this.editError = '';
  }

  submitEdit(): void {
    if (!this.editTarget || this.editForm.invalid) return;
    this.editSubmitting = true;
    this.editError = '';
    const v = this.editForm.value;
    this.adminService.updateUser(this.editTarget._id, {
      name: v.name.trim(),
      email: v.email.trim().toLowerCase(),
      phone: v.phone.trim(),
      role: v.role,
    }).subscribe({
      next: () => {
        this.closeEditModal();
        this.loadUsers();
      },
      error: (err) => {
        this.editError = this.getApiMessage(err);
      }
    }).add(() => {
      this.editSubmitting = false;
      this.cdr.markForCheck();
    });
  }

  openStatusModal(u: AdminUser): void {
    this.statusTarget = u;
    this.statusError = '';
    this.showStatusModal = true;
  }

  closeStatusModal(): void {
    this.showStatusModal = false;
    this.statusTarget = null;
    this.statusError = '';
  }

  confirmStatus(): void {
    if (!this.statusTarget) return;
    this.statusSubmitting = true;
    this.statusError = '';
    const newStatus = this.statusTarget.status === 'BANNED' ? 'ACTIVE' : 'BANNED';
    this.adminService.updateUserStatus(this.statusTarget._id, newStatus).subscribe({
      next: () => {
        this.closeStatusModal();
        this.loadUsers();
      },
      error: (err) => {
        this.statusError = this.getApiMessage(err);
      }
    }).add(() => {
      this.statusSubmitting = false;
      this.cdr.markForCheck();
    });
  }

  openDeleteModal(u: AdminUser): void {
    this.deleteTarget = u;
    this.deleteError = '';
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.deleteTarget = null;
    this.deleteError = '';
  }

  confirmDelete(): void {
    if (!this.deleteTarget) return;
    this.deleteSubmitting = true;
    this.deleteError = '';
    this.adminService.deleteUser(this.deleteTarget._id).subscribe({
      next: () => {
        this.closeDeleteModal();
        this.loadUsers();
      },
      error: (err) => {
        this.deleteError = this.getApiMessage(err);
      }
    }).add(() => {
      this.deleteSubmitting = false;
      this.cdr.markForCheck();
    });
  }
}
