# Shared Components Documentation

## Overview

This document describes the shared dumb components created for the Lost & Found application. These components are designed to be reusable across multiple pages (Home, Search, Details) and only display data passed via `@Input()` properties without making API calls.

---

## Components Created

### 1. StatusBadgeComponent

**Location**: `src/app/theme/shared/components/status-badge/`

**Purpose**: Displays status badges with appropriate colors for different post statuses.

**Features**:
- Supports 9 different post statuses
- Color-coded display for each status
- Configurable size (sm, md, lg)
- Hover effects with smooth animations

**Supported Statuses**:

| Status | Color | Hex Code |
|--------|-------|----------|
| DRAFT | Gray | #9E9E9E |
| ARCHIVED | Gray | #9E9E9E |
| PENDING_SYSTEM | Blue | #6D95C6 |
| PENDING_ADMIN | Blue | #6D95C6 |
| PENDING_APPROVAL | Blue | #6D95C6 |
| APPROVED | Green | #4CAF50 |
| NEEDS_UPDATE | Amber | #FFC107 |
| RETURN_PENDING_CONFIRM | Orange | #FF9800 |
| RETURNED | Dark Green | #2E7D32 |
| REJECTED | Red | #F44336 |

**Usage**:

```typescript
// In component TypeScript
import { StatusBadgeComponent, PostStatus } from '@theme/shared/components/status-badge/status-badge.component';

export class MyComponent {
  status: PostStatus = 'APPROVED';
}
```

```html
<!-- In template -->
<app-status-badge 
  [status]="status"
  sizeClass="badge-md"
></app-status-badge>
```

**Inputs**:
- `status: PostStatus` - The status to display (default: 'DRAFT')
- `sizeClass: string` - Size of badge: 'badge-sm', 'badge-md', 'badge-lg' (default: 'badge-md')

**Methods**:
- `getStatusConfig()` - Returns the configuration object for current status
- `getBgColor()` - Returns the background color hex code
- `getLabel()` - Returns the display label for the status

---

### 2. ItemCardComponent

**Location**: `src/app/theme/shared/components/item-card/`

**Purpose**: Displays a lost/found item with comprehensive information including image, status, metadata, and action buttons.

**Features**:
- Responsive card layout with image preview
- Status badge integration
- Like/unlike functionality with counter
- Meta information display (location, date, owner)
- Edit and delete action buttons
- Comment count display
- Responsive design for mobile devices
- Event emitters for parent component interaction

**Usage**:

```typescript
// In component TypeScript
import { ItemCardComponent, ItemCard } from '@theme/shared/components/item-card/item-card.component';

export class MyComponent {
  item: ItemCard = {
    id: 1,
    title: 'Lost iPhone',
    description: 'Black iPhone 14 lost at mall',
    category: 'Electronics',
    status: 'APPROVED',
    image: 'https://example.com/image.jpg',
    location: 'Downtown Mall',
    date: '2024-01-15',
    owner: 'John Doe',
    likes: 10,
    comments: 2,
    isLiked: false
  };

  onItemClick(item: ItemCard) {
    console.log('Item clicked:', item);
  }

  onLike(item: ItemCard) {
    console.log('Item liked:', item);
  }

  onEdit(item: ItemCard) {
    console.log('Edit item:', item);
  }

  onDelete(item: ItemCard) {
    console.log('Delete item:', item);
  }
}
```

```html
<!-- In template -->
<app-item-card 
  [item]="item"
  [showImage]="true"
  [showStatus]="true"
  cardClass="custom-class"
  (cardClick)="onItemClick($event)"
  (likeClick)="onLike($event)"
  (editClick)="onEdit($event)"
  (deleteClick)="onDelete($event)"
></app-item-card>
```

**Inputs**:
- `item: ItemCard` - Item data to display
- `showImage: boolean` - Show/hide image section (default: true)
- `showStatus: boolean` - Show/hide status badge (default: true)
- `cardClass: string` - Additional CSS classes for the card

**Outputs**:
- `cardClick: EventEmitter<ItemCard>` - Emitted when card is clicked
- `likeClick: EventEmitter<ItemCard>` - Emitted when like button is clicked
- `editClick: EventEmitter<ItemCard>` - Emitted when edit button is clicked
- `deleteClick: EventEmitter<ItemCard>` - Emitted when delete button is clicked

**ItemCard Interface**:

```typescript
export interface ItemCard {
  id?: string | number;
  title: string;                    // Item title
  description: string;              // Item description
  category: string;                 // Item category
  status: PostStatus;               // Item status
  image?: string;                   // Image URL
  location?: string;                // Location where item was found/lost
  date?: string;                    // Date (YYYY-MM-DD format)
  owner?: string;                   // Owner/finder name
  likes?: number;                   // Number of likes
  comments?: number;                // Number of comments
  isLiked?: boolean;                // Whether current user liked it
}
```

