# 🎬 SCRIPT DEMO - ADMIN SITE DOANH (5P)

---

## **INTRO: LOGIN & NAVIGATION**

### Bước 1: Đăng nhập vào Admin Site
+ **Tại trang login**:
  - Nói: "Admin site có authentication riêng biệt với client site"
  - Email: `admin@example.com` (hoặc tài khoản của bạn)
  - Password: (nhập mật khẩu)
  - Click "Đăng nhập" (Sign In)

+ **Sau khi login**:
  - Nói: "Chúng ta đã vào hệ thống quản trị. Bây giờ tôi sẽ giới thiệu các chức năng chính"
  - Chỉ ra **sidebar menu** trái:
    - Analytics (Dashboard)
    - Quản Lý → Cấu Hình Hệ Thống
    - Quản Lý Bài Đăng (Content Management)
    - Quản Lý Người Dùng (Users)
    - Audit Logs
    - Báo Cáo (Reports)

---

## **CASE 1: DASHBOARD ANALYTICS - HỆ THỐNG QUẢN LÝ TOÀN DIỆN**

### Mục đích:
Trình bày khả năng giám sát toàn bộ hệ thống qua các chỉ số chính (KPI), xu hướng tăng trưởng theo thời gian, và tình trạng sức khỏe của nền tảng. Điều này thể hiện:
- **Real-time monitoring** của hệ thống
- **Data visualization** để dễ theo dõi metrics
- **Quick insights** giúp ra quyết định

### Kỹ thuật áp dụng cho tính năng này:
- **ApexCharts** - Biểu đồ đường (Line Chart) cho xu hướng tăng trưởng
- **Pie Chart** - Phân bố bài đăng theo danh mục
- **Real-time Statistics** - Các thẻ KPI cập nhật động
- **Data Aggregation API** - Tổng hợp dữ liệu từ multiple sources
- **Performance Optimization** - Lazy loading charts, async data loading

### Hướng dẫn demo:
+ **Bước 1: Điều hướng đến Analytics**
  - Từ trang chủ admin, click vào menu "Analytics" hoặc redirect tự động
  - Nhận xét: "Đây là dashboard tổng hợp tất cả hoạt động của nền tảng"

+ **Bước 2: Giải thích các thẻ KPI chính (Cards)**
  - Chỉ ra các số liệu chính:
    - **Total Users**: Tổng số người dùng hiện tại
    - **Active Posts**: Số bài đăng đang hoạt động
    - **Pending Moderation**: Bài đang chờ kiểm duyệt
    - **Successful Matches**: Số cặp tìm được thành công
  - Nói: "Chúng ta có thể nhanh chóng thấy sức khỏe của hệ thống"

+ **Bước 3: Phân tích biểu đồ xu hướng (Growth Trends)**
  - Scroll xuống xem biểu đồ đường theo 12 tháng
  - Nói: "Biểu đồ này cho thấy xu hướng tăng trưởng người dùng và bài đăng qua từng tháng"
  - Di chuột qua các điểm dữ liệu để hiển thị tooltip
  - Nhận xét về xu hướng: "Có thể thấy tháng nào tăng mạnh hay giảm"

+ **Bước 4: Xem phân bố theo danh mục (Category Distribution)**
  - Chỉ ra biểu đồ Pie Chart phân bố bài đăng theo danh mục
  - Nói: "Dữ liệu này giúp chúng ta hiểu nhu cầu người dùng tập trung ở lĩnh vực nào"

+ **Bước 5: Kiểm tra tình trạng hệ thống (Platform Health)**
  - Cuộn xuống xem nhật ký sức khỏe nền tảng
  - Nhận xét: "Chúng ta theo dõi uptime, response time, error rate để đảm bảo hệ thống luôn ổn định"

---

## **CASE 2: SYSTEM CONFIG - THUẬT TOÁN VÀ KEYWORD FILTERING**

### Mục đích:
Trình bày khả năng quản lý:
1. **Blacklist Keywords** - Từ ngữ vi phạm để lọc bài đăng tự động
2. **Algorithm Weights** - Tuning tính năng tìm kiếm/matching bằng trọng số

