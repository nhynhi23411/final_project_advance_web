import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

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
  constructor(private router: Router) {}

  getAdminUser(): AdminUser | null {
    try {
      const raw = localStorage.getItem('admin_user');
      if (!raw) return null;
      return JSON.parse(raw) as AdminUser;
    } catch {
      return null;
    }
  }

  getDisplayName(): string {
    const user = this.getAdminUser();
    return user?.name || user?.username || 'Admin';
  }

  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('admin_user');
    this.router.navigate(['/login']);
  }
}
