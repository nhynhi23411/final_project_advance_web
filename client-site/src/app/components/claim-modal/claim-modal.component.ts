import { Component, OnInit, Input, Output, EventEmitter, Inject, LOCALE_ID } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ClaimService } from '../../services/claim.service';
import { ItemService } from '../../services/item.service';

@Component({
    selector: 'app-claim-modal',
    templateUrl: './claim-modal.component.html',
    styleUrls: ['./claim-modal.component.scss'],
})
export class ClaimModalComponent implements OnInit {
    @Input() item: any = null;
    @Output() close = new EventEmitter<void>();
    @Output() success = new EventEmitter<void>();

    form!: FormGroup;
    isSubmitting = false;
    error: string | null = null;
    evidenceImages: { url: string; publicId: string; preview: string }[] = [];
    uploadingImage = false;

    constructor(
        private fb: FormBuilder,
        private claimService: ClaimService,
        private itemService: ItemService,
        @Inject(LOCALE_ID) public localeId: string
    ) {}

    ngOnInit(): void {
        this.initForm();
    }

    initForm(): void {
        this.form = this.fb.group({
            evidence_text: ['', [Validators.required, Validators.minLength(20)]],
        });
    }

    onImageSelected(event: any): void {
        const files: FileList = event.target.files;
        if (!files.length) return;

        const file = files[0];

        // Validate file
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            this.error = 'Chỉ chấp nhận hình ảnh (JPEG, PNG, GIF, WebP)';
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            // 5MB limit
            this.error = 'Kích thước hình ảnh không được vượt quá 5MB';
            return;
        }

        this.uploadingImage = true;
        this.error = null;

        this.claimService.uploadEvidenceImage(file).subscribe({
            next: (result) => {
                // Create preview
                const reader = new FileReader();
                reader.onload = (e: any) => {
                    this.evidenceImages.push({
                        url: result.url,
                        publicId: result.publicId,
                        preview: e.target.result,
                    });
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

    removeImage(index: number): void {
        this.evidenceImages.splice(index, 1);
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

        this.isSubmitting = true;
        this.error = null;

        const payload = {
            item_id: this.item._id,
            evidence_text: this.form.get('evidence_text')?.value,
            evidence_images: this.evidenceImages.map((img) => img.url),
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

    get evidenceTextError(): string | null {
        const ctrl = this.form.get('evidence_text');
        if (!ctrl || !ctrl.touched) return null;
        if (ctrl.hasError('required')) return 'Vui lòng nhập nội dung bằng chứng';
        if (ctrl.hasError('minlength'))
            return 'Nội dung phải có ít nhất 20 ký tự';
        return null;
    }
}
