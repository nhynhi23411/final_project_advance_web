import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { ItemService, Item } from "../../services/item.service";

@Component({
  selector: "app-landing",
  templateUrl: "./landing.component.html",
  styleUrls: ["./landing.component.scss"],
})
export class LandingComponent implements OnInit {
  items: Item[] = [];
  isLoadingItems = false;
  itemsError: string | null = null;
  searchTerm = "";
  statsTotalPosts = "—";
  statsFound = "—";
  statsUsers = "—";
  isUsingSample = false;
  categoryFilters = [
    { label: "Ví", value: "Ví", icon: "fas fa-wallet" },
    { label: "Điện thoại", value: "Điện thoại", icon: "fas fa-mobile-alt" },
    { label: "Laptop", value: "Laptop", icon: "fas fa-laptop" },
    { label: "Chìa khóa", value: "Chìa khóa", icon: "fas fa-key" },
    { label: "Thẻ sinh viên", value: "Thẻ sinh viên", icon: "fas fa-id-card" },
    { label: "Ba lô", value: "Ba lô", icon: "fas fa-backpack" },
  ];
  brokenImageDataUri =
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='640' height='360'><rect width='100%25' height='100%25' fill='%23e2e8f0'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='20' fill='%2364748b'>Anh khong hop le</text></svg>";

  constructor(
    private router: Router,
    private itemService: ItemService,
  ) {}

  ngOnInit(): void {
    this.loadRecentItems();
    this.loadStats();
  }

  loadStats(): void {
    this.itemService.getItems({}).subscribe({
      next: (list) => {
        try {
          const raw = Array.isArray(list) ? list : (list && (list as any).data && Array.isArray((list as any).data) ? (list as any).data : []);
          const arr = raw || [];
          this.statsTotalPosts = arr.length > 0 ? String(arr.length) : "0";
          const returned = arr.filter((i: any) => i != null && i.status === "RETURNED").length;
          this.statsFound = String(returned);
          this.statsUsers = "—";
        } catch (_) {
          this.statsTotalPosts = "0";
          this.statsFound = "0";
          this.statsUsers = "—";
        }
      },
      error: () => {
        this.statsTotalPosts = "0";
        this.statsFound = "0";
        this.statsUsers = "—";
      },
    });
  }

  /** Số bài tối đa hiển thị trên homepage (chỉ slice ở frontend). */
  readonly HOME_RECENT_LIMIT = 10;

  loadRecentItems(): void {
    this.isLoadingItems = true;
    this.itemsError = null;
    this.itemService.getItems({ status: "APPROVED" }).subscribe({
      next: (data) => {
        try {
          const raw = Array.isArray(data) ? data : (data && (data as any).data && Array.isArray((data as any).data) ? (data as any).data : []);
          const safe = (raw || []).filter((item: any) => item != null && item.status === "APPROVED");
          const sorted = [...safe].sort((a: any, b: any) => {
            const da = new Date(a.lost_found_date || a.created_at || 0).getTime();
            const db = new Date(b.lost_found_date || b.created_at || 0).getTime();
            return db - da;
          });
          this.items = sorted.slice(0, this.HOME_RECENT_LIMIT);
        } catch (_) {
          this.items = [];
        }
        this.isLoadingItems = false;
      },
      error: (_err) => {
        this.items = [];
        this.itemsError = "Không thể tải danh sách bài đăng.";
        this.isLoadingItems = false;
      },
    });
  }

  viewItemDetail(itemId: string): void {
    this.router.navigate(["/items", itemId]);
  }

  onSearch(): void {
    const q = this.searchTerm?.trim();
    this.router.navigate(["/posts"], { queryParams: q ? { q } : {} });
  }

  getItemImage(item: any): string | null {
    const candidates = Array.isArray(item?.images) ? item.images : [];
    const firstValid = candidates.find((url: any) => this.isValidImageUrl(url));
    return firstValid || null;
  }

  onImageError(event: Event): void {
    const el = event.target as HTMLImageElement;
    if (el && el.src !== this.brokenImageDataUri) {
      el.src = this.brokenImageDataUri;
    }
  }

  private isValidImageUrl(url: any): boolean {
    return (
      typeof url === "string" &&
      /^https?:\/\//i.test(url) &&
      url.trim().length > 0
    );
  }
}
