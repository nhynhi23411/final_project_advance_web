import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface ImagePreview {
    file: File;
    preview: string;
    uploading: boolean;
    done: boolean;
    url: string;
    publicId: string;
    error?: string;
}

@Component({
    selector: 'app-image-uploader',
    templateUrl: './image-uploader.component.html',
})
export class ImageUploaderComponent {
    @Input() maxImages = 5;
    @Input() maxSize = 5 * 1024 * 1024; // 5MB

    images: ImagePreview[] = [];
    dragOver = false;

    @Output() filesSelected = new EventEmitter<File[]>();

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
        if (event.dataTransfer?.files) {
            this.handleFiles(event.dataTransfer.files);
        }
    }

    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files) {
            this.handleFiles(input.files);
        }
        input.value = '';
    }

    private handleFiles(files: FileList): void {
        const remaining = this.maxImages - this.images.length;
        if (remaining <= 0) return;

        const validFiles: File[] = [];

        Array.from(files).slice(0, remaining).forEach(file => {
            if (!file.type.startsWith('image/') || file.size > this.maxSize) return;

            const img: ImagePreview = {
                file,
                preview: '',
                uploading: false,
                done: false,
                url: '',
                publicId: '',
            };

            const reader = new FileReader();
            reader.onload = (e) => { img.preview = e.target?.result as string; };
            reader.readAsDataURL(file);

            this.images.push(img);
            validFiles.push(file);
        });

        if (validFiles.length) {
            this.filesSelected.emit(validFiles);
        }
    }

    updateImageStatus(index: number, data: { uploading?: boolean; done?: boolean; url?: string; publicId?: string; error?: string }): void {
        if (this.images[index]) {
            Object.assign(this.images[index], data);
        }
    }

    removeImage(index: number): void {
        this.images.splice(index, 1);
    }

    reset(): void {
        this.images = [];
    }
}
