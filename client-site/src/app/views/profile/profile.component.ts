import { Component, OnInit } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { environment } from "../../../environments/environment";

export interface MeUser {
  userId?: string;
  username?: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  status?: string;
}

@Component({
  selector: "app-profile",
  templateUrl: "./profile.component.html",
})
export class ProfileComponent implements OnInit {
  user: MeUser | null = null;
  loading = true;
  error: string | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.loading = true;
    this.error = null;
    const token = localStorage.getItem("access_token");
    if (!token) {
      this.loading = false;
      this.error = "Bạn cần đăng nhập để xem trang này.";
      return;
    }
    this.http
      .get<{ message: string; user: MeUser }>(`${environment.apiUrl}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .subscribe({
        next: (res) => {
          this.user = res.user || null;
          this.loading = false;
        },
        error: (err) => {
          console.error("Profile load error", err);
          this.error = err?.error?.message || "Không thể tải thông tin hồ sơ.";
          this.loading = false;
        },
      });
  }
}
