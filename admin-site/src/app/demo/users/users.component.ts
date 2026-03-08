// angular imports
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { finalize } from 'rxjs';

// project imports
import { SharedModule } from 'src/app/theme/shared/shared.module';
import { AdminService, AdminUser } from 'src/app/services/admin.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss']
})
export class UsersComponent implements OnInit {
  users: AdminUser[] = [];
  loading = false;
  searchTerm = '';

  constructor(
    private adminService: AdminService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
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
      USER: 'User',
      FINDER: 'Finder'
    };
    return map[role || ''] || role || '-';
  }
}
