import { Component, Inject } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { ItemService } from "../../services/item.service";
import { Item } from "../../services/item.service";

export const CLOSE_REASON_OPTIONS: { value: string; label: string }[] = [
  { value: "FOUND", label: "Đã tìm thấy đồ" },
  { value: "RETURNED", label: "Đã trả đồ" },
  { value: "NO_LONGER_NEEDED", label: "Không còn nhu cầu" },
  { value: "OTHER", label: "Lý do khác" },
];

@Component({
  selector: "app-close-post-modal",
  templateUrl: "./close-post-modal.component.html",
  styleUrls: ["./close-post-modal.component.scss"],
})
export class ClosePostModalComponent {
  form!: FormGroup;
  isSubmitting = false;
  error: string | null = null;
  reasonOptions = CLOSE_REASON_OPTIONS;

  constructor(
    private fb: FormBuilder,
    private itemService: ItemService,
    private dialogRef: MatDialogRef<ClosePostModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { item: Item },
  ) {
    this.initForm();
  }

  get item(): Item {
    return this.data?.item;
  }

  get isOtherReason(): boolean {
    return this.form?.get("reason")?.value === "OTHER";
  }

  private initForm(): void {
    this.form = this.fb.group({
      reason: ["", Validators.required],
      custom_reason: [""],
    });
  }

  onSubmit(): void {
    this.error = null;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const reason = this.form.get("reason")?.value;
    const customReason = this.form.get("custom_reason")?.value;
    if (reason === "OTHER" && !customReason?.trim()) {
      this.error = "Vui lòng nhập lý do khi chọn \"Lý do khác\".";
      return;
    }
    if (!this.item?._id) return;
    this.isSubmitting = true;
    this.itemService
      .closePost(this.item._id, reason, customReason?.trim() || undefined)
      .subscribe({
        next: () => {
          this.dialogRef.close({ success: true });
        },
        error: (err) => {
          this.error = err?.message || "Không thể đóng bài đăng. Vui lòng thử lại.";
          this.isSubmitting = false;
        },
      });
  }

  closeModal(): void {
    this.dialogRef.close({ success: false });
  }
}
