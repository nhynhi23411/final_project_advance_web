import { Component, OnInit } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Router } from "@angular/router";

@Component({
  selector: "app-register",
  templateUrl: "./register.component.html",
})
export class RegisterComponent implements OnInit {
  name: string = "";
  email: string = "";
  password: string = "";

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}

  ngOnInit(): void {}

  handleRegister(): void {
    const payload = {
      name: this.name,
      email: this.email,
      password: this.password,
    };
    this.http
      .post<any>("http://localhost:3000/api/auth/register", payload)
      .subscribe({
        next: (res) => {
          // depending on API, may return created user or token
          alert("Đăng ký thành công");
          this.router.navigate(["/auth/login"]);
        },
        error: (err) => {
          console.error("Register error", err);
          alert(err?.error?.message || "Lỗi khi đăng ký");
        },
      });
  }
}