Thể hiện sự tinh tế của hệ thống AI/ML và control flexibility.

### Kỹ thuật áp dụng cho tính năng này:
- **Text Processing & NLP** - Kiểm tra keyword trong bài đăng
- **Content Moderation Algorithm** - Tự động flag bài vi phạm
- **Algorithm Tuning** - Điều chỉnh trọng số để optimize kết quả tìm kiếm
- **Real-time Update** - Áp dụng thay đổi tức thì
- **Audit Trail** - Ghi lại ai đã chỉnh sửa gì lúc nào

### Hướng dẫn demo:

+ **Bước 1: Truy cập System Config**
  - Từ sidebar admin menu, click → "Quản Lý" → "Cấu Hình Hệ Thống"
  - Nói: "Tại đây chúng tôi có thể điều chỉnh các tham số của hệ thống"

+ **Bước 2: Hiển thị Keyword Blacklist**
  - Scroll đến phần "Quản Lý Từ Khóa Vi Phạm"
  - Nói: "Những từ này sẽ được kiểm tra tự động trong mỗi bài đăng"
  - Chỉ ra một số keyword liên quan đến bài của Nhi bị pending (ví dụ: nếu bài Nhi có từ "bán hàng không phép" và từ này nằm trong blacklist)
  - Nhận xét: "Bài của Nhi bị PENDING_ADMIN chính là vì chứa keyword này"

+ **Bước 3: Demo thêm keyword mới**
  - Nhập một từ khóa ví dụ: "spam"
  - Click nút "Thêm"
  - Nói: "Khi thêm keyword mới, hệ thống sẽ tự động kiểm tra tất cả bài từ giờ trở đi"
  - Thấy keyword được thêm vào danh sách

+ **Bước 4: Demo chỉnh sửa keyword**
  - Tìm một keyword trong danh sách
  - Click "Chỉnh sửa" hoặc edit icon
  - Đổi tên keyword
  - Click "Lưu"
  - Nói: "Chúng tôi có thể cập nhật keyword bất cứ lúc nào khi quy tắc kiểm duyệt thay đổi"

+ **Bước 5: Demo xóa keyword**
  - Tìm keyword để xóa
  - Click "Xóa" hoặc trash icon
  - Xác nhận trong modal
  - Nói: "Loại bỏ keyword sẽ không ảnh hưởng đến bài cũ, nhưng bài mới sẽ không bị check"

+ **Bước 6: Hiển thị Algorithm Weights**
  - Scroll xuống phần "Tuning Thuật Toán Tìm Kiếm"
  - Nói: "Đây là các trọng số quyết định cách bài được xếp hạng trong kết quả tìm kiếm"
  - Hiển thị 5 tham số chính:
    - **Danh mục (Category)**: 20% - Bài/vật phẩm từng loại
    - **Văn bản (Text)**: 35% - Từ khóa trong mô tả (trọng số cao nhất vì quan trọng nhất)
    - **Địa điểm (Location)**: 25% - Khoảng cách địa lý
    - **Thời gian (Time)**: 10% - Bao lâu bài được posted
    - **Thuộc tính (Attributes)**: 10% - Chi tiết khác

+ **Bước 7: Demo điều chỉnh trọng số**
  - Nói: "Nếu chúng ta muốn khuyến khích tìm kiếm dựa trên location hơn (ví dụ cho các nước/thành phố nhỏ)"
  - Kéo slider của "Location" từ 25% → 35%
  - Kéo slider của "Text" từ 35% → 25%
  - Số lượng phải tổng bằng 100%
  - Click "Lưu Cấu Hình"
  - Nói: "Thay đổi này sẽ áp dụng ngay, tất cả lần tìm kiếm từ giờ sẽ dùng trọng số mới"

+ **Bước 8: Nhấn mạnh tính linh hoạt**
  - "Không cần deploy code mới, chúng tôi có thể optimize hành vi hệ thống qua giao diện admin"
  - "Đây là feature rất quan trọng vì giúp tune hệ thống dựa trên feedback thực tế từ người dùng"

