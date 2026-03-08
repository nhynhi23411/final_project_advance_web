import { Component, OnInit } from "@angular/core";
import { AuthService } from "../../../services/auth.service";
import { Router } from "@angular/router";

@Component({
  selector: "app-login",
  templateUrl: "./login.component.html",
})
export class LoginComponent implements OnInit {
  email = "";
  password = "";
  errorMessage = "";

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {}

  handleLogin(): void {
    this.errorMessage = "";
    this.authService.login(this.email, this.password).subscribe({
      next: (res) => {
        const token = res?.accessToken || (res as any)?.access_token;
        if (!res || !token) {
          this.errorMessage = "Đăng nhập thất bại";
          return;
        }

        if (res.user?.status === "BANNED") {
          this.errorMessage = "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.";
          return;
        }

        this.authService.setAuth(token, res.user);
        this.router.navigate(["/"]);
      },
      error: (err) => {
        console.error("Login error", err);
        if (err?.status === 403) {
          this.errorMessage = err?.error?.message || "Tài khoản của bạn đã bị khóa.";
        } else {
          this.errorMessage = err?.error?.message || "Lỗi khi đăng nhập";
        }
      },
    });
  }
}

