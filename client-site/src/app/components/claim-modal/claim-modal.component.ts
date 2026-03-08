import { Component, OnInit, Input, Output, EventEmitter, Inject, LOCALE_ID } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ClaimService } from '../../services/claim.service';

@Component({
    selector: 'app-claim-modal',
    templateUrl: './claim-modal.component.html',
    styleUrls: ['./claim-modal.component.scss'],
})
export class ClaimModalComponent implements OnInit {
    @Input() item: any = null;
    /** Nếu true thì bắt buộc phải tải ảnh bằng chứng */
    @Input() requireImage = false;
    @Output() close = new EventEmitter<void>();
    @Output() success = new EventEmitter<void>();

    form!: FormGroup;
    isSubmitting = false;
    error: string | null = null;
    evidenceImageUrl: string | null = null;
    evidenceImagePreview: string | null = null;
    uploadingImage = false;

    constructor(
        private fb: FormBuilder,
        private claimService: ClaimService,
        @Inject(LOCALE_ID) public localeId: string
    ) {}

    ngOnInit(): void {
        this.initForm();
    }

    initForm(): void {
        this.form = this.fb.group({
            message: ['', [Validators.required, Validators.minLength(20)]],
            secret_info: [''],
        });
    }

    onImageSelected(event: any): void {
        const files: FileList = event.target.files;
        if (!files.length) return;

        const file = files[0];

        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            this.error = 'Chỉ chấp nhận hình ảnh (JPEG, PNG, GIF, WebP)';
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            this.error = 'Kích thước hình ảnh không được vượt quá 5MB';
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
                    this.uploadingImage = false;
                };
                reader.readAsDataURL(file);
            },
            error: (err) => {
                console.error('Upload error:', err);
                this.error = 'Lỗi tải lên hình ảnh. Vui lòng thử lại.';
                this.uploadingImage = false;
            },
        });
    }

    removeImage(): void {
        this.evidenceImageUrl = null;
        this.evidenceImagePreview = null;
    }

    onSubmit(): void {
        if (!this.form.valid) {
            this.error = 'Vui lòng điền đầy đủ thông tin';
            return;
        }

        if (!this.item) {
            this.error = 'Không tìm thấy thông tin sản phẩm';
            return;
        }

        if (this.requireImage && !this.evidenceImageUrl) {
            this.error = 'Vui lòng tải lên ảnh bằng chứng (bắt buộc)';
            return;
        }

        this.isSubmitting = true;
        this.error = null;

        const payload = {
            post_id: this.item._id,
            message: this.form.get('message')?.value,
            secret_info: this.form.get('secret_info')?.value || undefined,
            image_proof_url: this.evidenceImageUrl || undefined,
        };

        this.claimService.submitClaim(payload).subscribe({
            next: (result) => {
                this.isSubmitting = false;
                // Emit success event
                this.success.emit();
            },
            error: (err) => {
                console.error('Submit error:', err);
                this.isSubmitting = false;
                this.error =
                    err.error?.message || 'Lỗi khi gửi yêu cầu. Vui lòng thử lại.';
            },
        });
    }

    closeModal(): void {
        this.close.emit();
    }

    get messageError(): string | null {
        const ctrl = this.form.get('message');
        if (!ctrl || !ctrl.touched) return null;
        if (ctrl.hasError('required')) return 'Vui lòng nhập nội dung bằng chứng';
        if (ctrl.hasError('minlength'))
            return 'Nội dung phải có ít nhất 20 ký tự';
        return null;
    }
}
