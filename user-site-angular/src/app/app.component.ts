import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <nav class="navbar lf-navbar sticky-top">
      <div class="container py-2">
        <a class="navbar-brand fw-bold" routerLink="/home">Lost <span class="text-primary">&amp;</span> Found</a>
        <div class="d-flex gap-2 align-items-center">
          <a class="btn btn-outline-secondary btn-sm" routerLink="/create">Đăng tin</a>
          <a class="btn btn-outline-secondary btn-sm" routerLink="/my">Tin của tôi</a>
          @if (!auth.isLoggedIn()) {
            <a class="btn btn-outline-primary btn-sm" routerLink="/login">Đăng nhập</a>
          } @else {
            <span class="small lf-muted me-2">{{ auth.currentUser()?.name || auth.currentUser()?.email }}</span>
            <button class="btn btn-outline-danger btn-sm" type="button" (click)="logout()">Đăng xuất</button>
          }
        </div>
      </div>
    </nav>
    <main class="container my-4">
      <router-outlet />
    </main>
  `,
  styles: [],
})
export class AppComponent {
  constructor(public auth: AuthService) {}

  logout(): void {
    this.auth.logout();
    window.location.href = '/home';
  }
}
