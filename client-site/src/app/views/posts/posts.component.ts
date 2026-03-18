import { Component, OnInit, OnDestroy } from "@angular/core";
import { Router, ActivatedRoute } from "@angular/router";
import { BehaviorSubject, Observable, Subject } from "rxjs";
import { debounceTime, switchMap, map, takeUntil, startWith } from "rxjs/operators";
import { ItemService, Item } from "../../services/item.service";
import { CATEGORIES } from "../../config/category-metadata.config";
import { THU_DUC_WARDS } from "../post-item/post-item.component";

type PostTypeFilter = "" | "LOST" | "FOUND";
type TimeRangeKey = "" | "today" | "3days" | "7days" | "30days";
type SortKey = "newest" | "oldest" | "title" | "hasImage";

interface FilterState {
  type: PostTypeFilter;
  category: string;
  ward: string;
  timeRange: TimeRangeKey;
  hasImage: boolean;
  recent: boolean;
  sort: SortKey;
}

@Component({
  selector: "app-posts",
  templateUrl: "./posts.component.html",
})
export class PostsComponent implements OnInit, OnDestroy {
  /** Full list from API (status APPROVED, optional q). */
  allItems: Item[] = [];
  /** Filtered + sorted list for display. */
  filteredItems: Item[] = [];
  isLoading = false;
  error: string | null = null;
  searchQuery = "";
  brokenImageDataUri =
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='640' height='360'><rect width='100%25' height='100%25' fill='%23e2e8f0'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='20' fill='%2364748b'>Không có ảnh</text></svg>";

  categories: string[] = Array.isArray(CATEGORIES) ? CATEGORIES : [];
  wards: string[] = Array.isArray(THU_DUC_WARDS) ? THU_DUC_WARDS : [];

  filterPostType: PostTypeFilter = "";
  filterCategory = "";
  filterWard = "";
  filterTimeRange: TimeRangeKey = "";
  sortBy: SortKey = "newest";
  chipHasImage = false;
  chipRecent = false;

