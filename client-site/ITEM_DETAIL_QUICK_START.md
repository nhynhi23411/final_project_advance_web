# Quick Start Guide - Item Detail Feature

## What Was Implemented

You now have a complete **Item Detail Page** with **Claim Functionality** for your Lost & Found application.

## File Structure

### New Components
```
src/app/
├── views/item-detail/               [NEW]
│   ├── item-detail.component.ts
│   ├── item-detail.component.html
│   └── item-detail.component.scss
└── components/claim-modal/          [NEW]
    ├── claim-modal.component.ts
    ├── claim-modal.component.html
    └── claim-modal.component.scss
```

### New Services
```
src/app/services/
├── claim.service.ts                 [NEW]
└── item.service.ts                  [UPDATED - added getItemById()]
```

### Updated Files
```
src/app/
├── app.module.ts                    [UPDATED - declarations]
├── app-routing.module.ts            [UPDATED - new route]
└── views/landing/
    ├── landing.component.ts         [UPDATED - navigation method]
    └── landing.component.html       [UPDATED - click handlers]
```

## How to Use

### 1. Navigate to Item Detail
From the landing page, click any "Xem chi tiết" button. This triggers:
```typescript
viewItemDetail(itemId: string)
```
Which navigates to: `/items/:id`

> **Note:** when the backend returns no items (e.g. during initial development), the landing page automatically shows sample posts with IDs like `sample1`, `sample2`. Clicking these will still navigate to the detail page; the component contains a local stub that displays matching sample data instead of calling the API. This makes it possible to exercise navigation and functionality even without a running server.

### 2. View Item Details
The page automatically loads and displays:
- Full item information (title, type, category, color, location, date)
- Item images with gallery
- Detailed description
- Additional metadata (brand, distinctive marks)
- Creator info and timestamps

### 3. Submit a Claim
Click "Gửi yêu cầu xác minh" button to:
1. Open the claim modal
2. Enter evidence text (minimum 20 characters required)
3. Optionally upload images (JPEG, PNG, GIF, WebP - max 5MB each)
4. Click "Gửi yêu cầu" to submit
5. See success message after submission

## API Integration

### Required Backend Endpoints

**1. Get Item Detail**
```
GET /items/:id
Headers: Authorization: Bearer {token}
Response: Item object with all details
```

**2. Upload Evidence Image**
```
POST /claims/upload-image
Headers: Authorization: Bearer {token}, Content-Type: multipart/form-data
Body: FormData { file: File }
Response: { url: string; publicId: string }
```

**3. Submit Claim**
```
POST /claims
Headers: Authorization: Bearer {token}, Content-Type: application/json
Body: {
  "item_id": "uuid",
  "evidence_text": "string",
  "evidence_images": ["url1", "url2"]
}
Response: Claim object
```

**4. Get Active Claims Count**
```
GET /claims/count/active
Headers: Authorization: Bearer {token}
Response: { count: number }
```

## Business Logic

### Claim Button Rules
The "Gửi yêu cầu xác minh" button appears when:
- ✓ Current user is logged in
- ✓ Current user is NOT the item owner
- ✓ Item status is APPROVED

The button is disabled when:
- User has 5+ active claims

### Claim Submission
1. Validates evidence text (non-empty, min 20 chars)
2. Validates images (type, size)
3. Submits via POST /claims
4. Shows success/error message

## User Experience

### Desktop View (1200px+)
- 3-column grid: Images (2/3) + Sidebar (1/3)
- Image gallery on left
- Item details in middle
- Claim card on right

### Tablet View (768px - 1199px)
- 2-column grid: Images + Details
- Claim info below details

### Mobile View (<768px)
- Single column
- Stacked: Images → Details → Claim Info

## Customization

### Change UI Colors
Located in HTML/SCSS files, update these Tailwind classes:
- `bg-blueGray-*` → Main color
- `bg-emerald-*` → Found items
- `bg-red-*` → Lost items

### Adjust Claim Limit
In `claim.service.ts`:
```typescript
export const MAX_CLAIMS_LIMIT = 5; // Change to desired number
```