---

## **CASE 3: AUDIT LOG - TRUY VẾT HOẠT ĐỘNG HỆ THỐNG**

### Mục đích:
Trình bày tính **accountability** và **security** của hệ thống:
- Ghi lại tất cả hành động của admin
- Tuân thủ các yêu cầu legal/compliance
- Debug và hỗ trợ khi có vấn đề
- Phát hiện hành động bất thường

### Kỹ thuật áp dụng cho tính năng này:
- **Event Logger** - Ghi nhập tất cả action vào database
- **Timestamp & User Tracking** - Ghi lại who/when/what
- **Advanced Filtering & Search** - Filter theo action type, user, date range
- **Time-series Data** - Xử lý dữ liệu theo thứ tự thời gian
- **Secure Audit Trail** - Không thể xóa được (append-only log)

### Hướng dẫn demo:

+ **Bước 1: Truy cập Audit Logs**
  - Từ sidebar, click → "Quản Lý" → "Nhật Ký Hệ Thống" (Audit Logs)
  - Nói: "Mỗi hành động quản lý đều được ghi lại tại đây"

+ **Bước 2: Nhận xét về cấu trúc dữ liệu**
  - Chỉ ra các cột chính:
    - **Thời gian (Timestamp)**: Exact time khi hành động xảy ra
    - **Người dùng (User)**: Admin đã thực hiện hành động
    - **Hành động (Action)**: Loại hành động (thêm/sửa/xóa)
    - **Đối tượng (Entity)**: Cái gì bị ảnh hưởng (Post, Keyword, User, etc.)
    - **Chi tiết (Details)**: Dữ liệu trước/sau thay đổi

+ **Bước 3: Demo filter theo loại hành động**
  - Nói: "Hãy xem tất cả hành động liên quan đến moderation"
  - Select filter: Action = "POST_MODERATED" hoặc "POST_STATUS_CHANGED"
  - Nhấn "Tìm kiếm"
  - Nói: "Chúng ta có thể nhanh chóng thấy tất cả bài đăng đã bị kiểm duyệt"

+ **Bước 4: Demo filter theo date range**
  - Nói: "Một admin yêu cầu: Tôi cần biết hôm qua ai đã thay đổi keywords"
  - Set date range: "Ngày hôm qua"
  - Set action type: "KEYWORD_UPDATED" hoặc "CONFIG_CHANGED"
  - Click "Tìm kiếm"
  - Nói: "Bam! Chúng ta thấy ngay admin nào và lúc mấy giờ"

+ **Bước 5: Demo xem chi tiết thay đổi**
  - Click vào một log entry
  - Nói: "Chúng ta có thể xem chính xác cái gì bị thay đổi"
  - Nếu là keyword: "Trước: 'xxx', Sau: 'yyy'"
  - Nói: "Điều này rất hữu ích nếu có lỗi - chúng ta có thể xem ai đã thay đổi và quyết định revert"

+ **Bước 6: Demo export audit log**
  - Click nút "Export" (nếu có)
  - Nói: "Chúng ta có thể export logs cho báo cáo kiểm toán (audit report) cho leadership"

---

## **CASE 4: ADVANCED CONTENT FILTERING & SEARCH - TÌM KIẾM THÔNG MINH**

### Mục đích:
Trình bày khả năng tìm kiếm nâng cao để quickly identify problematic content:
- Multi-field search (title, description, category)
- Date range filtering
- Category filtering
- Combine multiple filters

Thể hiện UX thoughtful và efficient workflow.

### Kỹ thuật áp dụng cho tính năng này:
- **Complex Query Building** - Combine multiple filter conditions
- **Database Indexing** - Để search nhanh trên large datasets
- **Text Search** - Fuzzy matching, keyword search
- **Date Range Query** - Efficient date filtering
- **Pagination** - Handle large result sets

### Hướng dẫn demo:

+ **Bước 1: Truy cập Content Management**
  - Từ sidebar, click → "Quản Lý Bài Đăng" (Content Management) → "Tất cả bài"
  - Nói: "Đây là kho bài đăng của tất cả người dùng"

