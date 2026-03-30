# 🔧 BACKEND BUSINESS RULES & WORKFLOWS

---

## **PART 1: POST LIFECYCLE & STATUS FLOW**

### **1.1 Post Status Diagram**

```
┌─────────────────┐
│ PENDING_SYSTEM  │ (User just created post, AUTO: text similarity check)
└────────┬────────┘
         │
         ├─→ [Duplicate Check] ──→ REJECTED (spam: similarity >= 85%)
         │
         └─→ [Pass] ──────────────→ PENDING_ADMIN (Auto-moderation check)
                                       │
                ┌──────────────────────┼──────────────────────┐
                │                      │                      │
                ▼                      ▼                      ▼
            APPROVED            NEEDS_UPDATE             REJECTED
        (Admin approves)     (Admin requests fix)   (Auto-flag violation)
                │                      │                      │
                │                      │                      │
                ├─→ Triggers matching  ├─→ User edits ─→ Resubmit
                │   algorithm          │                      │
                │                      │                      └─→ PENDING_ADMIN
                │                      │                          (Re-check)
                │                      │
                └──────────────────────┴──────────────────────┘
                                       │
                ┌──────────────────────┴──────────────────────┐
                │                                             │
                ▼                                             ▼
            RETURNED                                      ARCHIVED
      (User closes: item found/                    (Admin deletes or
       matched successfully)                        auto-cleanup after
                                                    60 days)
```

### **1.2 Post Status Details**

| Status | Meaning | Who Can Create | Triggered By | Next Status |
|--------|---------|---|---|---|
| **PENDING_SYSTEM** | Tạo bài, đang chờ kiểm tra tự động | User | Create post API | PENDING_ADMIN hoặc REJECTED (nếu spam) |
| **PENDING_ADMIN** | Bài bị flag keyword vi phạm từ blacklist, chờ admin duyệt | System | Auto-moderation (keyword detection) | APPROVED, NEEDS_UPDATE, hoặc REJECTED |
| **APPROVED** | Admin duyệt bài, bài được hiển thị → trigger matching algorithm | Admin | Admin clicks "Approve" | Matching starts, có thể → RETURNED hoặc NEEDS_UPDATE |
| **NEEDS_UPDATE** | Admin yêu cầu user sửa lại (thay vì reject) | Admin | Admin clicks "Request Update" + enter reason | User edits → Resubmit → PENDING_ADMIN |
| **REJECTED** | Bài bị từ chối vĩnh viễn | Admin hoặc System | Admin clicks "Reject" hoặc spam rule triggers | ARCHIVED (nếu admin), hoặc user có thể tạo bài mới |
| **RETURNED** | User đóng bài (tìm thấy item/matched thành công) | User | User clicks "Close post" | ARCHIVED (tự động sau thời gian) |
| **ARCHIVED** | Bài bị xóa (không hiển thị) | Admin hoặc System | Cleanup job hoặc admin delete | (End state) |

### **1.3 Post Creation Workflow**

```typescript
// File: server/src/posts/posts.service.ts

async createPostWithUser(dto, userId, manualStatus?):
  1. Check duplicate: Compare with user's posts from last 24h
     - Use text similarity (Dice coefficient + Cosine)
     - If similarity >= 85% → REJECT (spam)
     - If pass → continue

  2. Check user status:
     - If user.status == "BANNED" → Throw error

  3. Prepare post data:
     - Parse location (lat/lng or address text)
     - Extract metadata: color, brand, distinctive_marks, lost_found_date
     - Set initial status = "PENDING_SYSTEM" (or manual override)

  4. Insert to DB
     - created_by_user_id = user's ObjectId
     - images = []
     - image_public_ids = [] (for Cloudinary)
     - active_claim_count = 0

  5. Emit event:
     - eventEmitter.emit("item.created", { itemId })
     
  6. (Later: Automatic keyword detection)
     - Read from admin keyword blacklist
     - Scan post title + description
     - If contains keyword → Auto-moderate to PENDING_ADMIN
     - Else → APPROVED automatically (?)
```

---

## **PART 2: AUTO-MODERATION & KEYWORD DETECTION**

### **2.1 Keyword Blacklist**

**Collection**: `blacklisted_keywords`

```typescript
{
  _id: ObjectId,
  keyword: "string" (e.g., "bán hàng không phép"),
  created_at: Date,
  updated_at: Date,
  created_by_admin_id: ObjectId
}
```

### **2.2 Auto-Moderation Flow**

**Trigger**: When post is created or admin request update is accepted

