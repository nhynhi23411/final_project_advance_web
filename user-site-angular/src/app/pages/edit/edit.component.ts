import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ItemsService } from '../../services/items.service';
import { Item } from '../../models/item.model';

@Component({
  selector: 'app-edit',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './edit.component.html',
})
export class EditComponent implements OnInit {
  id = signal<string | null>(null);
  type: 'LOST' | 'FOUND' = 'LOST';
  title = '';
  description = '';
  category = '';
  color = '';
  brand = '';
  distinctive_marks = '';
  lost_found_date = '';
  location_text = '';
  loading = signal(true);
  saving = signal(false);
  error = signal('');

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private itemsService: ItemsService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Thiếu id tin');
      this.loading.set(false);
      return;
    }
    this.id.set(id);
    this.itemsService.getById(id).subscribe({
      next: (item: Item) => {
        this.type = (item.type as 'LOST' | 'FOUND') || 'LOST';
        this.title = item.title || '';
        this.description = item.description || '';
        this.category = item.category || '';
        this.color = item.color || '';
        this.brand = item.brand || '';
        this.distinctive_marks = item.distinctive_marks || '';
        this.lost_found_date = item.lost_found_date || '';
        this.location_text = item.location_text || '';
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.message || 'Không tải được tin');
        this.loading.set(false);
      },
    });
  }

  submit(): void {
    const loc = this.location_text.trim();
    if (!loc) {
      this.error.set('Địa điểm không được để trống');
      return;
    }
    const id = this.id();
    if (!id) return;
    this.error.set('');
    this.saving.set(true);
    this.itemsService
      .update(id, {
        type: this.type,
        title: this.title.trim(),
        description: this.description.trim() || undefined,
        category: this.category.trim() || undefined,
        color: this.color.trim() || undefined,
        brand: this.brand.trim() || undefined,
        distinctive_marks: this.distinctive_marks.trim() || undefined,
        lost_found_date: this.lost_found_date.trim() || undefined,
        location_text: loc,
      })
      .subscribe({
        next: () => this.router.navigate(['/detail', id]),
        error: (err) => {
          this.error.set(err?.message || 'Lưu thất bại');
          this.saving.set(false);
        },
        complete: () => this.saving.set(false),
      });
  }
}
