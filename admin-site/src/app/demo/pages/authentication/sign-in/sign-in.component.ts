// angular import
import { ChangeDetectorRef, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { email, Field, form, minLength, required } from '@angular/forms/signals';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

// project import
import { SharedModule } from 'src/app/theme/shared/shared.module';

@Component({
  selector: 'app-sign-in',
  imports: [CommonModule, RouterModule, SharedModule, Field],
  templateUrl: './sign-in.component.html',
  styleUrls: ['./sign-in.component.scss']
})
export class SignInComponent {
  private cd = inject(ChangeDetectorRef);
  private http = inject(HttpClient);
  private router = inject(Router);

  submitted = signal(false);
  error = signal('');
  showPassword = signal(false);
  loading = signal(false);

  loginModal = signal<{ email: string; password: string }>({
    email: '',
    password: ''
  });

  loginForm = form(this.loginModal, (schemaPath) => {
    required(schemaPath.email, { message: 'Email is required' });
    email(schemaPath.email, { message: 'Enter a valid email address' });
    required(schemaPath.password, { message: 'Password is required' });
    minLength(schemaPath.password, 8, { message: 'Password must be at least 8 characters' });
  });

  onSubmit(event: Event) {
    this.submitted.set(true);
    this.error.set('');
    this.loading.set(true);
    event.preventDefault();

    const credentials = this.loginModal();
    this.http.post<{ accessToken: string; user: any }>(`${environment.apiUrl}/auth/login`, credentials).subscribe({
      next: (res) => {
        this.loading.set(false);
        const token = res.accessToken;
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.role !== 'ADMIN') {
            this.error.set('Tài khoản không có quyền truy cập Admin.');
            this.cd.detectChanges();
            return;
          }
        } catch {
          this.error.set('Token không hợp lệ.');
          this.cd.detectChanges();
          return;
        }
        localStorage.setItem('access_token', token);
        if (res.user) {
          localStorage.setItem('admin_user', JSON.stringify(res.user));
        }
        this.router.navigate(['/moderation']);
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err?.error?.message || 'Login failed';
        this.error.set(msg);
        this.cd.detectChanges();
      }
    });
  }

  togglePasswordVisibility() {
    this.showPassword.set(!this.showPassword());
  }
}
