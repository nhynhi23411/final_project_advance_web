import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ItemsService } from '../../services/items.service';
import { CreateItemPayload } from '../../models/item.model';

@Component({
  selector: 'app-create',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './create.component.html',
})
export class CreateComponent {
  type: 'LOST' | 'FOUND' = 'LOST';
  title = '';
  description = '';
  category = '';
  color = '';
  brand = '';
  distinctive_marks = '';
  lost_found_date = '';
  location_text = '';
  imageFiles: File[] = [];
  previewUrls: string[] = [];
  error = '';
  loading = false;

  constructor(
    private itemsService: ItemsService,
    private router: Router,
  ) {}

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []).slice(0, 5);
    this.imageFiles = files;
    this.previewUrls = files.map((f) => URL.createObjectURL(f));
  }

  submit(): void {
    const loc = this.location_text.trim();
    if (!loc) {
      this.error = 'Địa điểm không được để trống';
      return;
    }
    this.error = '';
    this.loading = true;

    const next = (images: string[], image_public_ids: string[]) => {
      const payload: CreateItemPayload = {
        type: this.type,
        title: this.title.trim(),
        description: this.description.trim() || undefined,
        category: this.category.trim() || undefined,
        color: this.color.trim() || undefined,
        brand: this.brand.trim() || undefined,
        distinctive_marks: this.distinctive_marks.trim() || undefined,
        lost_found_date: this.lost_found_date.trim() || undefined,
        location_text: loc,
        images: images.length ? images : undefined,
        image_public_ids: image_public_ids.length ? image_public_ids : undefined,
      };
      this.itemsService.create(payload).subscribe({
        next: (created) => {
          this.router.navigate(['/detail', created._id]);
        },
        error: (err) => {
          this.error = err?.message || 'Không tạo được bài';
          this.loading = false;
        },
        complete: () => (this.loading = false),
      });
    };

    if (this.imageFiles.length === 0) {
      next([], []);
      return;
    }

    const uploads: Array<Promise<{ url: string; publicId: string }>> = this.imageFiles.map((f) =>
      new Promise((resolve, reject) => {
        this.itemsService.uploadImage(f).subscribe({ next: resolve, error: reject });
      })
    );
    Promise.all(uploads)
      .then((results) => {
        next(
          results.map((r) => r.url),
          results.map((r) => r.publicId),
        );
      })
      .catch((err) => {
        this.error = err?.message || 'Upload ảnh thất bại';
        this.loading = false;
      });
  }
}
