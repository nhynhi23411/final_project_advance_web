import { Component, OnInit } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Router } from "@angular/router";

@Component({
  selector: "app-login",
  templateUrl: "./login.component.html",
})
export class LoginComponent implements OnInit {
  email: string = "";
  password: string = "";
  errorMessage: string = "";

  constructor(
    private http: HttpClient,
    private router: Router,
  ) { }

  ngOnInit(): void { }

  handleLogin(): void {
    this.errorMessage = "";
    const payload = { email: this.email, password: this.password };
    this.http
      .post<any>("http://localhost:3000/api/auth/login", payload)
      .subscribe({
        next: (res) => {
          const token = res?.accessToken || res?.access_token;
          if (!res || !token) {
            this.errorMessage = "Đăng nhập thất bại";
            return;
          }

          if (res.user?.status === "BANNED") {
            this.errorMessage = "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.";
            return;
          }

          localStorage.setItem("access_token", token);
          if (res.user) {
            localStorage.setItem("user_info", JSON.stringify(res.user));
          }
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

