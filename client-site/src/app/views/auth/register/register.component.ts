import { Component, OnInit } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Router } from "@angular/router";
import { environment } from "../../../../environments/environment";

@Component({
  selector: "app-register",
  templateUrl: "./register.component.html",
})
export class RegisterComponent implements OnInit {
  name = "";
  username = "";
  email = "";
  phone = "";
  password = "";

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}

  ngOnInit(): void {}

  handleRegister(): void {
    const payload = {
      name: this.name,
      username: this.username,
      email: this.email,
      phone: this.phone,
      password: this.password,
    };
    this.http
      .post<any>(`${environment.apiUrl}/auth/register`, payload)
      .subscribe({
        next: (res) => {
          const token = res?.accessToken || res?.access_token;
          if (token) {
            localStorage.setItem("access_token", token);
            if (res.user) {
              localStorage.setItem("user_info", JSON.stringify(res.user));
            }
          }
          this.router.navigate(["/"]);
        },
        error: (err) => {
          console.error("Register error", err);
          alert(err?.error?.message || "Lỗi khi đăng ký");
        },
      });
  }
}
