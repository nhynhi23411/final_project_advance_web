import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { ItemService, Item, ItemPayload, UploadResult } from "../../services/item.service";
import { ToastService } from "../../services/toast.service";
import { CATEGORIES } from "../../config/category-metadata.config";

@Component({
  selector: "app-edit-item",
  templateUrl: "./edit-item.component.html",
  styleUrls: ["./edit-item.component.scss"],
})
export class EditItemComponent implements OnInit {
  form!: FormGroup;
  itemId!: string;
  loading = false;
  saving = false;
  item: Item | null = null;
  previewImage: string | null = null;
  uploadError: string | null = null;
  rejectReason: string | null = null;
  isEditingLocked = false;
  lockedReason = "";

  /** File ảnh được chọn trong phiên chỉnh sửa */
  selectedFile: File | null = null;

  categories = CATEGORIES;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private itemService: ItemService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.itemId = this.route.snapshot.paramMap.get("id") || "";
    if (!this.itemId) {
      this.toastService.error("Không tìm thấy bài đăng cần chỉnh sửa.");
      this.router.navigate(["/profile"]);
      return;
    }
    this.buildForm();
    this.loadItem();
  }

  private buildForm(): void {
    this.form = this.fb.group({
      title: ["", [Validators.required, Validators.maxLength(200)]],
      description: [""],
      category: ["", Validators.required],
      color: [""],
      brand: [""],
      distinctive_marks: [""],
      lost_found_date: [""],
    });
  }

  private loadItem(): void {
    this.loading = true;
    this.itemService.getItemById(this.itemId).subscribe({
      next: (item) => {
        this.item = item;
        const anyItem: any = item as any;
        
        // Check if editing is locked based on status
        if (anyItem.status === "REJECTED" || anyItem.status === "ARCHIVED") {
          this.isEditingLocked = true;
          if (anyItem.status === "REJECTED") {
            this.lockedReason = "Bài đăng này đã bị từ chối và không thể chỉnh sửa.";
          } else if (anyItem.status === "ARCHIVED") {
            this.lockedReason = "Bài đăng này đã được lưu trữ và không thể chỉnh sửa.";
          }
        }
        
        this.form.patchValue({
          title: item.title,
          description: item.description,
          category: item.category,
          color: item.color,
          brand: item.brand || "",
          distinctive_marks: item.distinctive_marks || "",
          lost_found_date: item.lost_found_date
            ? new Date(item.lost_found_date).toISOString().substring(0, 10)
            : "",
        });
        
        // Disable form if editing is locked
        if (this.isEditingLocked) {
          this.form.disable();
        }
        
        this.previewImage = item.images && item.images.length > 0 ? item.images[0] : null;
        if (anyItem.status === "NEEDS_UPDATE" && anyItem.reject_reason) {
          this.rejectReason = anyItem.reject_reason;
        }
        this.loading = false;
      },
      error: (err) => {
        console.error("Lỗi khi tải bài đăng:", err);
        this.toastService.error(
          err?.error?.message || "Không thể tải bài đăng. Vui lòng thử lại."
        );
        this.loading = false;
        this.router.navigate(["/profile"]);
      },
    });
  }

  /** Bắt sự kiện chọn file từ input[type=file] */
  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      this.selectedFile = null;
      return;
    }
    const file = input.files[0];
    this.selectedFile = file;
    this.uploadError = null;

    // Preview trên UI
    const reader = new FileReader();
    reader.onload = () => {
      this.previewImage = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  onSubmit(): void {
    if (this.form.invalid || !this.item) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.saving) return;

    const value = this.form.value;

    // Dùng FormData để gửi cả text fields và (tùy chọn) file ảnh
    const formData = new FormData();
    formData.append("title", value.title);
    formData.append("category", value.category);
    if (value.description) formData.append("description", value.description);
    if (value.color) formData.append("color", value.color);
    if (value.brand) formData.append("brand", value.brand);
    if (value.distinctive_marks) {
      formData.append("distinctive_marks", value.distinctive_marks);
    }
    if (value.lost_found_date) {
      formData.append("lost_found_date", value.lost_found_date);
    }

    // Nếu backend vẫn cần giữ ảnh cũ khi không chọn ảnh mới, có thể gửi kèm id ảnh cũ
    if (!this.selectedFile && this.item?.images?.length) {
      formData.append("existing_image", this.item.images[0]);
    }

    // Nếu user chọn ảnh mới, append file vào FormData
    if (this.selectedFile) {
      // Tên field 'file' khớp với backend upload-image; có thể đổi thành 'image' nếu API yêu cầu
      formData.append("file", this.selectedFile, this.selectedFile.name);
    }

    this.saving = true;
    this.itemService.updateItem(this.itemId, formData).subscribe({
      next: () => {
        this.saving = false;
        this.toastService.success("Cập nhật bài đăng thành công.");
        this.router.navigate(["/profile"]);
      },
      error: (err) => {
        console.error("Lỗi khi cập nhật bài đăng:", err);
        const msg =
          err?.error?.message ||
          err?.error?.error ||
          "Không thể cập nhật bài đăng. Vui lòng thử lại.";
        this.toastService.error(msg);
        this.saving = false;
      },
    });
  }

  onCancel(): void {
    this.router.navigate(["/profile"]);
  }
}

