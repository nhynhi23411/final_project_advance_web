import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { ClaimService, Claim } from "../../services/claim.service";
import { ToastService } from "../../services/toast.service";

@Component({
  selector: "app-my-claims",
  templateUrl: "./my-claims.component.html",
  styleUrls: ["./my-claims.component.scss"],
})
export class MyClaimsComponent implements OnInit {
  claims: Claim[] = [];
  loading = false;

  /** Alias cho yêu cầu: myClaims để khớp yêu cầu đề bài */
  get myClaims(): Claim[] {
    return this.claims;
  }

  constructor(
    private claimService: ClaimService,
    private toastService: ToastService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadClaims();
  }

  loadClaims(): void {
    this.loading = true;
    this.claimService.getMyClaims().subscribe({
      next: (list) => {
        this.claims = list || [];
        this.loading = false;
      },
      error: (err) => {
        console.error("Lỗi khi tải danh sách claim:", err);
        this.toastService.error(
          err?.error?.message || "Không thể tải danh sách yêu cầu xác minh."
        );
        this.loading = false;
      },
    });
  }

  /** Lấy tiêu đề bài đăng từ dữ liệu claim đã populate. */
  getPostTitle(c: Claim & { target_post_id?: any; post_title?: string; item_title?: string }): string {
    const anyClaim: any = c as any;
    return (
      anyClaim.target_post_id?.title ||
      anyClaim.post_title ||
      anyClaim.item_title ||
      "Bài đăng"
    );
  }

  /** Lấy id bài đăng để điều hướng sang trang chi tiết. */
  getPostId(c: Claim & { target_post_id?: any }): string | null {
    const anyClaim: any = c as any;
    return anyClaim.target_post_id?._id || anyClaim.item_id || null;
  }

  formatDate(d: Date | string | undefined): string {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("vi-VN");
  }

  getStatusLabel(s: string | undefined): string {
    if (!s) return "—";
    const map: Record<string, string> = {
      PENDING: "Đang chờ",
      UNDER_VERIFICATION: "Đang xác minh",
      SUCCESSFUL: "Thành công",
      REJECTED: "Từ chối",
      CANCELLED: "Đã hủy",
    };
    return map[s] || s;
  }

  getStatusClass(s: string | undefined): string {
    if (!s) return "badge-uel-archived";
    if (s === "SUCCESSFUL") return "badge-uel-approved";
    if (s === "PENDING" || s === "UNDER_VERIFICATION") return "badge-uel-pending";
    if (s === "CANCELLED") return "badge-uel-returned";
    if (s === "REJECTED") return "badge-uel-rejected";
    return "badge-uel-archived";
  }

  canCancel(c: Claim): boolean {
    return c.status === "PENDING";
  }

  onCancelClaim(c: Claim): void {
    if (!this.canCancel(c)) return;
    const confirmed = window.confirm(
      "Bạn có chắc chắn muốn hủy yêu cầu này không? Hành động này không thể hoàn tác."
    );
    if (!confirmed) return;
    this.claimService.reviewClaim(c._id, "CANCELLED").subscribe({
      next: () => {
        this.toastService.success("Đã hủy yêu cầu xác minh.");
        this.claims = this.claims.map((cl) =>
          cl._id === c._id ? { ...cl, status: "CANCELLED" } : cl
        );
      },
      error: (err) => {
        console.error("Lỗi khi hủy claim:", err);
        this.toastService.error(
          err?.error?.message || "Không thể hủy yêu cầu. Vui lòng thử lại."
        );
      },
    });
  }
}

