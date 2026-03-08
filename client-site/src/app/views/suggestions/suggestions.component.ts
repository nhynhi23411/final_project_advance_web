import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ItemService, Item } from '../../services/item.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-suggestions',
  templateUrl: './suggestions.component.html',
})
export class SuggestionsComponent implements OnInit {
  items: Item[] = [];
  isLoading = false;
  error: string | null = null;

  constructor(
    private router: Router,
    private itemService: ItemService,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadSuggestions();
  }

  loadSuggestions(): void {
    if (!this.authService.isLoggedIn) {
      this.error = 'Bạn cần đăng nhập để xem gợi ý.';
      return;
    }
    this.isLoading = true;
    this.error = null;
    this.itemService.getMyItems().subscribe({
      next: (myPosts) => {
        const myList = Array.isArray(myPosts) ? myPosts : [];
        const categories = [...new Set(myList.map((p) => (p.category || '').toLowerCase()).filter(Boolean))];
        const oppositeType = myList.some((p) => (p.type || p.post_type) === 'LOST') ? 'FOUND' : 'LOST';
        if (categories.length === 0) {
          this.itemService.getItems({ status: 'APPROVED', type: oppositeType }).subscribe({
            next: (data) => {
              this.items = (Array.isArray(data) ? data : []).slice(0, 12);
              this.isLoading = false;
            },
            error: () => {
              this.items = [];
              this.isLoading = false;
            },
          });
          return;
        }
        this.itemService.getItems({ status: 'APPROVED', type: oppositeType }).subscribe({
          next: (data) => {
            const all = Array.isArray(data) ? data : [];
            const byCat = all.filter((it) => {
              const cat = (it.category || '').toLowerCase();
              return categories.some((c) => cat.includes(c) || c.includes(cat));
            });
            this.items = byCat.length ? byCat.slice(0, 12) : all.slice(0, 12);
            this.isLoading = false;
          },
          error: () => {
            this.items = [];
            this.isLoading = false;
          },
        });
      },
      error: (err) => {
        this.error = err?.error?.message || 'Không thể tải gợi ý.';
        this.isLoading = false;
      },
    });
  }

  viewItemDetail(itemId: string): void {
    this.router.navigate(['/items', itemId]);
  }

  getItemTypeLabel(type: string): string {
    return type === 'LOST' ? 'Bị mất' : 'Nhặt được';
  }

  getItemTypeClass(type: string): string {
    return type === 'LOST' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600';
  }
}
