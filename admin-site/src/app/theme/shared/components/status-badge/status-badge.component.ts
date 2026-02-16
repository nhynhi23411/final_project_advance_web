// Angular Import
import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';

// Types
export type PostStatus =
  | 'DRAFT'
  | 'ARCHIVED'
  | 'PENDING_SYSTEM'
  | 'PENDING_ADMIN'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'NEEDS_UPDATE'
  | 'RETURN_PENDING_CONFIRM'
  | 'RETURNED'
  | 'REJECTED';

export interface StatusConfig {
  color: string;
  label: string;
}

@Component({
  selector: 'app-status-badge',
  imports: [CommonModule],
  templateUrl: './status-badge.component.html',
  styleUrls: ['./status-badge.component.scss'],
  standalone: true
})
export class StatusBadgeComponent {
  // Input signals
  status = input<PostStatus>('DRAFT');
  sizeClass = input<string>('badge-md');

  // Status configuration with colors
  private statusMap: Record<PostStatus, StatusConfig> = {
    DRAFT: { color: '#9E9E9E', label: 'Draft' },
    ARCHIVED: { color: '#9E9E9E', label: 'Archived' },
    PENDING_SYSTEM: { color: '#6D95C6', label: 'Pending System' },
    PENDING_ADMIN: { color: '#6D95C6', label: 'Pending Admin' },
    PENDING_APPROVAL: { color: '#6D95C6', label: 'Pending Approval' },
    APPROVED: { color: '#4CAF50', label: 'Approved' },
    NEEDS_UPDATE: { color: '#FFC107', label: 'Needs Update' },
    RETURN_PENDING_CONFIRM: { color: '#FF9800', label: 'Return Pending' },
    RETURNED: { color: '#2E7D32', label: 'Returned' },
    REJECTED: { color: '#F44336', label: 'Rejected' }
  };

  /**
   * Get the status configuration for the current status
   */
  getStatusConfig() {
    return this.statusMap[this.status()] || this.statusMap.DRAFT;
  }

  /**
   * Get background color for the badge
   */
  getBgColor() {
    return this.getStatusConfig().color;
  }

  /**
   * Get display label for the status
   */
  getLabel() {
    return this.getStatusConfig().label;
  }
}
