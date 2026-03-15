import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { ItemService, Item } from "../../services/item.service";
import { ClaimService, MAX_CLAIMS_LIMIT } from "../../services/claim.service";
import { AuthService } from "../../services/auth.service";
import { ToastService } from "../../services/toast.service";
import {
  HttpClient,
  HttpHeaders,
  HttpErrorResponse,
} from "@angular/common/http";
import { environment } from "../../../environments/environment";
import { MatDialog } from "@angular/material/dialog";
import { ClaimModalComponent } from "../../components/claim-modal/claim-modal.component";

@Component({
  selector: "app-item-detail",
  templateUrl: "./item-detail.component.html",
  styleUrls: ["./item-detail.component.scss"],
})
export class ItemDetailComponent implements OnInit {
  item: Item | null = null;
  relatedItems: Item[] = [];
  activeClaimsCount = 0;
  isLoading = true;
  error: string | null = null;
  successMessage: string | null = null;
  MAX_CLAIMS_LIMIT = MAX_CLAIMS_LIMIT;
  selectedImage: string | null = null;
  selectedImageIndex = 0;
  hasClaimed = false;
  postClaims: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private itemService: ItemService,
    private claimService: ClaimService,
    public authService: AuthService,
    private toastService: ToastService,
    private http: HttpClient,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.loadItemDetail();
    this.loadActiveClaimsCount();
  }

  loadItemDetail(): void {
    const itemId = this.route.snapshot.paramMap.get("id");
    if (!itemId) {
      this.error = "Item ID not found";
      this.isLoading = false;
      return;
    }

    this.itemService.getItemById(itemId).subscribe({
      next: (item) => {
        this.item = item;
        this.selectedImageIndex = 0;
        this.isLoading = false;
        this.loadRelatedItems(item);
        if (this.authService.isLoggedIn) {
          this.checkIfClaimed(itemId);
          if (this.isOwner()) {
            this.loadClaimsForPost(itemId);
          }
        }
      },
      error: (err) => {
        console.error("Error loading item:", err);
        if (err.status === 404) {
          this.error = "Tin đăng không tồn tại.";
        } else {
          // show more descriptive message if available
          this.error = err?.error?.message || "Failed to load item details";
        }
        this.isLoading = false;
      },
    });
  }

  loadActiveClaimsCount(): void {
    this.claimService.getActiveClaimsCount().subscribe({
      next: (result) => {
        this.activeClaimsCount = result.count;
      },
      error: (err) => {
        console.error("Error loading claims count:", err);
        this.activeClaimsCount = 0;
      },
    });
  }

  checkIfClaimed(itemId: string): void {
    this.claimService.getMyClaimsForItem(itemId).subscribe({
      next: (claims) => {
        const active = claims.find(
          (c: any) => c.status !== "REJECTED" && c.status !== "CANCELLED",
        );
        if (active) {
          this.hasClaimed = true;
        }
      },
      error: (err) => {
        console.error("Error checking claim status:", err);
      },
    });
  }

  isOwner(): boolean {
    if (!this.item || !this.authService.isLoggedIn) return false;
    const ownerId = this.item.created_by_user_id || this.item.created_by;
    const myId = this.authService.currentUserId;
    return myId != null && ownerId != null && String(ownerId) === String(myId);
  }

  loadClaimsForPost(postId: string): void {
    this.claimService.getClaimsForPost(postId).subscribe({
      next: (claims) => {
        this.postClaims = claims;
      },
      error: (err) => {
        console.error("Lỗi khi tải danh sách claim cho bài viết:", err);
      },
    });
  }

  reviewClaim(
    claimId: string,
    action: "UNDER_VERIFICATION" | "SUCCESSFUL" | "REJECTED" | "CANCELLED",
  ): void {
    if (confirm(`Bạn có chắc chắn muốn thực hiện hành động này?`)) {
      this.claimService.reviewClaim(claimId, action).subscribe({
        next: () => {
          this.toastService.success("Cập nhật trạng thái claim thành công!");
          if (this.item && this.item._id) {
            this.loadClaimsForPost(this.item._id);
          }
        },
        error: (err) => {
          console.error(err);
          this.toastService.error("Có lỗi xảy ra khi xử lý yêu cầu.");
        },
      });
    }
  }

  getClaimStatusLabel(status: string): string {
    switch (status) {
      case "PENDING":
        return "Đang chờ";
      case "UNDER_VERIFICATION":
        return "Đang liên hệ";
      case "SUCCESSFUL":
        return "Hoàn tất (Trúng đồ)";
      case "REJECTED":
        return "Đã từ chối";
      case "CANCELLED":
        return "Đã hủy";
      default:
        return status;
    }
  }

  /**
   * Button should appear on approved items, but hide if current user is the post owner OR not logged in.
   */
  isClaimButtonVisible(): boolean {
    if (!this.item || this.item.status !== "APPROVED") return false;

    const ownerId = this.item.created_by_user_id || this.item.created_by;
    const myId = this.authService.currentUserId;

    // Ẩn bảng claim nếu user hiện tại chính là Chủ bài viết
    if (myId && ownerId && String(ownerId) === String(myId)) return false;

    return true;
  }

  goToLogin(): void {
    this.router.navigate(["/auth/login"]);
  }

  isClaimButtonDisabled(): boolean {
    // Disable if max claims limit reached or already claimed
    return this.activeClaimsCount >= MAX_CLAIMS_LIMIT || this.hasClaimed;
  }

  isSubmitting = false;

  handleClaimClick(): void {
    if (this.authService.isLoggedIn) {
      this.openClaimModal();
    } else {
      this.goToLogin();
    }
  }

  openClaimModal(): void {
    if (this.hasClaimed || this.isClaimButtonDisabled()) return;
    const dialogRef = this.dialog.open(ClaimModalComponent, {
      width: "680px",
      maxWidth: "95vw",
      disableClose: true,
      data: { item: this.item },
    });

    dialogRef.afterClosed().subscribe((result?: { success?: boolean }) => {
      if (result?.success) {
        this.onClaimSuccess();
      }
    });
  }

  async handleDirectClaim(): Promise<void> {
    if (!this.item) return;
    this.isSubmitting = true;

    try {
      const token = localStorage.getItem("access_token");
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      const body = { post_id: this.item._id };

      await this.http
        .post(`${environment.apiUrl}/claims`, body, { headers })
        .toPromise();

      this.onClaimSuccess();
    } catch (error: any) {
      if (error instanceof HttpErrorResponse) {
        const status = error.status;
        if (status === 400 || status === 401 || status === 403) {
          this.toastService.error(
            "Lỗi xác thực: Phản hồi bị từ chối do chưa đăng nhập hoặc không đủ quyền!",
          );
        } else if (status === 409) {
          this.toastService.warning(
            "Nhắc nhở: Bạn đã yêu cầu claim món đồ này trước đó rồi.",
          );
        } else if (status >= 500) {
          this.toastService.error(
            "Lỗi server: Hệ thống đang gặp sự cố, vui lòng thử lại sau.",
          );
        } else {
          this.toastService.error(`Đã có lỗi xảy ra (Code: ${status})`);
        }
      } else {
        this.toastService.error("Lỗi kết nối mạng, không phản hồi từ máy chủ.");
      }
    } finally {
      this.isSubmitting = false;
    }
  }

  onClaimSuccess(): void {
    this.hasClaimed = true;
    this.loadActiveClaimsCount();
    this.successMessage = "Yêu cầu xác minh đã được gửi.";
    this.toastService.success("Yêu cầu xác minh đã được gửi.");
    setTimeout(() => {
      this.successMessage = null;
    }, 5000);
  }

  loadRelatedItems(current: Item): void {
    this.itemService.getItems({ status: "APPROVED" }).subscribe({
      next: (list) => {
        const arr = Array.isArray(list) ? list : [];
        this.relatedItems = arr
          .filter((i) => i._id !== current._id)
          .filter(
            (i) =>
              (i.category && current.category && i.category === current.category) ||
              (i.location_text && current.location_text && String(i.location_text).toLowerCase().includes(String(current.location_text).toLowerCase().slice(0, 20)))
          )
          .slice(0, 6);
      },
      error: () => {
        this.relatedItems = [];
      },
    });
  }

  viewItem(id: string): void {
    this.router.navigate(["/items", id]);
  }

  closePost(): void {
    if (!this.item) return;
    this.toastService.info("Chức năng đóng bài đăng đang được cập nhật. Vui lòng liên hệ quản trị viên.");
  }

  goBack(): void {
    this.router.navigate(["/"]);
  }

  getItemTypeLabel(): string {
    return this.item?.type === "LOST" ? "Bị mất" : "Nhặt được";
  }

  getItemTypeClass(): string {
    return this.item?.type === "LOST"
      ? "bg-red-100 text-red-600"
      : "bg-emerald-100 text-emerald-600";
  }

  getItemTypeIcon(): string {
    return this.item?.type === "LOST"
      ? "fas fa-exclamation-circle"
      : "fas fa-hand-holding-heart";
  }

  getStatusLabel(): string {
    if (!this.item) return "";
    const statusMap: Record<string, string> = {
      PENDING_SYSTEM: "Chờ duyệt",
      PENDING_ADMIN: "Chờ admin",
      PENDING: "Chờ duyệt",
      APPROVED: "Đã duyệt",
      NEEDS_UPDATE: "Cần cập nhật",
      RETURNED: "Đã trả",
      REJECTED: "Từ chối",
      ARCHIVED: "Lưu trữ",
      MATCHED: "Đã match",
      COMPLETED: "Đã hoàn tất",
    };
    return statusMap[this.item.status] || this.item.status;
  }

  getStatusUelClass(): string {
    if (!this.item?.status) return "badge-uel-archived";
    const s = this.item.status;
    if (s === "APPROVED") return "badge-uel-approved";
    if (s === "PENDING_SYSTEM" || s === "PENDING_ADMIN" || s === "PENDING") return "badge-uel-pending";
    if (s === "NEEDS_UPDATE") return "badge-uel-need-update";
    if (s === "REJECTED") return "badge-uel-rejected";
    if (s === "ARCHIVED") return "badge-uel-archived";
    if (s === "RETURNED") return "badge-uel-returned";
    return "badge-uel-archived";
  }

  getRelatedStatusLabel(s: string | undefined): string {
    if (!s) return "—";
    const m: Record<string, string> = {
      PENDING_SYSTEM: "Chờ duyệt", PENDING_ADMIN: "Chờ admin", APPROVED: "Đã duyệt",
      NEEDS_UPDATE: "Cần cập nhật", RETURNED: "Đã trả", REJECTED: "Từ chối", ARCHIVED: "Lưu trữ",
    };
    return m[s] || s;
  }

  getRelatedStatusClass(s: string | undefined): string {
    if (!s) return "badge-uel-archived";
    if (s === "APPROVED") return "badge-uel-approved";
    if (s === "PENDING_SYSTEM" || s === "PENDING_ADMIN") return "badge-uel-pending";
    if (s === "REJECTED") return "badge-uel-rejected";
    if (s === "ARCHIVED") return "badge-uel-archived";
    if (s === "RETURNED") return "badge-uel-returned";
    return "badge-uel-archived";
  }

  setSelectedImage(index: number): void {
    this.selectedImageIndex = index;
  }

  getMainImageUrl(): string | null {
    if (!this.item?.images?.length) return null;
    return this.item.images[this.selectedImageIndex] ?? this.item.images[0];
  }

  formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
}
