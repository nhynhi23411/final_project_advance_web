import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStateService } from './auth-state.service';

export interface AdminUser {
  id: string;
  username: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  status?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthHelperService {
  constructor(
    private readonly router: Router,
    private readonly authState: AuthStateService
  ) {}

  getAdminUser(): AdminUser | null {
    const snapshot = this.authState.getCurrentUserSnapshot();
    if (!snapshot) return null;
    return snapshot as AdminUser;
  }

  getDisplayName(): string {
    const user = this.getAdminUser();
    return user?.name || user?.username || 'Admin';
  }

  logout(): void {
    this.authState.logout();
    this.router.navigate(['/login']);
  }
}
