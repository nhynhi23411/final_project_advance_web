import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';

function clearAuth(): void {
  localStorage.removeItem('access_token');
  localStorage.removeItem('admin_user');
}

@Injectable({ providedIn: 'root' })
export class AdminAuthGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(): boolean {
    const token = localStorage.getItem('access_token');
    if (!token) {
      clearAuth();
      this.router.navigate(['/login']);
      return false;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.role !== 'ADMIN') {
        clearAuth();
        this.router.navigate(['/login']);
        return false;
      }

      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        clearAuth();
        this.router.navigate(['/login']);
        return false;
      }

      return true;
    } catch {
      clearAuth();
      this.router.navigate(['/login']);
      return false;
    }
  }
}
