import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ItemService, Item } from '../../services/item.service';
import { SAMPLE_ITEMS } from '../../shared/sample-items';

@Component({
  selector: 'app-posts',
  templateUrl: './posts.component.html',
})
export class PostsComponent implements OnInit {
  items: Item[] = [];
  isLoading = false;
  error: string | null = null;
  isUsingSample = false;
  searchQuery = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private itemService: ItemService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.searchQuery = params['q'] || '';
      this.loadItems();
    });
  }

  loadItems(): void {
    this.isLoading = true;
    this.error = null;
    this.isUsingSample = false;
    const filters: Record<string, string> = { status: 'APPROVED' };
    if (this.searchQuery?.trim()) filters['q'] = this.searchQuery.trim();
    this.itemService.getItems(filters).subscribe({
      next: (data) => {
        const list = Array.isArray(data) ? data : [];
        if (list.length) {
          this.items = list.map((it) => this.normalizeItem(it));
        } else {
          this.isUsingSample = true;
          this.items = SAMPLE_ITEMS;
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching posts', err);
        this.isUsingSample = true;
        this.items = SAMPLE_ITEMS;
        this.error = err?.error?.message || 'Không thể tải danh sách bài đăng.';
        this.isLoading = false;
      },
    });
  }

  private normalizeItem(it: any): Item {
    return {
      ...it,
      type: it.type || it.post_type || 'LOST',
      location_text: it.location_text || it.location?.address || '',
      images: it.images || [],
      image_public_ids: it.image_public_ids || [],
    };
  }

  viewItemDetail(itemId: string): void {
    this.router.navigate(['/items', itemId]);
  }

  onSearch(): void {
    this.router.navigate(['/posts'], {
      queryParams: this.searchQuery?.trim() ? { q: this.searchQuery.trim() } : {},
      queryParamsHandling: '',
    });
  }

  getItemTypeLabel(type: string): string {
    return type === 'LOST' ? 'Bị mất' : 'Nhặt được';
  }

  getItemTypeClass(type: string): string {
    return type === 'LOST' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600';
  }
}
