import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { ItemService, Item } from "../../services/item.service";
import { AuthService } from "../../services/auth.service";

@Component({
  selector: "app-archive",
  templateUrl: "./archive.component.html",
})
export class ArchiveComponent implements OnInit {
  items: Item[] = [];
  isLoading = true;
  error: string | null = null;

  constructor(
    private itemService: ItemService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadArchive();
  }

  loadArchive(): void {
    this.isLoading = true;
    this.error = null;
    if (!this.authService.isLoggedIn) {
      this.items = [];
      this.isLoading = false;
      return;
    }
    this.itemService.getMyItems().subscribe({
      next: (data: any) => {
        const list = Array.isArray(data) ? data : data?.data || [];
        this.items = list.filter(
          (p: any) =>
            p.status === "ARCHIVED" || p.status === "RETURNED"
        );
        this.isLoading = false;
      },
      error: (err) => {
        console.error("Archive load error", err);
        this.items = [];
        this.error = err?.error?.message || "Không thể tải danh sách.";
        this.isLoading = false;
      },
    });
  }

  getStatusLabel(s: string | undefined): string {
    if (!s) return "—";
    const m: Record<string, string> = {
      RETURNED: "Đã trả đồ",
      ARCHIVED: "Lưu trữ",
    };
    return m[s] || s;
  }

  getStatusUelClass(s: string | undefined): string {
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

  goToPosts(): void {
    this.router.navigate(["/posts"]);
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
