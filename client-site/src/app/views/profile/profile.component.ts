import { Component, OnInit } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Router } from "@angular/router";
import { environment } from "../../../environments/environment";
import { ItemService, Item } from "../../services/item.service";
import { ToastService } from "../../services/toast.service";
import { NotificationService } from "../../services/notification.service";
import { AuthService } from "../../services/auth.service";

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
  styleUrls: ["./profile.component.scss"],
})
export class ProfileComponent implements OnInit {
  user: MeUser | null = null;
  myPosts: Item[] = [];
  loading = true;
  loadingPosts = false;
  error: string | null = null;
  activeTab: "posts" | "claims" | "archive" = "posts";

  /** Filter My Posts by type: all / LOST / FOUND */
  postTypeFilter: "all" | "LOST" | "FOUND" = "all";

  /** Edit profile */
  isEditing = false;
  saving = false;
  editForm = { name: "", email: "", phone: "" };
  editErrors: { name?: string; email?: string; phone?: string } = {};

  constructor(
    private http: HttpClient,
    private itemService: ItemService,
    public router: Router,
    private toastService: ToastService,
    private notificationService: NotificationService,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadProfile();
    // Mark all notifications as read when user opens Profile (e.g. NEEDS_UPDATE / REJECTED from admin)
    this.notificationService.markAllAsRead();
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
      .get<{ message: string; user: MeUser }>(`${environment.apiUrl}/me`)
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
      next: (data: any) => {
        // Xử lý trường hợp API trả về mảng hoặc object bọc { data: [...] }
        const list = Array.isArray(data) ? data : (data?.data || []);
        this.myPosts = list;
        this.loadingPosts = false;
      },
      error: (err) => {
        console.error("Lỗi khi tải danh sách tin:", err);
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

  /** UI only: map status to UEL badge class for consistent styling */
  getStatusUelClass(s: string | undefined): string {
    if (!s) return "badge-uel-archived";
    if (s === "APPROVED") return "badge-uel-approved";
    if (s === "PENDING_SYSTEM" || s === "PENDING_ADMIN") return "badge-uel-pending";
    if (s === "NEEDS_UPDATE") return "badge-uel-need-update";
    if (s === "REJECTED") return "badge-uel-rejected";
    if (s === "ARCHIVED") return "badge-uel-archived";
    if (s === "RETURNED") return "badge-uel-returned";
    return "badge-uel-archived";
  }

  getTypeLabel(t: string): string {
    return t === "LOST" ? "Bị mất" : "Nhặt được";
  }

  formatDate(d: Date | string | undefined): string {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("vi-VN");
  }

  /** Xóa bài đăng */
  onDeletePost(id: string): void {
    if (!id) return;
    const confirmed = window.confirm("Bạn có chắc muốn xóa bài đăng này?");
    if (!confirmed) return;

    this.itemService.deleteItem(id).subscribe({
      next: () => {
        this.myPosts = this.myPosts.filter((p) => p._id !== id);
        this.toastService.success("Đã xóa bài đăng.");
      },
      error: (err) => {
        console.error("Lỗi khi xóa bài đăng:", err);
        const msg =
          err?.error?.message ||
          err?.error?.error ||
          "Không thể xóa bài đăng. Vui lòng thử lại.";
        this.toastService.error(msg);
      },
    });
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

  get archivedPosts(): Item[] {
    return this.myPosts.filter((p) => {
      const s = (p as any).status;
      return s === "ARCHIVED" || s === "RETURNED";
    });
  }

  /** Bài đăng của user hiện tại, lọc theo postTypeFilter (type/post_type). */
  get filteredMyPosts(): Item[] {
    if (!this.myPosts.length) return [];
    if (this.postTypeFilter === "all") return this.myPosts;
    return this.myPosts.filter((p) => {
      const t = p.type ?? (p as any).post_type;
      return t === this.postTypeFilter;
    });
  }

  setTab(tab: "posts" | "claims" | "archive"): void {
    this.activeTab = tab;
  }

  setPostTypeFilter(value: "all" | "LOST" | "FOUND"): void {
    this.postTypeFilter = value;
  }

  /** Bật chế độ chỉnh sửa hồ sơ */
  startEdit(): void {
    if (!this.user) return;
    this.editForm = {
      name: this.user.name ?? "",
      email: "",
      phone: this.user.phone ?? "",
    };
    this.editErrors = {};
    this.isEditing = true;
  }

  /** Thoát chỉnh sửa, khôi phục dữ liệu cũ */
  cancelEdit(): void {
    this.isEditing = false;
    this.editForm = { name: "", email: "", phone: "" };
    this.editErrors = {};
  }

  /** Validation form: name không rỗng, email format, phone format cơ bản */
  private validateEditForm(): boolean {
    const e: { name?: string; email?: string; phone?: string } = {};
    const name = (this.editForm.name ?? "").trim();
    if (!name) e.name = "Họ tên không được để trống";
    const email = (this.editForm.email ?? "").trim();
    if (email) {
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRe.test(email)) e.email = "Email không đúng định dạng";
    }
    const phone = (this.editForm.phone ?? "").trim();
    if (phone) {
      const phoneRe = /^[\d\s+\-()]{8,20}$/;
      if (!phoneRe.test(phone)) e.phone = "Số điện thoại không đúng định dạng";
    }
    this.editErrors = e;
    return Object.keys(e).length === 0;
  }

  /** Gửi PATCH /me, cập nhật user từ response, toast kết quả */
  saveProfile(): void {
    if (!this.validateEditForm() || this.saving) return;
    const token = localStorage.getItem("access_token");
    if (!token) {
      this.toastService.error("Bạn cần đăng nhập để cập nhật hồ sơ.");
      return;
    }
    this.saving = true;
    const body = {
      name: this.editForm.name.trim() || undefined,
      phone: this.editForm.phone.trim() || undefined,
    };
    this.http
      .patch<{ message: string; user: MeUser }>(`${environment.apiUrl}/me`, body)
      .subscribe({
        next: (res) => {
          this.saving = false;
          if (res.user) {
            this.user = res.user;
            this.authService.setAuth(localStorage.getItem('access_token') || '', res.user as any);
          }
          this.isEditing = false;
          this.editErrors = {};
          this.toastService.success("Cập nhật hồ sơ thành công.");
        },
        error: (err) => {
          this.saving = false;
          const msg =
            err?.error?.message ||
            err?.error?.error ||
            "Không thể cập nhật hồ sơ. Vui lòng thử lại.";
          this.toastService.error(msg);
        },
      });
  }
}