```typescript
// File: (Listener/Service that handles keyword detection)

1. Read post: title + description
2. Load admin blacklist keywords
3. For each keyword in blacklist:
   - Case-insensitive match in title/description
   - If found:
     - Set post.status = "PENDING_ADMIN"
     - Store: which keyword matched (for admin display)
     - Emit event: "post.auto_moderated"
     - Return (stop further checks)

4. If no keyword matched:
   - Post → APPROVED (automatically approve?)
   - OR stay in PENDING_SYSTEM and wait for admin?
```

### **2.3 Admin Moderation Actions**

**Endpoints**: `PATCH /admin/posts/:id/status`

**Request Body** (UpdatePostStatusDto):
```typescript
{
  status: "APPROVED" | "NEEDS_UPDATE" | "REJECTED",
  reject_reason?: string  // Required if status="REJECTED"
}
```

**Backend Logic** (admin-posts.service.ts line ~453):

```typescript
async updatePostStatus(postId, dto, adminUserId):

  IF status == "APPROVED":
    1. Update post:
       - status = "APPROVED"
       - approved_at = now()
       - approved_by_user_id = admin's ID
       - reject_reason = null
    
    2. Emit event: "post.approved"
       → Trigger matching algorithm for this post
    
    3. Audit log: Record admin approval

  ELSE IF status == "NEEDS_UPDATE":
    1. Update post:
       - status = "NEEDS_UPDATE"
       - reject_reason = dto.reject_reason (admin's message to user)
    
    2. Emit event: "post.needs_update"
       → Send notification to user
       → Message: "Admin yêu cầu chỉnh sửa: {reason}"
    
    3. User can now edit post → Resubmit
       → New post version → Re-scan keyword → PENDING_ADMIN again

  ELSE IF status == "REJECTED":
    1. Audit log: Create reject log (track reject count for user)
    
    2. Update post:
       - status = "REJECTED"
       - reject_reason = dto.reject_reason
    
    3. Emit event: "post.rejected"
       → Send notification to user
    
    4. Check reject count (last 24h):
       - Get max_rejects_24h from config (default: 3)
       - Count user's rejected posts in last 24h
       - If count >= max_rejects_24h:
         - Update user.status = "BANNED"
         - Emit event: "user.banned"
         - Audit log: Record ban reason
```

---

## **PART 3: MATCHING ALGORITHM & SCORING**

### **3.1 Matching Trigger**

**Event-driven**: When post is APPROVED

```typescript
@OnEvent("post.approved")
async handlePostApproved(payload) {
  // File: server/src/tasks/tasks.service.ts line ~27
  
  const newPost = getPost(postId)  // Get approved post details
  const oppositeType = newPost.post_type == "LOST" ? "FOUND" : "LOST"
  const since = now() - 90 days
  
  1. Find all opposite-type posts that are:
     - status = "APPROVED"
     - post_type = opposite
     - createdAt >= 90 days ago
     - NOT locked (no active claims, not RETURNED)
  
  2. For each candidate post:
     - score = computeScore(newPost, candidate)
     - If score >= MIN_SCORE (0.62):
       - Create Match record
       - Notify both users: "Found a potential match!"
  
  3. Emit matching event for notification
}
```

### **3.2 Composite Score Calculation**

**Formula**:
```
Composite = W_cat × (Category Score)
          + W_text × (Text Score)
          + W_loc × (Location Score)
          + W_time × (Time Score)
          + W_attr × (Attribute Score)

Where:
- W_cat = 0.20 (admin-configurable)
- W_text = 0.35
- W_loc = 0.25
- W_time = 0.10
- W_attr = 0.10
- Sum = 1.00 (always)

Threshold: score >= 0.62 (62%)
```

### **3.3 Component Scores**

#### **1. Category Score (0-1)**

```typescript
private categoryScore(catA, catB):
  - If catA == catB:
    - If both are generic ("Khác", "Other") → 0.45 (weak signal)
    - Else (known category) → 1.0 (perfect match)
  
  - If one string contains other → 0.6 (partial match)
  
  - Completely different → 0.15
  
  - Generic vs non-generic mismatch:
    - If one generic, other not → 0.15 (skip this pair)
```

#### **2. Text Score (0-1)**

**Method**: Average of Dice coefficient + Cosine similarity

