import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ItemService, Item, MatchSuggestion } from '../../services/item.service';
import { AuthService } from '../../services/auth.service';

export interface GroupedSuggestion {
  myPost: Item;
  matches: MatchSuggestion[];
}

@Component({
  selector: 'app-suggestions',
  templateUrl: './suggestions.component.html',
  styleUrls: ['./suggestions.component.scss'],
})
export class SuggestionsComponent implements OnInit {
  items: Item[] = [];
  suggestions: MatchSuggestion[] = [];
  groupedSuggestions: GroupedSuggestion[] = [];
  isLoading = false;
  error: string | null = null;

  constructor(
    private router: Router,
    private itemService: ItemService,
    public authService: AuthService,
  ) {}

  getItemTypeLabel(type: string | undefined): string {
    return type === 'LOST' ? 'Bị mất' : 'Nhặt được';
  }

  getItemTypeClass(type: string | undefined): string {
    return type === 'LOST'
      ? 'bg-red-100 text-red-600'
      : 'bg-emerald-100 text-emerald-600';
  }

  viewItemDetail(id: string): void {
    this.router.navigate(['/items', id]);
  }

  ngOnInit(): void {
    this.loadSuggestions();
  }

  /** Trả về true nếu bài đăng thuộc về user hiện tại (cần loại khỏi gợi ý). */
  private isOwnPost(item: Item): boolean {
    const currentId = this.authService.currentUserId;
    if (!currentId) return false;
    const ownerId =
      (item as any).created_by_user_id ??
      item.created_by ??
      (item as any).owner_id ??
      (item as any).user_id ??
      (item as any).createdBy;
    if (ownerId == null) return false;
    return String(ownerId) === String(currentId);
  }

  /** Loại bỏ bài của chính user hiện tại khỏi danh sách gợi ý. */
  private excludeOwnPosts(list: Item[]): Item[] {
    return list.filter((it) => !this.isOwnPost(it));
  }

  loadSuggestions(): void {
    if (!this.authService.isLoggedIn) {
      this.error = 'Bạn cần đăng nhập để xem gợi ý.';
      return;
    }
    this.isLoading = true;
    this.error = null;

    // 1. Tải Match Suggestions (Gợi ý chính xác từ server)
    this.itemService.getMatchSuggestions().subscribe({
      next: (res) => {
        this.suggestions = res || [];
        this.groupedSuggestions = this.groupByMyPost(this.suggestions);
      },
      error: (err) => {
        console.error('Lỗi khi tải Match Suggestions:', err);
      }
    });

    // 2. Tải Recommended Items (Gợi ý tương tự dựa trên category)
    this.itemService.getMyItems().subscribe({
      next: (myPosts) => {
        const myList = Array.isArray(myPosts) ? myPosts : [];
        const categories = [...new Set(myList.map((p) => (p.category || '').toLowerCase()).filter(Boolean))];
        const oppositeType = myList.some((p) => (p.type || p.post_type) === 'LOST') ? 'FOUND' : 'LOST';

        if (categories.length === 0) {
          this.itemService.getItems({ status: 'APPROVED', type: oppositeType }).subscribe({
            next: (data) => {
              const raw = (Array.isArray(data) ? data : []).slice(0, 12);
              this.items = this.excludeOwnPosts(raw);
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
            const raw = byCat.length ? byCat.slice(0, 12) : all.slice(0, 12);
            this.items = this.excludeOwnPosts(raw);
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

  private groupByMyPost(suggestions: MatchSuggestion[]): GroupedSuggestion[] {
    const map = new Map<string, GroupedSuggestion>();
    for (const s of suggestions) {
      if (!s.my_post) continue;
      const key = s.my_post._id;
      if (!map.has(key)) {
        map.set(key, { myPost: s.my_post, matches: [] });
      }
      map.get(key)!.matches.push(s);
    }
    return Array.from(map.values());
  }

  get totalMatches(): number {
    return this.suggestions.length;
  }

  goToPost(postId: string | undefined): void {
    if (postId) this.router.navigate(['/items', postId]);
  }

  scorePercent(score: number): number {
    return Math.round(score * 100);
  }

  getTypeLabel(type: string | undefined): string {
    return type === 'LOST' ? 'Bị mất' : 'Nhặt được';
  }

  getTypeClass(type: string | undefined): string {
    return type === 'LOST'
      ? 'bg-red-500 text-white'
      : 'bg-green-500 text-white';
  }

  getScoreClass(score: number): string {
    if (score >= 0.9) return 'score-high';
    if (score >= 0.75) return 'score-high';
    return 'score-med';
  }

  getScoreColorStyle(score: number): string {
    if (score >= 0.75) return 'color: #4f46e5';
    return 'color: #f59e0b';
  }
}
