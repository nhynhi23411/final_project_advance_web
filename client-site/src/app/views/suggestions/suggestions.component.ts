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
  styleUrls: ['./suggestions.component.css'],
})
export class SuggestionsComponent implements OnInit {
  suggestions: MatchSuggestion[] = [];
  groupedSuggestions: GroupedSuggestion[] = [];
  isLoading = false;
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
      next: (data) => {
        this.suggestions = Array.isArray(data) ? data : [];
        this.groupedSuggestions = this.groupByMyPost(this.suggestions);
        this.isLoading = false;
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