```typescript
private buildTextCorpus(title, description):
  1. Normalize: lowercase, remove special chars, split
  2. Filter: Remove Vietnamese + English stop words
  3. Result: "token1 token2 token3..."

private diceCoefficient(a, b):
  // Character-level bigram similarity
  bigrams_a = {all 2-char sequences in a}
  bigrams_b = {all 2-char sequences in b}
  Dice = 2 × |intersect| / (|a| + |b|)

private cosineSimilarity(a, b):
  // Word-level similarity
  tokenize both strings
  bag_a = {word: count}
  bag_b = {word: count}
  Cosine = dot_product(bag_a, bag_b) / (||bag_a|| × ||bag_b||)

textScore = average(Dice, Cosine)

Early exit if:
  - textScore < 0.15 AND catScore < 0.5 → Skip pair
```

#### **3. Location Score (0-1)**

```typescript
private computeLocationScore(posA, posB):
  
  IF both positions valid (GeoJSON Point):
    - distance_km = haversineDistance(lat1, lng1, lat2, lng2)
    - IF distance_km > 50km → distance_km = null (out of range)
    - location_score = max(0, 1 - distance_km / 10)
    
  ELSE IF one position valid:
    - location_score = 0.35 (partial info)
  
  ELSE (both invalid):
    - location_score = 0.5 (neutral)

Example:
  - 0km apart → score = 1.0
  - 5km apart → score = 0.5
  - 10km apart → score = 0.0
  - 50km+ apart → ignored (distance_km = null)
```

#### **4. Time Score (0-1)**

```typescript
private timeScore(dateL, dateF):
  // Try to use lost_found_date from metadata
  // Fallback to post createdAt
  
  IF both dates available:
    diffDays = abs(dateL - dateF) / (24h)
    score = max(0, 1 - diffDays / 30)
    
    Example:
      - Same day → score = 1.0
      - 15 days apart → score = 0.5
      - 30+ days apart → score = 0.0
  
  ELSE (date missing):
    score = 0.5 (neutral)
```

#### **5. Attribute Score (0-1)**

```typescript
private attributeScore(metaL, metaF):
  // Check: color, brand, distinctive_marks
  
  Initialize: matched = 0, total = 0
  
  FOR each attribute (color, brand, marks):
    IF either has value:
      total++
      IF exact match → matched += 1.0
      ELSE IF partial token overlap → matched += jaccard_similarity
      ELSE → matched += 0.5 (neutral)
  
  RESULT = (total == 0) ? 0.5 : matched / total
  
  Example:
    - color: "đen" vs "đen" → 1.0
    - brand: "iPhone" vs "Samsung" → 0.0
    - marks: "có khóa" vs "không khóa" → partial text sim
    avg_score = (1.0 + 0.0 + 0.3) / 3 ≈ 0.43
```

### **3.4 Early Exit Rules**

```typescript
IF category_score <= 0.15 AND both categories are non-generic:
  // Completely different categories
  → SKIP pair (score = null)

IF text_score < 0.15 AND category_score < 0.5:
  // Very little text similarity + weak category match
  → SKIP pair (score = null)

IF final_composite < 0.62:
  → SKIP pair (don't create match)
```

### **3.5 Matching Rules**

**Match Creation**: `upsertMatch(lostPostId, foundPostId, score)`

```typescript
// File: server/src/matches/matches.service.ts

async upsertMatch(lostPostId, foundPostId, score) {
  // Use unique index: (lost_post_id, found_post_id)
  // So if match already exists, update score only
  
  IF match already exists:
    - Update score (in case algorithm updated)
    - Keep status as-is
  
  ELSE:
    - Create new Match document:
      {
        lost_post_id,
        found_post_id,
        score,           // 0-1 normalized
        distance_km,     // null if > 50km
        text_score,      // for display
        source: "auto",  // or "manual" if user-created
        status: "ACTIVE",
        review_status: "PENDING",  // Admin review flag
        created_at,
        updated_at
      }
    
    - Emit event: notify both users
}
```

---

## **PART 4: MATCH MANAGEMENT (Admin)**

### **4.1 Match States**

| Field | Possible Values | Meaning |
|-------|---|---|
| `status` | ACTIVE, DISMISSED | ACTIVE = match is visible; DISMISSED = hidden/rejected |
| `review_status` | PENDING, CONFIRMED, REJECTED | Admin's manual decision |

### **4.2 Admin Match Review**

**Endpoint**: `PATCH /admin/matches/:id`