  /** BehaviorSubject for reactive filtering */
  private filterSubject = new BehaviorSubject<FilterState>({
    type: "",
    category: "",
    ward: "",
    timeRange: "",
    hasImage: false,
    recent: false,
    sort: "newest",
  } as FilterState);

  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private itemService: ItemService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      this.searchQuery = params["q"] || "";
      this.loadItems();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadItems(): void {
    this.isLoading = true;
    this.error = null;
    const filters: Record<string, string> = { status: "APPROVED" };
    if (this.searchQuery?.trim()) filters["q"] = this.searchQuery.trim();
    this.itemService.getItems(filters).subscribe({
      next: (data) => {
        try {
          const raw = Array.isArray(data)
            ? data
            : (data && typeof data === "object" && (data as any).data && Array.isArray((data as any).data)
              ? (data as any).data
              : []);
          const safeList = (raw || []).filter(
            (item: any) => item != null && item !== undefined && item.status === "APPROVED"
          );
          this.allItems = safeList.map((it: any) => this.normalizeItem(it));
          this.applyFilters();
        } catch (e) {
          console.error("Error processing posts data", e);
          this.allItems = [];
          this.applyFilters();
          this.error = "Lỗi xử lý dữ liệu bài đăng.";
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error("Error fetching posts", err);
        this.allItems = [];
        this.filteredItems = [];
        this.error =
          err?.error?.message || "Không thể tải danh sách bài đăng.";
        this.isLoading = false;
      },
    });
  }

  /** Trigger filter updates with debouncing */
  updateFilter(): void {
    this.filterSubject.next({
      type: this.filterPostType,
      category: this.filterCategory,
      ward: this.filterWard,
      timeRange: this.filterTimeRange,
      hasImage: this.chipHasImage,
      recent: this.chipRecent,
      sort: this.sortBy,
    });
    this.applyFilters();
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

  applyFilters(): void {
    try {
      let list = Array.isArray(this.allItems) ? [...this.allItems] : [];

    const type = this.filterPostType;
    if (type === "LOST" || type === "FOUND") {
      list = list.filter((item) => (item.type || item.post_type) === type);
    }

    if (this.filterCategory?.trim()) {
      const cat = this.filterCategory.trim();
      list = list.filter(
        (item) => (item.category || "").toLowerCase() === cat.toLowerCase()
      );
    }

    if (this.filterWard?.trim()) {
      const ward = this.filterWard.trim();
      list = list.filter((item) =>
        (item.location_text || "").includes(ward)
      );
    }

    if (this.filterTimeRange) {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const dayMs = 24 * 60 * 60 * 1000;
      let since: Date;
      switch (this.filterTimeRange) {
        case "today":
          since = todayStart;
          break;
        case "3days":
          since = new Date(todayStart.getTime() - 3 * dayMs);
          break;
        case "7days":
          since = new Date(todayStart.getTime() - 7 * dayMs);
          break;
        case "30days":
          since = new Date(todayStart.getTime() - 30 * dayMs);
          break;
        default:
          since = new Date(0);
      }
      list = list.filter((item) => {
        const d = this.getItemDate(item);
        return d && d.getTime() >= since.getTime();
      });
    }

    if (this.chipHasImage) {
      list = list.filter((item) => this.hasImage(item));
    }

    if (this.chipRecent) {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      list = list.filter((item) => {
        const d = this.getItemDate(item);
        return d && d.getTime() >= weekAgo.getTime();
      });
    }

    switch (this.sortBy) {
      case "oldest":
        // Sort ascending: oldest first (smallest dates first)
        list.sort((a, b) => {
          const dateA = this.getItemDate(a);
          const dateB = this.getItemDate(b);
          if (!dateA && !dateB) return 0;
          if (!dateA) return 1; // null dates go to end
          if (!dateB) return -1;
          return dateA.getTime() - dateB.getTime(); // ascending
        });
        break;
      case "title":
        // Alphabetical sort
        list.sort((a, b) =>
          (a.title || "").localeCompare(b.title || "", "vi")
        );
        break;
      case "hasImage":
        // Items with images first, then by newest
        list.sort((a, b) => {
          const ah = this.hasImage(a) ? 1 : 0;
          const bh = this.hasImage(b) ? 1 : 0;
          if (bh !== ah) return bh - ah;
          // Then by date descending (newest first)
          const dateA = this.getItemDate(a);
          const dateB = this.getItemDate(b);
          if (!dateA && !dateB) return 0;
          if (!dateA) return 1;
          if (!dateB) return -1;
          return dateB.getTime() - dateA.getTime(); // descending
        });
        break;
      case "newest":
      default:
        // Sort descending: newest first (largest dates first)
        list.sort((a, b) => {
          const dateA = this.getItemDate(a);
          const dateB = this.getItemDate(b);
          if (!dateA && !dateB) return 0;
          if (!dateA) return 1; // null dates go to end
          if (!dateB) return -1;
          return dateB.getTime() - dateA.getTime(); // descending (b before a if b is newer)
        });
        break;
    }

      this.filteredItems = list;
    } catch (e) {
      console.error("applyFilters error", e);
      this.filteredItems = Array.isArray(this.allItems) ? [...this.allItems] : [];
    }
  }

  private getItemDate(item: Item): Date | null {
    try {
      // Try lost_found_date first, then metadata, then created_at
      let raw = item.lost_found_date || (item as any).metadata?.lost_found_date || item.created_at;
      
      if (!raw) return null;
      
      // If already a Date object, validate and return
      if (raw instanceof Date) {
        return isNaN(raw.getTime()) ? null : raw;
      }
      
      // If it's a string, parse it
      if (typeof raw === "string") {
        const d = new Date(raw);
        return isNaN(d.getTime()) ? null : d;
      }
      
      return null;
    } catch (e) {
      console.error("Error parsing date:", e, item);
      return null;
    }
  }

  private compareDate(a: Date | null, b: Date | null, ascending: boolean): number {
    // Both null -> equal
    if (!a && !b) return 0;
    // a is null -> put at end (positive for ascending, negative for descending)
    if (!a) return ascending ? 1 : -1;
    // b is null -> put at end
    if (!b) return ascending ? -1 : 1;
    
    // Both have dates -> compare them
    const ta = a.getTime();
    const tb = b.getTime();
    return ascending ? ta - tb : tb - ta;
  }

  private hasImage(item: Item): boolean {
    const urls = item?.images || [];
    return urls.some(
      (url) =>
        typeof url === "string" &&
        url.trim().length > 0 &&
        /^https?:\/\//i.test(url)
    );
  }

  resetFilters(): void {
    this.filterPostType = "";
    this.filterCategory = "";
    this.filterWard = "";
    this.filterTimeRange = "";
    this.sortBy = "newest";
    this.chipHasImage = false;
    this.chipRecent = false;
    this.updateFilter();
  }

  get hasActiveFilters(): boolean {
    return !!(
      this.filterPostType ||
      this.filterCategory?.trim() ||
      this.filterWard?.trim() ||
      this.filterTimeRange ||
      this.chipHasImage ||
      this.chipRecent
    );
  }

  getStats(): {
    total: number;
    lost: number;
    found: number;
    newThisWeek: number;
  } {
    const list = Array.isArray(this.allItems) ? this.allItems : [];
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    let newThisWeek = 0;
    list.forEach((item) => {
      const d = this.getItemDate(item);
      if (d && d.getTime() >= weekAgo.getTime()) newThisWeek++;
    });
    return {
      total: list.length,
      lost: list.filter((i) => (i.type || i.post_type) === "LOST").length,
      found: list.filter((i) => (i.type || i.post_type) === "FOUND").length,
      newThisWeek,
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
    return type === "LOST" ? "Mất đồ" : "Nhặt được";
  }

  getItemTypeClass(type: string): string {
    return type === "LOST"
      ? "posts-badge-lost"
      : "posts-badge-found";
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

  getTimeRangeLabel(key: TimeRangeKey): string {
    const labels: Record<TimeRangeKey, string> = {
      "": "Tất cả thời gian",
      today: "Hôm nay",
      "3days": "3 ngày gần đây",
      "7days": "7 ngày gần đây",
      "30days": "30 ngày gần đây",
    };
    return labels[key] || key;
  }

  getSortLabel(key: SortKey): string {
    const labels: Record<SortKey, string> = {
      newest: "Mới nhất",
      oldest: "Cũ nhất",
      title: "A-Z theo tiêu đề",
      hasImage: "Ưu tiên có ảnh",
    };
    return labels[key] || key;
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
}
