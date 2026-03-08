import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { ItemService, Item } from "../../services/item.service";
import { SAMPLE_ITEMS } from '../../shared/sample-items';

@Component({
  selector: "app-landing",
  templateUrl: "./landing.component.html",
  styleUrls: ["./landing.component.scss"],
})
export class LandingComponent implements OnInit {
  items: Item[] = [];
  isLoadingItems = false;
  itemsError: string | null = null;
  isUsingSample = false;
  searchTerm = '';

  constructor(
    private router: Router,
    private itemService: ItemService
  ) {}

  ngOnInit(): void {
    this.loadRecentItems();
  }

  loadRecentItems(): void {
    this.isLoadingItems = true;
    this.itemsError = null;
    this.isUsingSample = false;
    // Optionally pass filters such as limit or status
    this.itemService.getItems({ status: 'APPROVED', limit: '4' }).subscribe({
      next: (data) => {
        if (data && data.length) {
          this.items = data;
        } else {
          // provide sample items so the UI can be tested when backend has no data
          this.isUsingSample = true;
          this.items = SAMPLE_ITEMS;
        }
        this.isLoadingItems = false;
      },
      error: (err) => {
        console.error('Error fetching recent items', err);
        // fall back to sample data so UI remains clickable
        this.isUsingSample = true;
        this.items = SAMPLE_ITEMS;
        this.itemsError = 'Không thể tải danh sách bài đăng.';
        this.isLoadingItems = false;
      },
    });
  }

  viewItemDetail(itemId: string): void {
    this.router.navigate(['/items', itemId]);
  }

  onSearch(): void {
    const q = this.searchTerm?.trim();
    this.router.navigate(['/posts'], { queryParams: q ? { q } : {} });
  }
}