```typescript
// File: server/src/admin/admin-matches.service.ts

async updateMatchStatus(id, newStatus):
  // newStatus = "CONFIRMED" | "REJECTED"
  
  IF newStatus == "CONFIRMED":
    1. match.review_status = "CONFIRMED"
    2. match.status = "ACTIVE"
    3. Notify both users: "Admin confirmed your match"
  
  ELSE IF newStatus == "REJECTED":
    1. match.review_status = "REJECTED"
    2. match.status = "DISMISSED"
    3. Don't notify (silently dismiss)
```

### **4.3 Match Display & Notifications**

**User sees matches**:
```
GET /matches/suggestions?userId=...

Returns matches where:
1. User has an APPROVED post (LOST or FOUND)
2. Opposite-type APPROVED post exists
3. Match.score >= 0.60 (60%)
4. Match.status = "ACTIVE"
5. Match.review_status != "REJECTED"

Display:
  - Match score as % (0-100%)
  - Text similarity %
  - Distance (km) if <= 50km
  - Both posts' details
```

---

## **PART 5: NOTIFICATION SYSTEM**

### **5.1 Notification Events Emitted**

| Event | Trigger | Recipients | Message |
|-------|---------|---|---|
| `post.approved` | Admin approves post | Post creator | "Bài đăng của bạn đã được duyệt" |
| `post.needs_update` | Admin requests update | Post creator | "Admin yêu cầu chỉnh sửa: {reason}" + edit link |
| `post.rejected` | Admin rejects post | Post creator | "Bài đăng bị từ chối: {reason}" |
| `user.banned` | User gets 3+ rejects in 24h | User | "Tài khoản bị khóa do vi phạm" |
| `match.created` | Match algorithm finds pair | Both users | "Tìm thấy kết đối tiềm năng!" + details |
| `match.confirmed` | Admin confirms match | Both users | "Kết đối được xác nhận bởi admin" |

### **5.2 Notification Implementation**

**Expected flows** (based on event emitter calls):

```typescript
// admin-posts.service.ts line ~497
this.eventEmitter.emit("post.needs_update", {
  postId,
  userId,        // Post creator
  adminUserId,
  reason: dto.reject_reason
})

// Listener (not shown in code, implied):
@OnEvent("post.needs_update")
async handlePostNeedsUpdate(payload) {
  1. Get notification service
  2. Create notification:
     {
       recipient_id: payload.userId,
       type: "NEEDS_UPDATE",
       related_post_id: payload.postId,
       title: "Yêu cầu chỉnh sửa",
       message: `Admin yêu cầu: ${payload.reason}`,
       action_url: `/posts/${postId}/edit`
     }
  
  3. Save to DB / send push notification
     notify both admin and user
}
```

---

## **PART 6: ALGORITHM WEIGHTS (Dynamic Tuning)**

### **6.1 Algorithm Weights Schema**

**Collection**: `algorithm_weights`

```typescript
{
  _id: ObjectId,
  key: "default",  // Unique identifier
  category: 0.20,  // 20%
  text: 0.35,      // 35% (highest – most important)
  location: 0.25,  // 25%
  time: 0.10,      // 10%
  attributes: 0.10, // 10%
  sum: 1.00,       // Must always equal 1.00
  created_at: Date,
  updated_at: Date
}
```

### **6.2 Weight Tuning API** 

**Endpoint**: `PUT /admin/config/algorithm-weights`

```typescript
// Admin UI sends:
{
  category: 0.15,
  text: 0.40,    // Increase text weight
  location: 0.25,
  time: 0.10,
  attributes: 0.10
}

// Backend validation:
1. Load from DB (or get from service cache)
2. Validate sum ≈ 1.00 (+/- 0.001 for floating point)
3. Update in DB
4. Invalidate cache
5. All future matches use new weights
```

### **6.3 Admin Config Service**

**File**: `server/src/keyword/admin-keyword.service.ts`

```typescript
getAlgorithmWeights():
  1. Load from cache or DB
  2. Return AlgorithmWeights object
  3. Used by: tasks.service.ts computeScore()

updateAlgorithmWeights(newWeights):
  1. Validate sum = 1.0
  2. Update DB
  3. Clear cache
  4. Return success
```

---

## **PART 7: BANNED USER RULES**

### **7.1 Ban Trigger**

```typescript
// admin-posts.service.ts line ~512

const maxRejects = config.app.maxRejects24h ?? 3

countRejectInLast24h(userId):
  Query audit logs where:
    - action = "POST_REJECTED"
    - user_id = userId
    - created_at >= now() - 24h
  
  Return: count

IF count >= maxRejects:
  1. Update user.status = "BANNED"
  2. Create audit log: "User banned for reject limit"
  3. Emit event: "user.banned"
```

