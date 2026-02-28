# Lost & Found Detail Page Implementation Guide

This document outlines the implementation of the Item Detail page with Claim functionality for the Lost & Found web application.

## Overview

The implementation adds the following features:
- **Item Detail Page** (`/items/:id`) - Displays full information about a lost/found item
- **Claim Modal** - Allows users to claim an item with evidence
- **Claim Service Integration** - API integration for submitting claims

## Components Created

### 1. ItemDetailComponent
**Location:** `src/app/views/item-detail/item-detail.component.*`

**Responsibilities:**
- Retrieves item ID from route parameters
- Fetches item details from API (`GET /items/:id`)
- Displays full item information
- Manages claim button visibility and state
- Handles modal opening/closing
- Shows success messages after claim submission

**Key Features:**
- Lazy loads item data
- Checks if current user is the item creator (hides claim button)
- Validates claim limit (max 5 active claims)
- Only shows claim button if item status is `APPROVED`
- Responsive grid layout with image gallery

**Properties:**
```typescript
item: Item | null;
currentUserId: string | null;
activeClaimsCount: number;
isLoading: boolean;
error: string | null;
successMessage: string | null;
showClaimModal: boolean;
```

### 2. ClaimModalComponent
**Location:** `src/app/components/claim-modal/claim-modal.component.*`

**Responsibilities:**
- Displays modal form for submitting claims
- Accepts evidence text and optional image uploads
- Validates form inputs
- Submits claim to API

**Key Features:**
- Required evidence text (minimum 20 characters)
- Optional image upload with validation
- File size limit: 5MB per image
- Supported formats: JPEG, PNG, GIF, WebP
- Image preview with removal option
- Real-time character count display
- Error handling and user feedback

**Inputs:**
```typescript
@Input() item: any; // The item being claimed
```

**Outputs:**
```typescript
@Output() close = new EventEmitter<void>();    // Close modal event
@Output() success = new EventEmitter<void>();  // Success event
```

## Services

### ItemService (Updated)
**Location:** `src/app/services/item.service.ts`

**New Methods:**
```typescript
// Fetch a single item by ID
getItemById(id: string): Observable<Item>
```

**New Interface:**
```typescript
export interface Item {
    _id: string;
    type: 'LOST' | 'FOUND';
    title: string;
    category: string;
    location_text: string;
    lost_found_date: Date;
    description: string;
    color: string;
    brand?: string;
    distinctive_marks?: string;
    images: string[];
    image_public_ids: string[];
    status: 'PENDING' | 'APPROVED' | 'MATCHED' | 'COMPLETED' | 'REJECTED';
    created_by: string;
    created_at: Date;
    updated_at: Date;
}
```

### ClaimService (New)
**Location:** `src/app/services/claim.service.ts`

**Methods:**
```typescript
// Upload evidence image
uploadEvidenceImage(file: File): Observable<{ url: string; publicId: string }>

// Submit a new claim for an item
submitClaim(data: ClaimPayload): Observable<Claim>

// Get all claims for current user for a specific item
getMyClaimsForItem(itemId: string): Observable<Claim[]>

// Count active claims (PENDING + APPROVED) for current user
getActiveClaimsCount(): Observable<{ count: number }>
```

**Constants:**
```typescript
export const MAX_CLAIMS_LIMIT = 5;
```

**Interfaces:**
```typescript
export interface ClaimPayload {
    item_id: string;
    evidence_text: string;
    evidence_images: string[];
}

export interface Claim {
    _id: string;
    item_id: string;
    user_id: string;
    evidence_text: string;
    evidence_images: string[];
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    created_at: Date;
    updated_at: Date;
}
```

## Routing

**Updated:** `src/app/app-routing.module.ts`

**New Route:**
```typescript
{ path: "items/:id", component: ItemDetailComponent }
```

## Landing Page Integration

**Updated:** `src/app/views/landing/landing.component.ts`

