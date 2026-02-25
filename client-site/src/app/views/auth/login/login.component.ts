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

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}

  ngOnInit(): void {}

  handleLogin(): void {
    const payload = { email: this.email, password: this.password };
    this.http
      .post<any>("http://localhost:3000/api/auth/login", payload)
      .subscribe({
        next: (res) => {
          // Accept either snake_case or camelCase token key depending on API
          const token =
            res?.access_token || res?.accessToken || res?.accessToken;
          if (res && token) {
            localStorage.setItem("access_token", token);
            this.router.navigate(["/admin/dashboard"]);
          } else {
            alert("Đăng nhập thất bại");
          }
        },
        error: (err) => {
          console.error("Login error", err);
          alert(err?.error?.message || "Lỗi khi đăng nhập");
        },
      });
  }
}
