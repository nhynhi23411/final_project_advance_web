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
  brokenImageDataUri =
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='640' height='360'><rect width='100%25' height='100%25' fill='%23e2e8f0'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='20' fill='%2364748b'>Anh khong hop le</text></svg>";

  constructor(
    private router: Router,
    private itemService: ItemService,
  ) {}

  ngOnInit(): void {
    this.loadRecentItems();
  }

  loadRecentItems(): void {
    this.isLoadingItems = true;
    this.itemsError = null;
    // Optionally pass filters such as limit or status
    this.itemService.getItems({ status: "APPROVED", limit: "4" }).subscribe({
      next: (data) => {
        if (data && data.length) {
          // Ràng buộc nghiêm ngặt: Lọc dữ liệu client-side tránh API trả sai
          this.items = data.filter((item) => item.status === "APPROVED");
        } else {
          this.items = [];
        }
        this.isLoadingItems = false;
      },
      error: (err) => {
        console.error("Error fetching recent items", err);
        // fall back to empty list
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
