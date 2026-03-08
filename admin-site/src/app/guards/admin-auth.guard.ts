import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AdminAuthGuard implements CanActivate {
    constructor(private router: Router) { }

    canActivate(): boolean {
        const token = localStorage.getItem('access_token');
        if (!token) {
            this.router.navigate(['/login']);
            return false;
        }

        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (payload.role !== 'ADMIN') {
                localStorage.removeItem('access_token');
                this.router.navigate(['/login']);
                return false;
            }

            const now = Math.floor(Date.now() / 1000);
            if (payload.exp && payload.exp < now) {
                localStorage.removeItem('access_token');
                this.router.navigate(['/login']);
                return false;
            }

            return true;
        } catch {
            localStorage.removeItem('access_token');
            this.router.navigate(['/login']);
            return false;
        }
    }
}