### Modify Form Validation
In `claim-modal.component.ts`:
```typescript
evidence_text: ['', [
    Validators.required,
    Validators.minLength(20)  // Adjust minimum length
]]
```

### Change Image Upload Limit
In `claim-modal.component.ts`:
```typescript
if (file.size > 5 * 1024 * 1024) {  // 5MB limit
    this.error = 'Kích thước quá lớn';
}
```

## Common Issues & Solutions

### Button not showing "Gửi yêu cầu xác minh"
**Possible Causes:**
1. User is the item creator
2. Item status is not 'APPROVED'
3. User not logged in

**Check:** `isClaimButtonVisible()` method in component

### Images not loading
**Possible Causes:**
1. Invalid image URL from API
2. CORS issue

**Solution:** Verify image URLs in item data

### Form not submitting
**Possible Causes:**
1. Evidence text < 20 characters
2. evidence_text field not touched
3. Invalid file format

**Check:** Form validation in console

### Modal not appearing
**Possible Causes:**
1. Component not declared in app.module
2. showClaimModal flag not toggling

**Verify:** Check app.module.ts declarations

## Testing

### Manual Test: View Item
```
1. Go to /landing
2. Click "Xem chi tiết" button
3. Verify item page loads at /items/item-id
4. Check all item data displays correctly
```

### Manual Test: Submit Claim
```
1. Click "Gửi yêu cầu xác minh"
2. Type evidence (> 20 chars)
3. Optionally upload image
4. Click "Gửi yêu cầu"
5. Verify success message shows
```

### Manual Test: Button Visibility
```
1. As item owner: Button should be hidden
2. As other user with < 5 claims: Button enabled
3. As user with 5+ claims: Button disabled with warning
4. For PENDING item: Button hidden
```

## Performance Tips

1. **Image Optimization**
   - Backend should resize images
   - Use WebP format when possible
   - Lazy load gallery thumbnails

2. **API Caching**
   - Cache item details (5 min TTL)
   - Cache user's active claims count (1 min TTL)

3. **UI Optimization**
   - Debounce character count updates
   - Lazy load hidden sections
   - Use OnPush change detection

## Accessibility

- Modal is keyboard navigable (Tab, Escape to close)
- Form labels connected to inputs
- Error messages connected to fields
- Colors have sufficient contrast
- Icons accompanied by text labels

## Internationalization

Vietnamese text is hardcoded. To add other languages:

1. Create i18n JSON files
2. Use ngx-translate or similar
3. Replace hardcoded strings with i18n keys

Example translations to add:
- "Gửi yêu cầu xác minh" (Send verification request)
- "Xem chi tiết" (View details)
- Item status labels
- Error messages

## Security Considerations

1. **Token Validation**
   - All requests include Bearer token
   - Backend validates token expiry

2. **File Upload**
   - Client validates file type and size
   - Backend should re-validate before storage

3. **Input Validation**
   - HTML sanitization for descriptions
   - Evidence text length validation
   - User ID verification

4. **Rate Limiting**
   - Consider rate limit on claim submissions
   - Prevent spam uploads

## Debugging

### Enable Console Logs
Add to components:
```typescript
console.log('Item loaded:', this.item);
console.log('Claims count:', this.activeClaimsCount);
console.log('Button visible:', this.isClaimButtonVisible());
```

### Check Network
Open DevTools → Network tab:
- Verify GET /items/:id succeeds
- Verify POST /claims succeeds
- Check response status codes

### Check State
In browser console:
```javascript
// Check localStorage
localStorage.getItem('user_id')
localStorage.getItem('access_token')

// Check component data (if using Angular DevTools)
ng.getComponent(document.querySelector('app-item-detail'))
```

## Next Steps

1. **Implement Backend APIs** (refer to "API Integration" section)
2. **Test End-to-End** (use scenarios from implementation guide)
3. **Add Additional Features** (see "Future Enhancements" in guide)
4. **Deploy to Production**

## Support

For issues or questions, refer to:
- `ITEM_DETAIL_IMPLEMENTATION.md` - Comprehensive guide
- Component TypeScript files - Source code with comments
- Service interfaces - API contract definitions

---

**Happy Coding! 🚀**
