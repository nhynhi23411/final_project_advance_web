import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { AuthService } from "../../../services/auth.service";

@Component({
  selector: "app-reset-password",
  templateUrl: "./reset-password.component.html",
})
export class ResetPasswordComponent implements OnInit {
  token = "";
  newPassword = "";
  confirmPassword = "";
  message = "";
  errorMessage = "";
  loading = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get("token") || "";
  }

  submit(): void {
    this.message = "";
    this.errorMessage = "";
    if (!this.token) {
      this.errorMessage = "Token đặt lại mật khẩu không hợp lệ.";
      return;
    }
    if (!this.newPassword || this.newPassword.length < 6) {
      this.errorMessage = "Mật khẩu mới phải có ít nhất 6 ký tự.";
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = "Xác nhận mật khẩu không khớp.";
      return;
    }

    this.loading = true;
    this.authService.resetPassword(this.token, this.newPassword).subscribe({
      next: (res) => {
        this.loading = false;
        this.message = res?.message || "Đặt lại mật khẩu thành công.";
        setTimeout(() => this.router.navigate(["/auth/login"]), 1200);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.message || "Không thể đặt lại mật khẩu.";
      },
    });
  }
}
