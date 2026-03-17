import { Component, Inject, OnInit, Optional } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import {
  Item,
  ItemService,
  ManualMatchSuggestionResult,
} from "../../services/item.service";

interface LinkFoundPostModalData {
  lostItem: Item;
}

@Component({
  selector: "app-link-found-post-modal",
  templateUrl: "./link-found-post-modal.component.html",
  styleUrls: ["./link-found-post-modal.component.scss"],
})
export class LinkFoundPostModalComponent implements OnInit {
  lostItem: Item | null = null;
  myFoundPosts: Item[] = [];
  selectedFoundPostId = "";
  isLoading = false;
  isSubmitting = false;
  error: string | null = null;

  constructor(
    private readonly itemService: ItemService,
    @Optional() private readonly dialogRef: MatDialogRef<LinkFoundPostModalComponent>,
    @Optional()
    @Inject(MAT_DIALOG_DATA)
    private readonly dialogData: LinkFoundPostModalData | null,
  ) {}

  ngOnInit(): void {
    this.lostItem = this.dialogData?.lostItem || null;
    this.loadMyFoundPosts();
  }

  closeModal(payload: { success?: boolean; createNew?: boolean } = {}): void {
    this.dialogRef?.close(payload);
  }

  createNewFoundPost(): void {
    this.closeModal({ createNew: true });
  }

  submit(): void {
    if (!this.lostItem?._id) {
      this.error = "Không tìm thấy bài đăng mất đồ để liên kết.";
      return;
    }
    if (!this.selectedFoundPostId) {
      this.error = "Vui lòng chọn một bài nhặt được của bạn để liên kết.";
      return;
    }

    this.isSubmitting = true;
    this.error = null;

    this.itemService
      .createManualMatchSuggestion({
        lost_post_id: this.lostItem._id,
        found_post_id: this.selectedFoundPostId,
      })
      .subscribe({
        next: (result: ManualMatchSuggestionResult) => {
          this.isSubmitting = false;
          this.closeModal({ success: true, ...(result?.created === false ? {} : {}) });
        },
        error: (err) => {
          this.isSubmitting = false;
          this.error = err?.error?.message || "Không thể gửi gợi ý ghép nối lúc này.";
        },
      });
  }

  private loadMyFoundPosts(): void {
    this.isLoading = true;
    this.error = null;

    this.itemService.getMyItems().subscribe({
      next: (items) => {
        this.myFoundPosts = (Array.isArray(items) ? items : []).filter(
          (item) => item.status === "APPROVED" && (item.type || item.post_type) === "FOUND",
        );
        this.selectedFoundPostId = this.myFoundPosts[0]?._id || "";
        this.isLoading = false;
      },
      error: (err) => {
        this.error = err?.error?.message || "Không tải được danh sách bài nhặt được của bạn.";
        this.isLoading = false;
      },
    });
  }
}