+ **Bước 2: Demo tìm kiếm theo từ khóa**
  - Click vào search box
  - Nhập: "điện thoại"
  - Nói: "Hệ thống sẽ tìm điện thoại trong tiêu đề và mô tả"
  - Kết quả hiển thị tất cả bài liên quan
  - Nhận xét: "Search hoạt động nhanh dù có hàng nghìn bài"

+ **Bước 3: Demo thêm category filter**
  - Nói: "Nhưng tôi chỉ muốn bài đó là trong danh mục Điện tử"
  - Click dropdown "Category"
  - Select "Điện tử"
  - Kết quả tự động cập nhật
  - Nói: "Bam! Chúng ta lọc được 50 bài chính xác hơn"

+ **Bước 4: Demo thêm date range filter**
  - Nói: "Bây giờ tôi chỉ muốn bài được post trong tuần này"
  - Click "Từ ngày" → Chọn ngày bắt đầu tuần
  - Click "Đến ngày" → Chọn ngày hôm nay
  - Kết quả cập nhật: "15 bài"
  - Nói: "Multi-filter rất hữu ích để drill-down vào exact data chúng ta cần"

+ **Bước 5: Demo tab filtering (Status-based)**
  - Click tab "PENDING_ADMIN"
  - Nói: "Chúng tôi cũng có thể filter theo trạng thái bài"
  - Chỉ ra các tab: Chờ duyệt, Approved, Cần chỉnh sửa, Bị từ chối, v.v.

+ **Bước 6: Demo điều hướng nhanh**
  - Chọn một bài từ danh sách kết quả
  - Click "Chi tiết" hoặc "Xem/Sửa"
  - Nói: "Chúng ta có thể nhanh chóng navigate đến bài cụ thể để xem chi tiết hoặc thực hiện hành động"

---

## **CASE 5: POST MODERATION DETAIL - QUYẾT ĐỊNH KIỂM DUYỆT CHI TIẾT**

### Mục đích:
Trình bày workflow quản lý bài đăng:
- Xem toàn bộ thông tin bài (text, images, category, user info)
- Hiểu lý do tại sao bài bị flag (highlight violating keywords)
- Thực hiện hành động: approve, request update, reject

### Kỹ thuật áp dụng cho tính năng này:
- **Content Parsing & Highlighting** - Highlight từ khóa vi phạm
- **Rich Media Display** - Hiển thị hình ảnh, video
- **User Context** - Hiển thị user info, history
- **State Machine** - Transition bài sang các trạng thái khác nhau
- **Reason Logging** - Ghi lại lý do cho hành động

### Hướng dẫn demo:

+ **Bước 1: Truy cập Content Management - Tìm bài của Nhi**
  - Từ sidebar, click → "Quản Lý Bài Đăng"
  - Click tab "PENDING_ADMIN"
  - Nói: "Những bài ở đây là những bài bị hệ thống tự động flag vì chứa keyword vi phạm (từ blacklist chúng ta vừa xem ở Case 2)"
  - Tìm/click vào bài của "Nhi"
  - Nói: "Đây là bài của Nhi đã bị flag vì chứa những từ khóa vi phạm"

+ **Bước 2: Giải thích connection giữa CASE 2 → CASE 5**
  - Nhấn mạnh: "Nhớ các keyword trong blacklist từ lúc nãy? Bài này chính là bị nó trigger"
  - Chỉ ra highlighted keywords trong bài: "Những từ này (ví dụ: 'xxx', 'yyy') nằm trong danh sách từ khóa vi phạm mà chúng ta quản lý ở System Config"
  - Nói: "Đó là cách thuật toán lọc tự động hoạt động - tất cả bài vi phạm sẽ automatic pending cho admin review"

+ **Bước 3: Xem thông tin người dùng**
  - Scroll sang bên phải, xem user profile
  - Nói: "Chúng ta có thể xem lịch sử của người dùng"
  - Kiểm tra: User này đã có trước đó vi phạm không?
  - Nói: "Đây là lần user này vi phạm? Hay repeat offender? Thông tin này giúp quyết định hành động"

