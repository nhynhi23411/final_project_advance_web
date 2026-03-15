import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ItemService, MatchSuggestion } from '../../services/item.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-suggestions',
  templateUrl: './suggestions.component.html',
})
export class SuggestionsComponent implements OnInit {
  suggestions: MatchSuggestion[] = [];
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
        this.isLoading = false;
      },
      error: (err) => {
        this.error = err?.error?.message || 'Không thể tải gợi ý.';
        this.isLoading = false;
      },
    });
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
    if (score >= 0.9) return 'text-green-600';
    if (score >= 0.75) return 'text-blue-600';
    return 'text-yellow-600';
  }
}