### **7.2 Banned User Restrictions**

```typescript
// posts.service.ts line ~53

IF user.status == "BANNED":
  1. Cannot create new posts
     - throw BadRequestException
  2. Cannot edit existing posts
  3. Cannot join claims
  4. Can only read (view posts)
  5. Can contact admin for appeal
```

---

## **PART 8: CLAIM WORKFLOW**

### **8.1 Claim Status Lifecycle**

```
┌──────────┐
│ PENDING  │ (Finder claims found item)
└────┬─────┘
     │
     ├─→ [Verify: QnA or verification] ──→ UNDER_VERIFICATION
     │                                          │
     │                                          ├─→ SUCCESSFUL (both agreed)
     │                                          │       │
     │                                          │       └─→ Post → RETURNED
     │                                          │
     │                                          └─→ REJECTED (loser asked)
     │
     └─→ CANCELLED (either party cancels)
```

### **8.2 Locked Posts**

Posts with active claims are "locked" (cannot be matched elsewhere):

```typescript
private async getLockedPostIds():
  1. Find posts with status = "RETURNED" → All locked
  2. Find posts with active claims (status in [PENDING, UNDER_VERIFICATION, SUCCESSFUL])
     → These locked too
  3. Return combined list

When matching:
  - Skip any post in locked list
  - Prevents multi-match confusion
```

---

## **PART 9: AUDIT LOG**

### **9.1 Audit Log Events**

**Collection**: `audit_logs`

```typescript
{
  _id: ObjectId,
  admin_id: ObjectId,      // Who did it
  action: "POST_MODERATED", // Action type
  entity_type: "POST",      // What was affected
  entity_id: ObjectId,      // Which post/user/etc
  old_value: { ... },       // Before
  new_value: { ... },       // After
  reason: "string",         // Admin's reason
  timestamp: Date,
  ip_address: String
}
```

### **9.2 Audit Log Methods**

```typescript
// admin-posts.service.ts

createRejectLog(postId, userId, reason, adminUserId):
  - Records POST_REJECTED action
  - Stores: post ID, reject reason, admin ID
  - Used to track reject count per user

countRejectInLast24h(userId):
  - Query audit logs with action = "POST_REJECTED"
  - Filter by userId + last 24h
  - Return count (used for ban trigger)

createBanLog(userId, reason, adminUserId):
  - Log USER_BANNED action
  - reason = "reject_limit" or other
```

---

## **PART 10: CLIENT ↔ SERVER INTERACTION**

### **10.1 Client -> Server APIs**

#### **Post Management**

```
POST /posts
  - Create new post
  - Body: CreatePostDto (title, desc, type, category, location, metadata, images)
  - Returns: Post (with status)

PATCH /posts/:id
  - User edits their own post
  - Body: UpdatePostDto
  - Returns: Updated Post

DELETE /posts/:id
  - User soft-deletes (closes)
  - Returns: Post with status = "RETURNED"
```

#### **Match & Claim**

```
GET /matches/suggestions?userId=...
  - Get suggested matches for user's posts
  - Returns: [Match] with confidence_score, etc

POST /claims
  - Finder claims a found post
  - Body: CreateClaimDto (target_post_id, answers...)
  - Returns: Claim (PENDING)

PATCH /claims/:id/answer
  - Loser responds to verification questions
  - Body: answers[]
  - Returns: Updated Claim
```

### **10.2 Server -> Client Notifications**

**Socket.IO or Push Notifications**:

```typescript
Listeners on client:

// Notification: Post approved
on("post.approved", () => {
  showToast("Bài đăng của bạn đã được duyệt!")
  redirect("/my-posts")
})

// Notification: Match found
on("match.created", (matchData) => {
  showNotification({
    title: "Tìm thấy kết đối!",
    body: "Bài của bạn có kết đối tiềm năng",
    action: () => navigate("/matches")
  })
})

// Notification: Admin request update
on("post.needs_update", (postData) => {
  showAlert({
    title: "Bài cần chỉnh sửa",
    message: postData.reason,
    actions: ["Edit", "Dismiss"]
  })
})
```

### **10.3 Admin Site <-> Server APIs**

