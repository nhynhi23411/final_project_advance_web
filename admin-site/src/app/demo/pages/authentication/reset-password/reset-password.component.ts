import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AdminService } from 'src/app/services/admin.service';

@Component({
  selector: 'app-reset-password',
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent {
  private adminService = inject(AdminService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  token = this.route.snapshot.queryParamMap.get('token') || '';
  newPassword = '';
  confirmPassword = '';
  loading = signal(false);
  message = signal('');
  error = signal('');

  submit(event: Event) {
    event.preventDefault();
    this.message.set('');
    this.error.set('');

    if (!this.token) {
      this.error.set('Token đặt lại mật khẩu không hợp lệ.');
      return;
    }
    if (!this.newPassword || this.newPassword.length < 6) {
      this.error.set('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.error.set('Xác nhận mật khẩu không khớp.');
      return;
    }

    this.loading.set(true);
    this.adminService.resetPassword(this.token, this.newPassword).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.message.set(res?.message || 'Đặt lại mật khẩu thành công.');
        setTimeout(() => this.router.navigate(['/login']), 1200);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || 'Không thể đặt lại mật khẩu.');
      }
    });
  }
}
