import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CATEGORIES, CATEGORY_METADATA, MetadataField } from '../../config/category-metadata.config';
import { ItemService, ItemPayload } from '../../services/item.service';
import { ImageUploaderComponent } from '../../components/image-uploader/image-uploader.component';

/** Wards (phường) in Thành phố Thủ Đức, TP.HCM — predefined list. */
export const THU_DUC_WARDS: string[] = [
  'Phường Linh Xuân',
  'Phường Linh Trung',
  'Phường Linh Chiểu',
  'Phường Linh Tây',
  'Phường Linh Đông',
  'Phường Bình Thọ',
  'Phường Trường Thọ',
  'Phường Hiệp Bình Chánh',
  'Phường Hiệp Bình Phước',
  'Phường Tam Bình',
  'Phường Tam Phú',
  'Phường Bình Chiểu',
  'Phường Cát Lái',
  'Phường Thạnh Mỹ Lợi',
  'Phường An Khánh',
  'Phường An Lợi Đông',
  'Phường Thảo Điền',
  'Phường An Phú',
  'Phường Phước Long A',
  'Phường Phước Long B',
  'Phường Long Bình',
  'Phường Long Thạnh Mỹ',
  'Phường Tăng Nhơn Phú A',
  'Phường Tăng Nhơn Phú B',
  'Phường Phước Bình',
  'Phường Phú Hữu',
  'Phường Long Phước',
  'Phường Long Trường',
  'Phường Trường Thạnh',
  'Phường Thủ Thiêm',
];

const LOCATION_SUFFIX = ', Thành phố Thủ Đức, TP.HCM';

@Component({
    selector: 'app-post-item',
    templateUrl: './post-item.component.html',
})
export class PostItemComponent implements OnInit {
    @ViewChild('imageUploader') imageUploader!: ImageUploaderComponent;

    form!: FormGroup;
    categories = CATEGORIES;
    thuDucWards = THU_DUC_WARDS;
    dynamicFields: MetadataField[] = [];
    submitting = false;
    submitError = '';
    submitSuccess = false;

    private uploadedUrls: string[] = [];
    private uploadedPublicIds: string[] = [];

    constructor(
        private fb: FormBuilder,
        private itemService: ItemService,
        private router: Router,
        private route: ActivatedRoute,
    ) { }

    ngOnInit(): void {
        const typeParam = this.route.snapshot.queryParamMap.get('type');
        const initialType = (typeParam === 'LOST' || typeParam === 'FOUND') ? typeParam : '';
        this.form = this.fb.group({
            type: [initialType, Validators.required],
            title: ['', [Validators.required, Validators.maxLength(200)]],
            category: ['', Validators.required],
            ward: ['', Validators.required],
            address_detail: ['', Validators.required],
            lost_found_date: ['', [Validators.required, this.maxDateValidator]],
            description: [''],
        });

        this.form.get('category')!.valueChanges.subscribe((cat: string) => {
            this.onCategoryChange(cat);
        });
    }

    private onCategoryChange(category: string): void {
        for (const field of this.dynamicFields) {
            if (this.form.contains(field.key)) {
                this.form.removeControl(field.key);
            }
        }
        this.dynamicFields = CATEGORY_METADATA[category] || [];
        for (const field of this.dynamicFields) {
            this.form.addControl(field.key, new FormControl(''));
        }
    }

    onFilesSelected(files: File[]): void {
        files.forEach((file, i) => {
            const idx = this.imageUploader.images.length - files.length + i;
            this.imageUploader.updateImageStatus(idx, { uploading: true });

            this.itemService.uploadImage(file).subscribe({
                next: (res) => {
                    this.imageUploader.updateImageStatus(idx, {
                        uploading: false,
                        done: true,
                        url: res.url,
                        publicId: res.publicId,
                    });
                    this.syncUploadedImages();
                },
                error: (err) => {
                    this.imageUploader.updateImageStatus(idx, {
                        uploading: false,
                        error: err?.error?.message || 'Upload thất bại',
                    });
                },
            });
        });
    }

