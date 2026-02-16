// Angular Import
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

// Shared Components
import { CardComponent } from './shared/components/card/card.component';
import { StatusBadgeComponent } from './shared/components/status-badge/status-badge.component';
import { ItemCardComponent, ItemCard } from './shared/components/item-card/item-card.component';
import { PostStatus } from './shared/components/status-badge/status-badge.component';

// Mock Data
import { MOCK_ITEMS } from './shared/mock-data/items.mock';


@Component({
  selector: 'app-shared-components-demo',
  templateUrl: './shared-components-demo.component.html',
  styleUrls: ['./shared-components-demo.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    CardComponent,
    StatusBadgeComponent,
    ItemCardComponent
  ]
})
export class SharedComponentsDemoComponent implements OnInit {
  // Mock data
  mockItems: ItemCard[] = [];
  availableStatuses: PostStatus[] = [
    'DRAFT',
    'ARCHIVED',
    'PENDING_SYSTEM',
    'PENDING_ADMIN',
    'PENDING_APPROVAL',
    'APPROVED',
    'NEEDS_UPDATE',
    'RETURN_PENDING_CONFIRM',
    'RETURNED',
    'REJECTED'
  ];

  // Selected status for filtering
  selectedStatus: PostStatus = 'APPROVED';

  // Badge sizes for demo
  badgeSizes = ['badge-sm', 'badge-md', 'badge-lg'];

  ngOnInit() {
    this.mockItems = MOCK_ITEMS;
  }

  /**
   * Get items filtered by selected status
   */
  getFilteredItems(): ItemCard[] {
    return this.mockItems.filter(item => item.status === this.selectedStatus);
  }

  /**
   * Handle item card click
   */
  onItemCardClick(item: ItemCard) {
    console.log('Item clicked:', item);
  }

  /**
   * Handle like click
   */
  onLikeClick(item: ItemCard) {
    console.log('Like clicked:', item);
  }

  /**
   * Handle edit click
   */
  onEditClick(item: ItemCard) {
    console.log('Edit clicked:', item);
  }

  /**
   * Handle delete click
   */
  onDeleteClick(item: ItemCard) {
    console.log('Delete clicked:', item);
  }

  /**
   * Change selected status
   */
  changeStatus(status: PostStatus) {
    this.selectedStatus = status;
  }
}
