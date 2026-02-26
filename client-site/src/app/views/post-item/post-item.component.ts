import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CATEGORIES, CATEGORY_METADATA, MetadataField } from '../../config/category-metadata.config';
import { ItemService, ItemPayload } from '../../services/item.service';
import { ImageUploaderComponent } from '../../components/image-uploader/image-uploader.component';

@Component({
    selector: 'app-post-item',
    templateUrl: './post-item.component.html',
})
export class PostItemComponent implements OnInit {
    @ViewChild('imageUploader') imageUploader!: ImageUploaderComponent;

    form!: FormGroup;
    categories = CATEGORIES;
    dynamicFields: MetadataField[] = [];
    submitting = false;
    submitError = '';
    submitSuccess = false;

    /** URLs & publicIds received from ImageUploader */
    private uploadedUrls: string[] = [];
    private uploadedPublicIds: string[] = [];

    constructor(
        private fb: FormBuilder,
        private itemService: ItemService,
        private router: Router,
    ) { }

    ngOnInit(): void {
        this.form = this.fb.group({
            type: ['', Validators.required],
            title: ['', [Validators.required, Validators.maxLength(200)]],
            category: ['', Validators.required],
            location_text: ['', Validators.required],
            lost_found_date: ['', Validators.required],
            description: [''],
        });

        // Watch category changes to load dynamic metadata fields
        this.form.get('category')!.valueChanges.subscribe((cat: string) => {
            this.onCategoryChange(cat);
        });
    }

    /* ---------- Dynamic fields ---------- */

    private onCategoryChange(category: string): void {
        // Remove old dynamic controls
        for (const field of this.dynamicFields) {
            if (this.form.contains(field.key)) {
                this.form.removeControl(field.key);
            }
        }

        // Load new fields
        this.dynamicFields = CATEGORY_METADATA[category] || [];

        // Add new controls
        for (const field of this.dynamicFields) {
            this.form.addControl(field.key, new FormControl(''));
        }
    }

    /* ---------- Image upload callback ---------- */

    onImagesChanged(data: { urls: string[]; publicIds: string[] }): void {
        this.uploadedUrls = data.urls;
        this.uploadedPublicIds = data.publicIds;
    }

    /* ---------- Submit ---------- */

    onSubmit(): void {
        // Mark all fields as touched to show validation errors
        Object.keys(this.form.controls).forEach((key) => {
            this.form.get(key)!.markAsTouched();
        });

        if (this.form.invalid) return;

        this.submitting = true;
        this.submitError = '';
        this.submitSuccess = false;

        const raw = this.form.value;

        // Build payload matching CreateItemDto
        const payload: ItemPayload = {
            type: raw.type,
            title: raw.title.trim(),
            category: raw.category,
            location_text: raw.location_text.trim(),
            lost_found_date: raw.lost_found_date
                ? new Date(raw.lost_found_date).toISOString()
                : undefined,
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
                // Optional: redirect or reset after short delay
                setTimeout(() => {
                    this.resetForm();
                }, 2000);
            },
            error: (err) => {
                this.submitting = false;
                this.submitError = err?.error?.message || 'Đăng tin thất bại. Vui lòng thử lại.';
            },
        });
    }

    /* ---------- Reset ---------- */

    resetForm(): void {
        this.form.reset({ type: '', category: '' });
        this.dynamicFields = [];
        this.uploadedUrls = [];
        this.uploadedPublicIds = [];
        this.submitError = '';
        this.submitSuccess = false;

        if (this.imageUploader) {
            this.imageUploader.reset();
        }
    }

    /* ---------- Helpers for template ---------- */

    isInvalid(name: string): boolean {
        const ctrl = this.form.get(name);
        return !!(ctrl && ctrl.invalid && ctrl.touched);
    }

    getError(name: string): string {
        const ctrl = this.form.get(name);
        if (!ctrl || !ctrl.errors) return '';
        if (ctrl.errors.required) return 'Trường này không được để trống';
        if (ctrl.errors.maxlength) {
            return `Tối đa ${ctrl.errors.maxlength.requiredLength} ký tự`;
        }
        return '';
    }
}
