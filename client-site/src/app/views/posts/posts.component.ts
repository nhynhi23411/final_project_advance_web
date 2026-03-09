import { Component, OnInit } from "@angular/core";
import { Router, ActivatedRoute } from "@angular/router";
import { ItemService, Item } from "../../services/item.service";
@Component({
  selector: "app-posts",
  templateUrl: "./posts.component.html",
})
export class PostsComponent implements OnInit {
  items: Item[] = [];
  isLoading = false;
  error: string | null = null;
  searchQuery = "";
  brokenImageDataUri =
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='640' height='360'><rect width='100%25' height='100%25' fill='%23e2e8f0'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='20' fill='%2364748b'>Anh khong hop le</text></svg>";

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private itemService: ItemService,
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.searchQuery = params["q"] || "";
      this.loadItems();
    });
  }

  loadItems(): void {
    this.isLoading = true;
    this.error = null;
    const filters: Record<string, string> = { status: "APPROVED" };
    if (this.searchQuery?.trim()) filters["q"] = this.searchQuery.trim();
    this.itemService.getItems(filters).subscribe({
      next: (data) => {
        const list = Array.isArray(data) ? data : [];
        const safeList = list.filter((item) => item.status === "APPROVED");
        if (safeList.length) {
          this.items = safeList.map((it) => this.normalizeItem(it));
        } else {
          this.items = [];
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error("Error fetching posts", err);
        this.items = [];
        this.error = err?.error?.message || "Không thể tải danh sách bài đăng.";
        this.isLoading = false;
      },
    });
  }

  private normalizeItem(it: any): Item {
    return {
      ...it,
      type: it.type || it.post_type || "LOST",
      location_text: it.location_text || it.location?.address || "",
      images: it.images || [],
      image_public_ids: it.image_public_ids || [],
    };
  }

  viewItemDetail(itemId: string): void {
    this.router.navigate(["/items", itemId]);
  }

  onSearch(): void {
    this.router.navigate(["/posts"], {
      queryParams: this.searchQuery?.trim()
        ? { q: this.searchQuery.trim() }
        : {},
      queryParamsHandling: "",
    });
  }

  getItemTypeLabel(type: string): string {
    return type === "LOST" ? "Bị mất" : "Nhặt được";
  }

  getItemTypeClass(type: string): string {
    return type === "LOST"
      ? "bg-red-100 text-red-600"
      : "bg-emerald-100 text-emerald-600";
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
