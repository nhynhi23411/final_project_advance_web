import { Component, OnInit } from "@angular/core";
import { AuthService } from "../../../services/auth.service";
import { ToastService } from "../../../services/toast.service";
import { Router } from "@angular/router";

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
  showPassword = false;

  constructor(
    private authService: AuthService,
    private toastService: ToastService,
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
    this.authService.register(payload).subscribe({
      next: (res: any) => {
        const token = res?.accessToken || res?.access_token;
        if (token) {
          this.authService.setAuth(token, res.user);
        }
        this.router.navigate(["/"]);
      },
      error: (err) => {
        console.error("Register error", err);
        let errMsg = "Lỗi khi đăng ký";
        if (err?.error?.message) {
          errMsg = Array.isArray(err.error.message) ? err.error.message.join(', ') : err.error.message;
        }
        this.toastService.error(errMsg);
      },
    });
  }
}
