// Angular Import
import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';

// Import StatusBadgeComponent
import { StatusBadgeComponent, PostStatus } from '../status-badge/status-badge.component';

export interface ItemCard {
  id?: string | number;
  title: string;
  description: string;
  category: string;
  status: PostStatus;
  image?: string;
  location?: string;
  date?: string;
  owner?: string;
  likes?: number;
  comments?: number;
  isLiked?: boolean;
}

@Component({
  selector: 'app-item-card',
  imports: [CommonModule, StatusBadgeComponent],
  templateUrl: './item-card.component.html',
  styleUrls: ['./item-card.component.scss'],
  standalone: true
})
export class ItemCardComponent {
  // Input signals
  item = input<ItemCard>({
    title: 'Unknown Item',
    description: 'No description',
    category: 'Others',
    status: 'DRAFT',
    isLiked: false,
    likes: 0,
    comments: 0
  });

  showImage = input<boolean>(true);
  showStatus = input<boolean>(true);
  cardClass = input<string>('');

  // Output events
  cardClick = output<ItemCard>();
  likeClick = output<ItemCard>();
  editClick = output<ItemCard>();
  deleteClick = output<ItemCard>();

  /**
   * Handle card click
   */
  onCardClick() {
    this.cardClick.emit(this.item());
  }

  /**
   * Handle like button click
   */
  onLikeClick(event: Event) {
    event.stopPropagation();
    const updatedItem = { ...this.item(), isLiked: !this.item().isLiked };
    if (updatedItem.isLiked) {
      updatedItem.likes = (updatedItem.likes || 0) + 1;
    } else {
      updatedItem.likes = Math.max((updatedItem.likes || 0) - 1, 0);
    }
    this.likeClick.emit(updatedItem);
  }

  /**
   * Handle edit button click
   */
  onEditClick(event: Event) {
    event.stopPropagation();
    this.editClick.emit(this.item());
  }

  /**
   * Handle delete button click
   */
  onDeleteClick(event: Event) {
    event.stopPropagation();
    this.deleteClick.emit(this.item());
  }

  /**
   * Get image URL or fallback to placeholder
   */
  getImageUrl(): string {
    return (
      this.item().image ||
      'https://via.placeholder.com/300x200?text=No+Image&textColor=999&bg=f0f0f0'
    );
  }
}
