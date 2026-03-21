import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService } from 'src/app/services/admin.service';

@Component({
  selector: 'app-forgot-password',
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent {
  private adminService = inject(AdminService);

  email = '';
  loading = signal(false);
  message = signal('');
  error = signal('');

  submit(event: Event) {
    event.preventDefault();
    this.loading.set(true);
    this.message.set('');
    this.error.set('');
    this.adminService.forgotPassword(this.email).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.message.set(
          res?.message ||
          'Nếu email tồn tại trong hệ thống, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.'
        );
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || 'Không thể gửi yêu cầu lúc này.');
      }
    });
  }
}