```
GET /admin/posts[?status=PENDING_ADMIN&category=...&dateFrom=...&dateTo=...]
  - List posts for moderation
  - Returns: [Post] with keyword highlights

PATCH /admin/posts/:id/status
  - Update post status (APPROVED/NEEDS_UPDATE/REJECTED)
  - Body: UpdatePostStatusDto
  - Triggers: eventEmitter.emit("post.*")

GET /admin/matches[?status=PENDING&minConfidence=60]
  - List matches for admin review
  - Returns: [AdminMatchRow] with scores

PATCH /admin/matches/:id
  - Mark match as CONFIRMED or REJECTED
  - Body: { status: "CONFIRMED"|"REJECTED" }

PUT /admin/config/algorithm-weights
  - Update algorithm weights
  - Body: { category, text, location, time, attributes }
  - Validation: sum Must = 1.0

GET /admin/system-config
  - Get current config (weights + keywords)
```

---

## **PART 11: CONSTRAINTS & RULES SUMMARY**

| Rule | Value | Source |
|------|-------|--------|
| Min match score | 0.62 (62%) | Hard-coded in tasks.service.ts |
| Duplicate text similarity | >= 0.85 (85%) | posts.service.ts |
| Generic category weak signal | 0.45 score | tasks.service.ts categoryScore() |
| Location distance threshold | 50km | tasks.service.ts |
| Time decay | 30 days = 0 score | tasks.service.ts timeScore() |
| Max rejects in 24h before ban | 3 (configurable) | .env MAX_REJECTS_24H |
| Max claims per user | 3 (configurable) | .env MAX_CLAIMS_LIMIT |
| Post cleanup (APPROVED) | 60 days | tasks.service.ts cleanupOldPosts() |
| Post cleanup (NEEDS_UPDATE) | 7 days | tasks.service.ts cleanupOldPosts() |
| Match history | 90 days | tasks.service.ts (look-back window) |
| Suggestion score threshold | >= 60% | matches.service.ts MIN_SUGGESTION_SCORE |

---

## **PART 12: KEY EVENTS & EVENT EMITTER**

```typescript
// NestJS EventEmitter2

Available events in system:

1. "item.created"
   - Emitted: posts.service.ts after post creation
   - Used for: triggering any post-creation logic

2. "post.approved"
   - Emitted: admin-posts.service.ts when admin approves
   - Listener: tasks.service.ts handlePostApproved()
   - Action: Trigger matching algorithm

3. "post.needs_update"
   - Emitted: admin-posts.service.ts when admin requests update
   - Listener: (notification service - implied)
   - Action: Notify user, set post to NEEDS_UPDATE

4. "post.rejected"
   - Emitted: admin-posts.service.ts when admin rejects
   - Listener: (notification service - implied)
   - Action: Notify user, check ban trigger

5. "user.banned"
   - Emitted: admin-posts.service.ts when user hits reject limit
   - Listener: (user service - implied)
   - Action: Ban user, notify

6. "match.created" (implied)
   - Emitted: matches.service.ts after upsertMatch()
   - Listener: (notification service - implied)
   - Action: Notify both users

All async operations handled properly with await/promises
```

---

# 📋 SUMMARY TABLE: Workflows & Decision Trees

## **New Post Flow**

```
USER CREATES POST
  ↓
[DUPLICATE CHECK] text_sim(new, recent_24h) >= 85%?
  ├─→ YES: REJECT (spam)
  └─→ NO: continue
  ↓
[USER STATUS] user.status == BANNED?
  ├─→ YES: throw error
  └─→ NO: continue
  ↓
INSERT: status = PENDING_SYSTEM 
  ↓
[AUTO-MODERATION] Check keywords
  ├─→ Found violation: status = PENDING_ADMIN
  └─→ No violation: status = APPROVED (auto)
  ↓
[APPROVED POSTS] Trigger matching
```

## **Admin Moderation Flow**

```
ADMIN SEES POST in PENDING_ADMIN
  ↓
[KEYWORD HIGHLIGHT] Show matching keywords
  ↓
ADMIN DECISION
  ├─→ "Approve": status = APPROVED → Trigger matching
  ├─→ "Request Update": status = NEEDS_UPDATE → User edits → Resubmit
  └─→ "Reject": status = REJECTED → Check ban count
      ├─→ count >= 3 in 24h: User.status = BANNED
      └─→ count < 3: User can try again
```

## **Matching Flow**

```
POST APPROVED
  ↓
QUERY: Find opposite-type APPROVED posts (90-day window, unlocked)
  ↓
FOR EACH CANDIDATE:
  ├─→ Compute score (5 components)
  ├─→ Early exits: category_mismatch? text_weak + cat_weak?
  └─→ score >= 0.62? 
      ├─→ YES: Create Match → Notify users
      └─→ NO: Skip pair
```

