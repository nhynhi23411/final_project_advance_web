import {
  Component,
  OnInit,
  Input,
  Output,
  EventEmitter,
  Inject,
  LOCALE_ID,
  Optional,
} from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { Router } from "@angular/router";
import { ClaimService } from "../../services/claim.service";
import { AuthService } from "../../services/auth.service";
import { ToastService } from "../../services/toast.service";

@Component({
  selector: "app-claim-modal",
  templateUrl: "./claim-modal.component.html",
  styleUrls: ["./claim-modal.component.scss"],
})
export class ClaimModalComponent implements OnInit {
  @Input() item: any = null;
  /** Bắt buộc phải tải ảnh bằng chứng */
  requireImage = true;
  @Output() close = new EventEmitter<void>();
  @Output() success = new EventEmitter<void>();

  form!: FormGroup;
  isSubmitting = false;
  error: string | null = null;
  evidenceImageUrl: string | null = null;
  evidenceImagePreview: string | null = null;
  uploadingImage = false;
  submitAttempted = false;
  selectedFileName: string | null = null;

  constructor(
    private fb: FormBuilder,
    private claimService: ClaimService,
    private authService: AuthService,
    private router: Router,
    private toastService: ToastService,
    @Inject(LOCALE_ID) public localeId: string,
    @Optional() private dialogRef: MatDialogRef<ClaimModalComponent>,
    @Optional()
    @Inject(MAT_DIALOG_DATA)
    private dialogData: { item: any } | null,
  ) {}

  ngOnInit(): void {
    if (!this.item && this.dialogData?.item) {
      this.item = this.dialogData.item;
    }
    this.initForm();
  }

  initForm(): void {
    this.form = this.fb.group({
      note: [""],
      secret_info: [""],
      image_proof_file: [null, Validators.required],
    });
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files: FileList | null = input?.files ?? null;
    if (!files || files.length === 0) return;

    const file = files[0];
    this.selectedFileName = file.name;

    const isImageMime = typeof file.type === "string" && file.type.startsWith("image/");
    if (!isImageMime) {
      this.error = "Chỉ chấp nhận tệp hình ảnh";
      input.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.error = "Kích thước hình ảnh không được vượt quá 5MB";
      input.value = "";
      return;
    }

    this.uploadingImage = true;
    this.error = null;

    this.claimService.uploadEvidenceImage(file).subscribe({
      next: (result) => {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.evidenceImageUrl = result.url;
          this.evidenceImagePreview = e.target.result;
          this.form.patchValue({ image_proof_file: file.name });
          this.form.get("image_proof_file")?.markAsTouched();
          this.uploadingImage = false;
        };
        reader.readAsDataURL(file);
      },
      error: (err) => {
        console.error("Upload error:", err);
        
        // Handle 401 Unauthorized - token expired or invalid
        if (err?.status === 401) {
          this.error = "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
          this.uploadingImage = false;
          input.value = "";
          
          // Auto logout after brief delay
          setTimeout(() => {
            this.authService.logout();
            this.router.navigate(["/auth/login"], {
              queryParams: { returnUrl: this.router.url },
            });
            this.toastService.error("Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.");
          }, 1500);
          return;
        }
        
        const backendMessage = err?.error?.message;
        const normalized = Array.isArray(backendMessage)
          ? backendMessage.join(", ")
          : backendMessage;
        this.error =
          typeof normalized === "string" && normalized.trim().length > 0
            ? `Lỗi tải ảnh: ${normalized}`
            : "Lỗi tải lên hình ảnh. Vui lòng thử lại.";
        this.uploadingImage = false;
        input.value = "";
      },
    });
  }

  removeImage(): void {
    this.evidenceImageUrl = null;
    this.evidenceImagePreview = null;
    this.selectedFileName = null;
    this.form.patchValue({ image_proof_file: null });
    this.form.get("image_proof_file")?.markAsTouched();
  }

  onSubmit(): void {
    this.submitAttempted = true;

    if (!this.form.valid) {
      this.error = "Vui lòng điền đầy đủ thông tin";
      return;
    }

    if (!this.item) {
      this.error = "Không tìm thấy thông tin sản phẩm";
      return;
    }

    if (this.requireImage && !this.evidenceImageUrl) {
      this.error = "Vui lòng tải lên ảnh chụp làm bằng chứng (Trường bắt buộc)";
      return;
    }

    this.isSubmitting = true;
    this.error = null;

    const payload = {
      post_id: this.item._id,
      message: this.form.get("note")?.value || undefined,
      secret_info: this.form.get("secret_info")?.value || undefined,
      image_proof_url: this.evidenceImageUrl || undefined,
    };

    this.claimService.submitClaim(payload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.closeSuccess();
      },
      error: (err) => {
        console.error("Submit error:", err);
        this.isSubmitting = false;
        
        // Handle 401 Unauthorized
        if (err?.status === 401) {
          this.error = "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
          setTimeout(() => {
            this.authService.logout();
            this.router.navigate(["/auth/login"], {
              queryParams: { returnUrl: this.router.url },
            });
            this.toastService.error("Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.");
          }, 1500);
          return;
        }
        
        this.error =
          err.error?.message || "Lỗi khi gửi yêu cầu. Vui lòng thử lại.";
      },
    });
  }

  get isFoundItem(): boolean {
    return (this.item?.type || this.item?.post_type) === "FOUND";
  }

  get modalTitle(): string {
    return this.isFoundItem ? "Xác nhận đây là đồ của tôi" : "Gửi yêu cầu xác minh";
  }

  get modalDescription(): string {
    return this.isFoundItem
      ? "Điền thông tin đối chiếu để người đang giữ món đồ xác minh rằng đây là tài sản của bạn."
      : "Mô tả hoàn cảnh mất hoặc bằng chứng liên quan để chủ bài đăng đối chiếu thêm.";
  }

  get submitLabel(): string {
    return this.isFoundItem ? "Gửi xác nhận" : "Gửi yêu cầu";
  }

  closeModal(): void {
    if (this.dialogRef) {
      this.dialogRef.close({ success: false });
      return;
    }
    this.close.emit();
  }

  private closeSuccess(): void {
    if (this.dialogRef) {
      this.dialogRef.close({ success: true });
      return;
    }
    this.success.emit();
  }
}