**New Method:**
```typescript
viewItemDetail(itemId: string): void {
    this.router.navigate(['/items', itemId]);
}
```

**Updated:** `src/app/views/landing/landing.component.html`

All "Xem chi tiết" buttons now call:
```html
(click)="viewItemDetail('itemId')"
```

### Development Convenience: Sample Data Fallback
When the backend API returns an empty list (such as during early development or before seeding the database), the landing component populates a pair of **sample items** with `_id` values like `sample1`/`sample2`. A banner indicates this by showing **"Dữ liệu ví dụ đang hiển thị"**.

Clicking on one of these sample cards still navigates to `/items/sampleX`; the `ItemDetailComponent` checks for IDs starting with `sample` and loads a hard‑coded stub object instead of issuing an HTTP request. This ensures you can test navigation, UI, and modal behavior without needing a running backend.

## Module Configuration

**Updated:** `src/app/app.module.ts`

**Declarations Added:**
- `ItemDetailComponent`
- `ClaimModalComponent`

**Imports:**
- `ReactiveFormsModule` (for claim form)
- `HttpClientModule` (already present)
- `FormsModule` (already present)

## UI/UX Design

### Item Detail Page Features
1. **Header**
   - Back button
   - Title "Chi tiết đồ thất lạc"

2. **Main Content Area (2/3 width on desktop)**
   - Main image with hover zoom
   - Image gallery thumbnails
   - Item details in grid format:
     - Type (LOST/FOUND badge)
     - Category
     - Color
     - Location
     - Date
     - Status
   - Full description
   - Additional details (brand, distinctive marks)

3. **Sidebar (1/3 width on desktop)**
   - **Claim Card** (conditional visibility)
     - Description of claim process
     - Warning message if max claims reached
     - "Gửi yêu cầu xác minh" button
   - **Info Card**
     - Uploader ID
     - Posted date
     - Last updated date

### Claim Modal Features
1. **Form Fields**
   - Evidence text (required, min 20 chars)
   - Image upload (optional)
   
2. **Image Upload**
   - Drag & drop support
   - File validation
   - Size limit: 5MB
   - Supported formats shown
   - Preview thumbnails with delete option

3. **Error Handling**
   - File type validation
   - Size validation
   - Form validation
   - API error messages

## Business Logic

### Claim Button Visibility Rules
The "Gửi yêu cầu xác minh" button is shown if:
1. ✓ Current user is logged in
2. ✓ Current user is NOT the item creator
3. ✓ Item status is 'APPROVED'

The button is disabled if:
1. User has reached MAX_CLAIMS_LIMIT (5 active claims)

### Claim Submission Flow
1. User fills evidence text (minimum 20 characters)
2. User optionally uploads images (validated on client)
3. Form validates required fields
4. Submission to API: `POST /claims`
   ```json
   {
     "item_id": "uuid",
     "evidence_text": "string",
     "evidence_images": ["url1", "url2"]
   }
   ```
5. Modal closes on success
6. Success message displays for 5 seconds
7. Optional: Claim count reloads

## API Endpoints Required

### Backend Endpoints
1. **GET /items/:id** - Get single item detail
   - Response: Item object with full details

2. **POST /claims** - Submit a new claim
   - Body: ClaimPayload
   - Response: Claim object

3. **POST /claims/upload-image** - Upload evidence image
   - Body: FormData with file
   - Response: { url: string; publicId: string }

4. **GET /claims/count/active** - Get active claims count
   - Response: { count: number }

5. **GET /claims/item/:itemId** (optional) - Get claims for item
   - Response: Claim[]

## Authentication

All API calls include authorization header:
```typescript
Authorization: `Bearer ${localStorage.getItem('access_token')}`
```

User ID is retrieved from:
```typescript
localStorage.getItem('user_id')
```

## Styling

