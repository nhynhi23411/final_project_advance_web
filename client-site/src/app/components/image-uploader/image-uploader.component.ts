import { Component, EventEmitter, Output } from '@angular/core';
import { ItemService } from '../../services/item.service';

export interface UploadedImage {
    url: string;
    publicId: string;
    /** Local preview before/during upload */
    preview: string;
    /** Upload state */
    uploading: boolean;
    /** True once backend responded */
    done: boolean;
    /** Error message if upload failed */
    error?: string;
}

@Component({
    selector: 'app-image-uploader',
    templateUrl: './image-uploader.component.html',
})
export class ImageUploaderComponent {
    /** Max images allowed */
    maxImages = 5;
    /** Max file size in bytes (5 MB) */
    maxSize = 5 * 1024 * 1024;

    images: UploadedImage[] = [];
    dragOver = false;

    @Output() imagesChanged = new EventEmitter<{ urls: string[]; publicIds: string[] }>();

    constructor(private itemService: ItemService) { }

    /* ---------- Drag & Drop ---------- */

    onDragOver(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.dragOver = true;
    }

    onDragLeave(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.dragOver = false;
    }

    onDrop(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.dragOver = false;
        const files = event.dataTransfer?.files;
        if (files) {
            this.handleFiles(files);
        }
    }

    /* ---------- File input ---------- */

    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files) {
            this.handleFiles(input.files);
        }
        // Reset so the same file can be selected again
        input.value = '';
    }

    /* ---------- Core logic ---------- */

    private handleFiles(files: FileList): void {
        const remaining = this.maxImages - this.images.length;
        if (remaining <= 0) return;

        const toProcess = Array.from(files).slice(0, remaining);

        for (const file of toProcess) {
            // Validate type
            if (!file.type.startsWith('image/')) continue;
            // Validate size
            if (file.size > this.maxSize) continue;

            const reader = new FileReader();
            const img: UploadedImage = {
                url: '',
                publicId: '',
                preview: '',
                uploading: true,
                done: false,
            };

            reader.onload = (e) => {
                img.preview = e.target?.result as string;
            };
            reader.readAsDataURL(file);

            this.images.push(img);

            // Upload via backend → Cloudinary
            this.itemService.uploadImage(file).subscribe({
                next: (res) => {
                    img.url = res.url;
                    img.publicId = res.publicId;
                    img.uploading = false;
                    img.done = true;
                    this.emitChange();
                },
                error: (err) => {
                    img.uploading = false;
                    img.error = err?.error?.message || 'Upload thất bại';
                },
            });
        }
    }

    removeImage(index: number): void {
        this.images.splice(index, 1);
        this.emitChange();
    }

    private emitChange(): void {
        const uploaded = this.images.filter((i) => i.done);
        this.imagesChanged.emit({
            urls: uploaded.map((i) => i.url),
            publicIds: uploaded.map((i) => i.publicId),
        });
    }

    /** Reset all images (called when form resets) */
    reset(): void {
        this.images = [];
        this.emitChange();
    }
}