    private syncUploadedImages(): void {
        const done = this.imageUploader.images.filter(img => img.done);
        this.uploadedUrls = done.map(img => img.url);
        this.uploadedPublicIds = done.map(img => img.publicId);
    }

    onSubmit(): void {
        Object.keys(this.form.controls).forEach(key => {
            this.form.get(key)!.markAsTouched();
        });
        if (this.form.invalid) return;

        this.submitting = true;
        this.submitError = '';
        this.submitSuccess = false;

        const raw = this.form.value;
        const location_text = this.buildLocationText(raw.ward, raw.address_detail);
        const payload: ItemPayload = {
            type: raw.type,
            title: raw.title.trim(),
            category: raw.category,
            location_text,
            lost_found_date: raw.lost_found_date ? new Date(raw.lost_found_date).toISOString() : undefined,
            description: raw.description?.trim() || undefined,
            color: raw.color?.trim() || undefined,
            brand: raw.brand?.trim() || undefined,
            distinctive_marks: raw.distinctive_marks?.trim() || undefined,
            images: this.uploadedUrls.length ? this.uploadedUrls : undefined,
            image_public_ids: this.uploadedPublicIds.length ? this.uploadedPublicIds : undefined,
        };

        this.itemService.createItem(payload).subscribe({
            next: () => {
                this.submitting = false;
                this.submitSuccess = true;
                this.submitError = '';
                // Redirect to home page after 3 seconds
                setTimeout(() => {
                    this.router.navigate(['/']);
                }, 3000);
            },
            error: (err: any) => {
                this.submitting = false;
                const apiMessage = err?.message
                    || err?.error?.message
                    || (typeof err?.error === 'string' ? err.error : null);
                this.submitError = apiMessage || 'Đăng tin thất bại. Vui lòng thử lại.';
            },
        });
    }

    resetForm(): void {
        this.form.reset({ type: '', category: '', ward: '', address_detail: '' });
        this.dynamicFields = [];
        this.uploadedUrls = [];
        this.uploadedPublicIds = [];
        this.submitError = '';
        this.submitSuccess = false;
        if (this.imageUploader) this.imageUploader.reset();
    }

    isInvalid(name: string): boolean {
        const ctrl = this.form.get(name);
        return !!(ctrl && ctrl.invalid && ctrl.touched);
    }

    getError(name: string): string {
        const ctrl = this.form.get(name);
        if (!ctrl || !ctrl.errors) return '';
        if (ctrl.errors.required) {
            if (name === 'ward') return 'Vui lòng chọn phường';
            if (name === 'address_detail') return 'Vui lòng nhập chi tiết địa chỉ';
            return 'Trường này không được để trống';
        }
        if (ctrl.errors.maxlength) return `Tối đa ${ctrl.errors.maxlength.requiredLength} ký tự`;
        if (ctrl.errors.maxDate) return 'Chỉ được chọn ngày hôm nay hoặc trước đó';
        return '';
    }

    /** Build single location string for backend: "[detail], [ward], Thành phố Thủ Đức, TP.HCM" */
    private buildLocationText(ward: string, addressDetail: string): string {
        const detail = (addressDetail || '').trim();
        const w = (ward || '').trim();
        if (!detail && !w) return LOCATION_SUFFIX;
        if (!detail) return `${w}${LOCATION_SUFFIX}`;
        if (!w) return `${detail}${LOCATION_SUFFIX}`;
        return `${detail}, ${w}${LOCATION_SUFFIX}`;
    }

    get maxDate(): string {
        return new Date().toISOString().split('T')[0];
    }

    private maxDateValidator = (control: { value: string }) => {
        if (!control.value) return null;
        const today = new Date().toISOString().split('T')[0];
        return control.value > today ? { maxDate: true } : null;
    };

    goBack(): void {
        this.router.navigate(['/']);
    }
}