+ **Bước 4: Demo request update (NEEDS_UPDATE)**
  - Click nút "Yêu Cầu Chỉnh Sửa"
  - Nói: "Thay vì reject bài, chúng tôi cho user cơ hội sửa lại bài của họ"
  - Nhập reason: "Vui lòng loại bỏ những từ không phù hợp"
  - Click "Gửi"
  - Nói: "Bây giờ bài sẽ chuyển sang trạng thái NEEDS_UPDATE. User sẽ nhận notification và có thể edit bài của họ"

+ **Bước 5: Nhấn mạnh fairness của quy trình**
  - "Workflow này là sự kết hợp: Tự động flag (chính xác) + Manual review (công bằng)"
  - "Nhanh chóng xử lý pending bài (tránh bị stuck)"
  - "Fair đối với user (cho cơ hội sửa thay vì reject ngay)"
  - "Transparent (ghi lại lý do tại sao request update)"

---

## **CASE 6: USER MANAGEMENT - KIỂM SOÁT QUYỀN HẠN ADMIN**

### Mục đích:
Trình bày khả năng quản lý admin users:
- Tạo tài khoản admin mới
- Gán role/permissions
- Quản lý access control

Thể hiện organizational structure và security.

### Kỹ thuật áp dụng cho tính năng này:
- **Role-Based Access Control (RBAC)** - Admin, Moderator, Viewer roles
- **Permission Matrix** - Mỗi role có khác nhau permission
- **User Status Management** - Active/Inactive/Suspended users
- **Secure Password Management** - Hash passwords, force strong pwd
- **Session Management** - Track active sessions

### Hướng dẫn demo:

+ **Bước 1: Truy cập User Management**
  - Từ sidebar, click → "Quản Lý Người Dùng" (Users)
  - Nói: "Đây là danh sách tất cả admin users của hệ thống"

+ **Bước 2: Giải thích các role**
  - Chỉ ra các user hiện tại
  - Nhấn mạnh các role:
    - **Super Admin**: Full access to everything
    - **Content Moderator**: Chỉ được manage content (posts, keywords)
    - **User Manager**: Chỉ được manage users
    - **Viewer**: Chỉ được xem, không được thay đổi

+ **Bước 3: Demo tạo admin user mới** (tùy chọn, nếu có UI)
  - Click "Thêm Admin"
  - Nhập email: "moderator2@example.com"
  - Chọn role: "Content Moderator"
  - Click "Tạo"
  - Nói: "New admin sẽ nhận email với link reset password"

+ **Bước 4: Demo thay đổi role của user**
  - Chọn một user
  - Click "Chỉnh sửa" hoặc "Thay đổi Role"
  - Đổi role từ "Content Moderator" → "User Manager"
  - Click "Lưu"
  - Nói: "Admin mới chỉ có thể quản lý users từ giờ"

+ **Bước 5: Demo vô hiệu hóa user**
  - Chọn một user
  - Click "Vô hiệu hóa" (Deactivate)
  - Nói: "User này sẽ không thể login nữa, nhưng dữ liệu vẫn được giữ lại"

---

## **CASE 7: MONTHLY REPORT - BÁO CÁO CHỈ TIÊU ĐỊNH KỲ**

### Mục đích:
Trình bày khả năng báo cáo dữ liệu:
- Generate monthly statistics
- Export reports
- Track KPIs over time

Thể hiện business intelligence capability.

### Kỹ thuật áp dụng cho tính năng này:
- **Data Aggregation** - Summarize data by period
- **Report Generation** - Create structured reports
- **Export to Multiple Formats** - PDF, Excel, CSV
- **Chart Generation** - Visualize trends
- **Email Delivery** - Auto-send reports

### Hướng dẫn demo:

+ **Bước 1: Truy cập Reports**
  - Từ sidebar, click → "Báo Cáo" (Reports) → "Báo Cáo Hàng Tháng"

+ **Bước 2: Chọn tháng cần báo cáo**
  - Select tháng & năm
  - Click "Tạo Báo Cáo"

