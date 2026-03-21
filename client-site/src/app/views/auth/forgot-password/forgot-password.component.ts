import { Component } from "@angular/core";
import { AuthService } from "../../../services/auth.service";

@Component({
  selector: "app-forgot-password",
  templateUrl: "./forgot-password.component.html",
})
export class ForgotPasswordComponent {
  email = "";
  message = "";
  errorMessage = "";
  loading = false;

  constructor(private authService: AuthService) {}

  submit(): void {
    this.loading = true;
    this.message = "";
    this.errorMessage = "";
    this.authService.forgotPassword(this.email).subscribe({
      next: (res) => {
        this.loading = false;
        this.message =
          res?.message ||
          "Nếu email tồn tại trong hệ thống, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.";
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.message || "Không thể gửi yêu cầu lúc này.";
      },
    });
  }
}
