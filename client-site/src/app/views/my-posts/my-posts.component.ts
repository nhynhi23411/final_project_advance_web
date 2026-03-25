import { Component, OnInit } from "@angular/core";
import { Location } from "@angular/common";
import { Router } from "@angular/router";
import { ItemService, Item } from "../../services/item.service";
import { AuthService } from "../../services/auth.service";

@Component({
  selector: "app-my-posts",
  templateUrl: "./my-posts.component.html",
  styleUrls: ["./my-posts.component.scss"]
})
export class MyPostsComponent implements OnInit {
  items: Item[] = [];
  filteredItems: Item[] = [];
  isLoading = true;
  error: string | null = null;
  postTypeFilter: "all" | "LOST" | "FOUND" = "all";

  constructor(
    private itemService: ItemService,
    public authService: AuthService,
    private router: Router,
    private location: Location
  ) {}

  goBack(): void {
    this.router.navigate(['/']);
  }

  ngOnInit(): void {
    this.loadMyPosts();
  }

  loadMyPosts(): void {
    this.isLoading = true;
    this.error = null;
    if (!this.authService.isLoggedIn) {
      this.items = [];
      this.filteredItems = [];
      this.isLoading = false;
      return;
    }
    this.itemService.getMyItems().subscribe({
      next: (data: any) => {
        const list = Array.isArray(data) ? data : data?.data || [];
        this.items = list;
        this.applyFilter();
        this.isLoading = false;
      },
      error: (err) => {
        console.error("My posts load error", err);
        this.items = [];
        this.filteredItems = [];
        this.error = err?.error?.message || "Không thể tải danh sách bài đăng.";
        this.isLoading = false;
      },
    });
  }

  setPostTypeFilter(type: "all" | "LOST" | "FOUND"): void {
    this.postTypeFilter = type;
    this.applyFilter();
  }

  applyFilter(): void {
    if (this.postTypeFilter === "all") {
      this.filteredItems = this.items;
    } else {
      this.filteredItems = this.items.filter(
        (p) => (p.type || (p as any).post_type) === this.postTypeFilter
      );
    }
  }

  getTypeLabel(t: string | undefined): string {
    const type = String(t || "").toUpperCase();
    if (type === "LOST") return "Đồ bị mất";
    if (type === "FOUND") return "Đồ nhặt được";
    return type;
  }

  getStatusLabel(s: string | undefined): string {
    if (!s) return "—";
    const m: Record<string, string> = {
      OPEN: "Đang mở",
      APPROVED: "Đã duyệt",
      PENDING: "Chờ duyệt",
      PENDING_ADMIN: "Chờ duyệt",
      REJECTED: "Bị từ chối",
      NEEDS_UPDATE: "Cần sửa",
      ARCHIVED: "Lưu trữ",
      RETURNED: "Đã trả đồ",
      CLOSED: "Đã đóng"
    };
    return m[s] || s;
  }

  getStatusUelClass(s: string | undefined): string {
    if (!s) return "badge-uel-pending";
    if (s === "OPEN" || s === "APPROVED") return "badge-uel-approved";
    if (s === "PENDING" || s === "PENDING_ADMIN") return "badge-uel-pending";
    if (s === "REJECTED" || s === "NEEDS_UPDATE") return "badge-uel-rejected";
    if (s === "RETURNED") return "badge-uel-returned";
    return "badge-uel-archived";
  }

  formatDate(d: Date | string | undefined): string {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("vi-VN");
  }

  viewItem(id: string): void {
    this.router.navigate(["/items", id]);
  }

  goToPostItem(): void {
    this.router.navigate(["/post-item"]);
  }

  getItemImage(item: any): string | null {
    const urls = item?.images || [];
    const first = urls.find(
      (u: any) => typeof u === "string" && /^https?:\/\//i.test(u)
    );
    return first || null;
  }
}