---

## Mock Data

**Location**: `src/app/theme/shared/mock-data/items.mock.ts`

Contains sample item data for testing and development.

**Available Mock Data**:

1. **MOCK_ITEMS**: Array of 12 sample items with various statuses and categories
2. **MOCK_ITEMS_BY_STATUS**: Items organized by status
3. **MOCK_STATUS_DATA**: Summary of items by status
4. **Helper Functions**:
   - `getItemsByStatus(status)` - Get items filtered by status
   - `getRandomMockItems(count)` - Get random items for testing
   - `createMockItem(overrides)` - Create a mock item with custom properties

**Usage**:

```typescript
import { MOCK_ITEMS, getItemsByStatus } from '@theme/shared/mock-data/items.mock';

export class MyComponent implements OnInit {
  allItems = MOCK_ITEMS;
  approvedItems = getItemsByStatus('APPROVED');

  ngOnInit() {
    // Use mock data
    console.log(this.allItems);
  }
}
```

---

## Demo Component

**Location**: `src/app/theme/shared-components-demo.component.ts`

A demonstration page showcasing both components with mock data and interactive examples.

**Features**:
- StatusBadge demo with all status types
- StatusBadge size variations
- ItemCard grid with status filtering
- Interactive event logging
- Responsive layout demo

---

## Integration Guide

### Step 1: Import SharedModule

```typescript
import { SharedModule } from '@theme/shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    SharedModule,
    // ... other imports
  ]
})
export class YourModule { }
```

### Step 2: Use in Your Component

```typescript
// Option 1: Use directly as standalone components
import { StatusBadgeComponent } from '@theme/shared/components/status-badge/status-badge.component';
import { ItemCardComponent } from '@theme/shared/components/item-card/item-card.component';

@Component({
  selector: 'app-my-component',
  imports: [StatusBadgeComponent, ItemCardComponent],
  template: `...`
})
export class MyComponent { }

// Option 2: Use through SharedModule
@NgModule({
  imports: [SharedModule]
})
export class MyModule { }
```

### Step 3: Import Mock Data (Optional)

```typescript
import { MOCK_ITEMS } from '@theme/shared/mock-data/items.mock';

export class MyComponent {
  items = MOCK_ITEMS;
}
```

---

## File Structure

```
src/app/theme/shared/
├── components/
│   ├── status-badge/
│   │   ├── status-badge.component.ts
│   │   ├── status-badge.component.html
│   │   └── status-badge.component.scss
│   ├── item-card/
│   │   ├── item-card.component.ts
│   │   ├── item-card.component.html
│   │   └── item-card.component.scss
│   ├── breadcrumb/
│   ├── card/
│   └── ... (other existing components)
├── mock-data/
│   └── items.mock.ts
└── shared.module.ts
```

---

## Styling & Customization

### StatusBadge Sizing

```html
<!-- Small badge -->
<app-status-badge status="APPROVED" sizeClass="badge-sm"></app-status-badge>

<!-- Medium badge (default) -->
<app-status-badge status="APPROVED" sizeClass="badge-md"></app-status-badge>

<!-- Large badge -->
<app-status-badge status="APPROVED" sizeClass="badge-lg"></app-status-badge>
```

### ItemCard Customization

```html
<!-- Show only title without image -->
<app-item-card [item]="item" [showImage]="false" [showStatus]="false"></app-item-card>

<!-- Add custom CSS class -->
<app-item-card [item]="item" cardClass="featured-card"></app-item-card>
```

---

## Responsive Design

Both components include responsive styles for mobile devices:

- **Mobile (≤480px)**: Optimized card layout with adjusted font sizes
- **Tablet (≤768px)**: Single column for item cards
- **Desktop (>768px)**: Multi-column grid layout

---

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

---

## Future Enhancements

- [ ] Add skeleton loader for images
- [ ] Add lazy loading for images
- [ ] Add animation transitions
- [ ] Add search/filter capabilities
- [ ] Add pagination for large item lists
- [ ] Add customizable color themes
- [ ] Add accessibility improvements
- [ ] Add unit tests

---

## Notes

- Both components are **standalone** and don't require module imports
- Components are **dumb/presentational** - they only display data
- All business logic should be handled in parent components
- Mock data includes 12 sample lost/found items with various statuses
- Components use Angular 21+ Signal API for inputs

---

## Support

For questions or issues with these components, refer to the Angular documentation:
- [Angular Standalone Components](https://angular.io/guide/standalone-components)
- [Angular Input/Output](https://angular.io/guide/inputs-outputs)
- [Angular Event Binding](https://angular.io/guide/event-binding)
