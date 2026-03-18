import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { ItemService, Item } from "../../services/item.service";
import { ClaimService, MAX_CLAIMS_LIMIT } from "../../services/claim.service";
import { AuthService } from "../../services/auth.service";
import { ToastService } from "../../services/toast.service";
import {
  HttpClient,
  HttpErrorResponse,
} from "@angular/common/http";
import { environment } from "../../../environments/environment";
import { MatDialog } from "@angular/material/dialog";
import { ClaimModalComponent } from "../../components/claim-modal/claim-modal.component";
import { LinkFoundPostModalComponent } from "../../components/link-found-post-modal/link-found-post-modal.component";
import { ClosePostModalComponent } from "../../components/close-post-modal/close-post-modal.component";

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
  hasFinderSuggestion = false;
  hasOwnerSuggestionForThisPost = false;
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
    this.route.paramMap.subscribe((params) => {
      const id = params.get("id");
      if (id) {
        this.resetState();
        this.loadItemDetail(id);
        this.loadActiveClaimsCount();
      }
    });
  }

  private resetState(): void {
    this.item = null;
    this.relatedItems = [];
    this.isLoading = true;
    this.error = null;
    this.successMessage = null;
    this.hasClaimed = false;
    this.hasFinderSuggestion = false;
    this.hasOwnerSuggestionForThisPost = false;
    this.postClaims = [];
    this.selectedImageIndex = 0;
    this.selectedImage = null;
  }

  loadItemDetail(itemId: string): void {
    this.isLoading = true;
    this.error = null;

    this.itemService.getItemById(itemId).subscribe({
      next: (item) => {
        this.item = item;
        this.selectedImageIndex = 0;
        this.isLoading = false;
        this.loadRelatedItems(item);
        if (this.authService.isLoggedIn) {
          this.loadViewerActionState(itemId);
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
        this.hasClaimed = !!active;
      },
      error: (err) => {
        console.error("Error checking claim status:", err);
      },
    });
  }

  loadViewerActionState(itemId: string): void {
    this.checkIfClaimed(itemId);
    this.itemService.getMatchSuggestions().subscribe({
      next: (suggestions) => {
        const list = Array.isArray(suggestions) ? suggestions : [];
        this.hasFinderSuggestion = list.some(
          (suggestion) =>
            suggestion?.matched_post?._id === itemId &&
            (suggestion?.my_post?.type || suggestion?.my_post?.post_type) === "FOUND",
        );
        this.hasOwnerSuggestionForThisPost = list.some(
          (suggestion) =>
            suggestion?.matched_post?._id === itemId &&
            (suggestion?.my_post?.type || suggestion?.my_post?.post_type) === "LOST",
        );
      },
      error: (err) => {
        console.error("Error loading suggestion state:", err);
        this.hasFinderSuggestion = false;
        this.hasOwnerSuggestionForThisPost = false;
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
    if (myId && ownerId && String(ownerId) === String(myId)) return false;

    return true;
  }

  shouldShowPrimaryActionCard(): boolean {
    return !!this.item && this.item.status === "APPROVED" && !this.isOwner();
  }

  isLostItem(): boolean {
    return (this.item?.type || this.item?.post_type) === "LOST";
  }

  isFoundItem(): boolean {
    return (this.item?.type || this.item?.post_type) === "FOUND";
  }

  getPrimaryActionTitle(): string {
    return this.isLostItem() ? "Tôi đang giữ món đồ này" : "Xác nhận quyền sở hữu";
  }

  getPrimaryActionDescription(): string {
    if (this.isLostItem()) {
      return "Nếu bạn đang giữ món đồ này, hãy chọn một bài nhặt được của bạn để gửi gợi ý khớp tới chủ bài mất đồ.";
    }
    return this.hasOwnerSuggestionForThisPost
      ? "Bạn đã nhận được gợi ý khớp cho bài nhặt được này. Nếu đúng là đồ của bạn, hãy xác nhận để bắt đầu quy trình đối chiếu."
      : "Nếu bạn nghĩ đây là đồ của mình, hãy xác nhận để gửi yêu cầu đối chiếu tới người đang giữ món đồ.";
  }

  isPrimaryActionDisabled(): boolean {
    if (this.isLostItem()) {
      return this.isSubmitting || this.hasFinderSuggestion;
    }
    return this.isClaimButtonDisabled() || this.isSubmitting;
  }

  getPrimaryActionButtonLabel(): string {
    if (this.isLostItem()) {
      if (this.isSubmitting) return "Đang gửi gợi ý...";
      if (this.hasFinderSuggestion) return "Đã gửi gợi ý";
      return "Tôi đang giữ món đồ này";
    }
    if (this.isSubmitting) return "Đang gửi xác nhận...";
    if (this.hasClaimed) return "Đã gửi xác nhận";
    return "Xác nhận đây là đồ của tôi";
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
    if (!this.authService.isLoggedIn) {
      this.goToLogin();
      return;
    }

    if (this.isLostItem()) {
      this.openLinkFoundPostModal();
      return;
    }

    this.openClaimModal();
  }

  openLinkFoundPostModal(): void {
    if (!this.item || this.hasFinderSuggestion) return;

    const dialogRef = this.dialog.open(LinkFoundPostModalComponent, {
      width: "760px",
      maxWidth: "95vw",
      disableClose: true,
      data: { lostItem: this.item },
    });

    dialogRef.afterClosed().subscribe((result?: { success?: boolean; createNew?: boolean }) => {
      if (result?.createNew && this.item?._id) {
        this.router.navigate(["/post-item"], {
          queryParams: { type: "FOUND", linkLostId: this.item._id },
        });
        return;
      }

      if (result?.success) {
        this.hasFinderSuggestion = true;
        this.successMessage = "Đã gửi gợi ý khớp tới chủ bài mất đồ.";
        setTimeout(() => {
          this.successMessage = null;
        }, 5000);
      }
    });
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
      const body = { post_id: this.item._id };
 
      await this.http
        .post(`${environment.apiUrl}/claims`, body)
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

  /** Chỉ cho phép đóng khi bài đang APPROVED hoặc NEEDS_UPDATE. */
  canClosePost(): boolean {
    if (!this.item) return false;
    const s = this.item.status;
    return s === "APPROVED" || s === "NEEDS_UPDATE";
  }

  closePost(): void {
    if (!this.item || !this.canClosePost()) return;
    const dialogRef = this.dialog.open(ClosePostModalComponent, {
      width: "520px",
      maxWidth: "95vw",
      disableClose: false,
      data: { item: this.item },
    });
    dialogRef.afterClosed().subscribe((result?: { success?: boolean }) => {
      if (result?.success) {
        this.toastService.success("Bài đăng đã được đóng. Quản trị viên đã được thông báo.");
        this.loadItemDetail(this.item!._id);
      }
    });
  }

  goBack(): void {
    this.router.navigate(["/"]);
  }

  getPageTitle(): string {
    return this.isFoundItem() ? "Chi tiết đồ nhặt được" : "Chi tiết đồ thất lạc";
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
    if (!this.item) return null;
    const imgs = (this.item as any).images as string[] | undefined;
    if (!imgs || !imgs.length) return null;
    return imgs[this.selectedImageIndex] ?? imgs[0];
  }

  /** Điều hướng sang trang chỉnh sửa bài đăng */
  editItem(): void {
    if (!this.item?._id) return;
    this.router.navigate(["/edit-item", this.item._id]);
  }

  /** Xóa bài đăng ngay từ trang chi tiết */
  deleteItem(): void {
    if (!this.item?._id) return;
    const confirmed = window.confirm("Bạn có chắc muốn xóa bài đăng này?");
    if (!confirmed) return;

    this.itemService.deleteItem(this.item._id).subscribe({
      next: () => {
        this.toastService.success("Đã xóa bài đăng.");
        this.router.navigate(["/profile"]);
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

  formatDate(date: Date | string | undefined | null): string {
    if (!date) return "—";
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
}
