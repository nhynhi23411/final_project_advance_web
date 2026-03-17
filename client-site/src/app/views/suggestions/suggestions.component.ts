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
  isRefreshing = false;
  error: string | null = null;

  constructor(
    private router: Router,
    private itemService: ItemService,
    public authService: AuthService,
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

    this.itemService.getMatchSuggestions().subscribe({
      next: (res) => {
        this.suggestions = res || [];
        this.groupedSuggestions = this.groupByMyPost(this.suggestions);
      },
      error: (err) => {
        console.error('Lỗi khi tải Match Suggestions:', err);
      }
    });

    this.itemService.getMyItems().subscribe({
      next: (myPosts) => {
        const myList = Array.isArray(myPosts) ? myPosts : [];
        const categories = [...new Set(myList.map((p) => (p.category || '').toLowerCase()).filter(Boolean))];
        const oppositeType = myList.some((p) => (p.type || p.post_type) === 'LOST') ? 'FOUND' : 'LOST';

        this.itemService.getItems({ status: 'APPROVED', type: oppositeType }).subscribe({
          next: (data) => {
            const all = Array.isArray(data) ? data : [];
            const myIds = new Set(myList.map((p) => p._id));
            const others = all.filter((it) => !myIds.has(it._id));
            const byCat = categories.length
              ? others.filter((it) => {
                  const cat = (it.category || '').toLowerCase();
                  return categories.some((c) => cat.includes(c) || c.includes(cat));
                })
              : others;
            this.items = (byCat.length ? byCat : others).slice(0, 12);
            this.isLoading = false;
          },
          error: () => { this.items = []; this.isLoading = false; },
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
      if (!map.has(key)) map.set(key, { myPost: s.my_post, matches: [] });
      map.get(key)!.matches.push(s);
    }
    // Sort matches within each group by score descending
    const groups = Array.from(map.values());
    for (const g of groups) {
      g.matches.sort((a, b) => b.score - a.score);
    }
    // Sort groups by best match score descending
    groups.sort((a, b) => (b.matches[0]?.score ?? 0) - (a.matches[0]?.score ?? 0));
    return groups;
  }

  refreshSuggestions(): void {
    this.isRefreshing = true;
    this.suggestions = [];
    this.groupedSuggestions = [];
    this.items = [];
    this.loadSuggestions();
    setTimeout(() => { this.isRefreshing = false; }, 1200);
  }

  goToPost(postId: string | undefined): void {
    if (postId) this.router.navigate(['/items', postId]);
  }

  scorePercent(score: number): number {
    return Math.round(score * 100);
  }

  getScoreRing(score: number): string {
    if (score >= 0.85) return 'ring-high';
    if (score >= 0.70) return 'ring-med';
    return 'ring-low';
  }

  getScoreLabel(score: number): string {
    if (score >= 0.85) return 'Rất khớp';
    if (score >= 0.70) return 'Khá khớp';
    return 'Có thể khớp';
  }

  /** Primary CTA label shown on the match card button. */
  getCardCTA(matchedPost: Item | null, myPost: Item | null): string {
    const myType = myPost?.type || myPost?.post_type;
    if (myType === 'LOST') return 'Tôi đang giữ đồ này';
    return 'Xác nhận đồ của tôi';
  }

  /** Distance bar: 0–10km → 100%–0%. Capped at 0. */
  distScore(distKm: number): number {
    return Math.max(0, Math.round((1 - distKm / 10) * 100));
  }

  getTypeLabel(type: string | undefined): string {
    return type === 'LOST' ? 'Bị mất' : 'Nhặt được';
  }

  getTypeClass(type: string | undefined): string {
    return type === 'LOST' ? 'badge-lost' : 'badge-found';
  }

  getItemTypeLabel(type: string | undefined): string {
    return type === 'LOST' ? 'Bị mất' : 'Nhặt được';
  }

  getItemTypeClass(type: string | undefined): string {
    return type === 'LOST' ? 'badge-lost' : 'badge-found';
  }

  get totalMatches(): number {
    return this.suggestions.length;
  }
}