All styling uses **Tailwind CSS** classes to match existing design:
- Color scheme: blueGray, emerald, red
- Responsive design: Mobile-first with md: and lg: breakpoints
- Icons: Font Awesome 5
- Layout: Flexbox and CSS Grid

## Error Handling

1. **Item Not Found**
   - Display error message: "Failed to load item details"
   - Show back button to return to landing

2. **Image Upload Errors**
   - Validate file type
   - Validate file size
   - Show user-friendly error messages

3. **Claim Submission Errors**
   - Display API error message
   - Allow user to retry
   - Preserve form data

4. **Authentication Errors**
   - Handle missing or expired tokens
   - Redirect to login if needed

## Future Enhancements

1. **Claim Status Tracking**
   - Show user's existing claims for an item
   - Display claim status and history

2. **Image Lightbox**
   - Full-screen image viewer
   - Image carousel for gallery

3. **Contact Integration**
   - Direct messaging with item creator
   - Contact form below item details

4. **Related Items**
   - Show similar items based on category/type
   - Timeline of recent posts

5. **Filtering & Sorting**
   - Filter items by status
   - Sort by date, location, etc.

## Testing Scenarios

### Scenario 1: View Item Details
1. Navigate to `/items/item-id`
2. Item details load from API
3. Images display correctly
4. All metadata shows formatted properly

### Scenario 2: Submit Claim (Eligible User)
1. User is logged in and not item creator
2. Item status is APPROVED
3. User has < 5 active claims
4. Click "Gửi yêu cầu xác minh"
5. Modal opens with form
6. Fill evidence text (> 20 chars)
7. Optionally upload image
8. Click "Gửi yêu cầu"
9. Success message appears
10. Modal closes

### Scenario 3: Claim Button Not Visible
- User is item creator → button hidden
- Item status is PENDING → button hidden
- User not logged in → button hidden

### Scenario 4: Claim Button Disabled
- User has 5+ active claims → button disabled (yellow warning)
- Display: "Bạn đã đạt giới hạn yêu cầu xác minh"

## File Structure

```
client-site/src/app/
├── views/
│   ├── item-detail/
│   │   ├── item-detail.component.ts
│   │   ├── item-detail.component.html
│   │   ├── item-detail.component.scss
│   ├── landing/
│   │   ├── landing.component.ts (updated)
│   │   ├── landing.component.html (updated)
├── components/
│   ├── claim-modal/
│   │   ├── claim-modal.component.ts
│   │   ├── claim-modal.component.html
│   │   ├── claim-modal.component.scss
├── services/
│   ├── item.service.ts (updated)
│   ├── claim.service.ts (new)
│   ├── modal.service.ts (created but not used)
├── app.module.ts (updated)
├── app-routing.module.ts (updated)
```

## Implementation Notes

1. **No Material Design Library**
   - Used custom Tailwind-based modal instead of Material Dialog
   - Kept implementation lightweight and maintainable

2. **User ID Storage**
   - Expected to be stored in localStorage as 'user_id'
   - Adjust if using different storage mechanism

3. **Token Management**
   - Uses 'access_token' from localStorage
   - Update if using different token storage

4. **Responsive Design**
   - Desktop: 3-column layout (images 2/3, sidebar 1/3)
   - Tablet: 2-column layout
   - Mobile: Single column stacked

5. **Date Formatting**
   - Uses Vietnamese locale (vi-VN)
   - Formats: DD/MM/YYYY HH:mm

## Deployment Checklist

- [ ] Create Item Detail Component files
- [ ] Create Claim Modal Component files
- [ ] Create Claim Service
- [ ] Update Item Service with getItemById()
- [ ] Update App Routing
- [ ] Update Landing Component
- [ ] Update App Module declarations
- [ ] Test responsive design on mobile/tablet/desktop
- [ ] Test API integrations
- [ ] Test claim submission flow
- [ ] Verify authentication headers
- [ ] Test error scenarios
- [ ] Performance test image loading
- [ ] Accessibility review