+ **Bước 3: Xem report**
  - Hiển thị các metric chính:
    - Tổng users active
    - Total posts
    - Posts moderated
    - Violations detected
    - Matches made
  - Nói: "Báo cáo này cho leadership xem tháng này chúng ta đã hoàn thành gì"

+ **Bước 4: Export report**
  - Click "Export PDF" hoặc "Export Excel"
  - Nói: "Chúng ta có thể gửi report cho stakeholders"

---

## **CASE 8: MATCH MANAGEMENT - KIỂM TOÁN KẾT ĐỐI**

### Mục đích:
Trình bày quản lý kết đối giữa người mất và người tìm được:
- Verify matches (đã liên hệ được không?)
- Mark as resolved
- Collect success metrics

### Kỹ thuật áp dụng cho tính năng này:
- **Match Algorithm** - Tìm matches dựa trên similarity
- **Verification Status** - Track if users connected successfully
- **Success Rate Metrics** - Calculate match success percentage
- **Feedback Collection** - Get feedback from users

### Hướng dẫn demo:

+ **Bước 1: Truy cập Match Management**
  - Từ sidebar, click → "Quản Lý Kết Đối" (Matches)

+ **Bước 2: Xem list of matches**
  - Nói: "Đây là những cặp người dùng mà hệ thống đã tìm được match"
  - Chỉ ra thông tin: User A tìm Item X, User B có Item X → Match!

+ **Bước 3: Demo verify match**
  - Click vào một match
  - Nói: "Chúng ta có thể xác minh: Hai người dùng này đã liên hệ được nhau không?"
  - Nếu "Yes": Click "Đã hoàn thành" (Resolved)
  - Nói: "Mark as resolved giúp chúng ta track success rate"

+ **Bước 4: Xem success metrics**
  - Scroll xuống xem stats:
    - Total matches: X
    - Resolved: Y
    - Success rate: Y/X%
  - Nói: "Đây là metrics quan trọng để đánh giá thuật toán matching của chúng tôi"

---

## **QUICK TIPS CHO NHỮNG SLIDE/DEMO SMOOTH**

1. **Timing**: Mỗi case từ 20-30 giây (tổng 5p)
2. **Narrative**: Cố gắng kể câu chuyện theo góc "Why it matters" thay vì "How it works"
3. **Data**: Nếu có real data thì demo real, không thì dùng mock data đẹp mắt
4. **Transition**: "Bây giờ chúng ta sẽ xem...", "Tiếp theo là...", "Cuối cùng..."
5. **Emphasize**: Nhấn mạnh những tính năng sophisticated:
   - Automatic keyword detection
   - Algorithm tuning flexibility
   - Audit trail for compliance
   - Multi-role access control
   - Real-time analytics

---

## **DEMO FLOW RECOMMENDATION (5 phút)**

**Thời gian breakdown:**
- **0:00 - 0:30**: Login + Dashboard overview (Case 1)
- **0:30 - 1:30**: System Config Keywords (Case 2 - đã mention từ trước)
- **1:30 - 2:00**: Explain violating keywords cho bài Nhi (Case 2, bước 2)
- **2:00 - 2:30**: Add/Remove keywords demo (Case 2, bước 3-5)
- **2:30 - 3:00**: Content Management search + filter (Case 4)
- **3:00 - 3:45**: Post moderation detail (Case 5)
- **3:45 - 4:30**: Audit logs hoặc Algorithm weights (Case 3 hoặc Case 2, bước 6-8)
- **4:30 - 5:00**: Quick mention của User Management + Reports (Case 6, 7)

---

# 📝 Notes for Doanh:

- **Practice beforehand** với data thực tế hoặc mock data đẹp
- **Memorize key talking points** để flow tự nhiên
- **Have backup screenshot** nếu live demo fails
- **Engage audience**: "Có ai biết tại sao chúng ta cần Audit Log không?"
- **Be ready for questions**: Especially about algorithm weights và keyword detection
- **Emphasize sophistication**: "Không phải admin ngồi manually review mỗi bài"
