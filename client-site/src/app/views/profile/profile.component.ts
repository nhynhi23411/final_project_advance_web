import { Component, OnInit } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Router } from "@angular/router";
import { environment } from "../../../environments/environment";
import { ItemService, Item } from "../../services/item.service";

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
  myPosts: Item[] = [];
  loading = true;
  loadingPosts = false;
  error: string | null = null;

  constructor(
    private http: HttpClient,
    private itemService: ItemService,
    private router: Router
  ) {}

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
          this.loadMyPosts();
        },
        error: (err) => {
          console.error("Profile load error", err);
          this.error = err?.error?.message || "Không thể tải thông tin hồ sơ.";
          this.loading = false;
        },
      });
  }

  loadMyPosts(): void {
    this.loadingPosts = true;
    this.itemService.getMyItems().subscribe({
      next: (data) => {
        this.myPosts = Array.isArray(data) ? data : [];
        this.loadingPosts = false;
      },
      error: () => {
        this.myPosts = [];
        this.loadingPosts = false;
      },
    });
  }

  getStatusLabel(s: string | undefined): string {
    if (!s) return "—";
    const m: Record<string, string> = {
      PENDING_SYSTEM: "Chờ duyệt",
      PENDING_ADMIN: "Chờ admin",
      APPROVED: "Đã duyệt",
      NEEDS_UPDATE: "Cần cập nhật",
      RETURNED: "Đã trả",
      REJECTED: "Từ chối",
      ARCHIVED: "Lưu trữ",
    };
    return m[s] || s;
  }

  getStatusClass(s: string | undefined): string {
    if (!s) return "text-blueGray-600 bg-blueGray-200";
    if (s === "APPROVED") return "text-emerald-600 bg-emerald-200";
    if (s === "REJECTED" || s === "ARCHIVED") return "text-red-600 bg-red-200";
    return "text-orange-600 bg-orange-200";
  }

  getTypeLabel(t: string): string {
    return t === "LOST" ? "Bị mất" : "Nhặt được";
  }

  formatDate(d: Date | string | undefined): string {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("vi-VN");
  }

  goToPostItem(): void {
    this.router.navigate(["/post-item"]);
  }

  viewItem(id: string): void {
    this.router.navigate(["/items", id]);
  }

  get resolvedCount(): number {
    return this.myPosts.filter((p) => (p as any).status === "RETURNED").length;
  }

  get pendingCount(): number {
    return this.myPosts.filter((p) => {
      const s = (p as any).status;
      return s === "PENDING_SYSTEM" || s === "PENDING_ADMIN";
    }).length;
  }
}
