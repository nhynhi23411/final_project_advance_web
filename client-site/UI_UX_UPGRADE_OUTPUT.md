# OUTPUT – Nâng cấp UI/UX client-site (Lost & Found)

## Khôi phục code trước khi áp dụng prompt (nếu cần)

Trên máy bạn, mở terminal tại thư mục project và chạy:

```bash
cd d:\CODE\final_project_advance_web

# Xem commit trước khi có thay đổi UI/UX
git log --oneline -20

# Cách 1: Khôi phục toàn bộ client-site về commit cũ (thay <commit-hash> bằng hash thực)
git checkout <commit-hash> -- client-site/

# Cách 2: Nếu bạn đã commit sau khi upgrade, revert commit đó
git revert <commit-hash> --no-commit
git checkout -- client-site/
git reset HEAD client-site/
```

Sau khi khôi phục xong, bạn có thể yêu cầu implement lại theo đúng prompt (tránh lỗi template: dùng `$any(post)` thay cho `(post as any)` trong Angular template).

---

## 1. Các component mới

| Component | Mô tả |
|-----------|--------|
| **ArchiveComponent** | Trang `/archive`: danh sách bài đăng đã đóng/đã trả (ARCHIVED, RETURNED). Có header, empty state, grid card (ảnh, badge, title, category, location, nút Xem chi tiết). |
| **GlobalErrorHandler** | ErrorHandler toàn cục: log lỗi ra console để debug trang trắng (không đổi logic nghiệp vụ). |

**Component đã có, chỉ mở rộng/cải tiến:**

- **ProfileComponent**: Thêm tab My Posts | Claims | Archive; hiển thị Trạng thái tài khoản; bảng có status badge (APPROVED, PENDING_SYSTEM, REJECTED, ARCHIVED, RETURNED).
- **ItemDetailComponent**: Thêm status badge, view count, người đăng; section "Các bài đăng liên quan"; nút Đóng bài đăng; button Gửi yêu cầu xác minh (disable khi là chủ bài).
- **PostsComponent**: Thêm status badge trên card, user name, view count; skeleton loading; empty state "Chưa có bài đăng nào" + nút Đăng tin mới.
- **LandingComponent**: Hero "Tìm lại đồ thất lạc nhanh chóng", CTA "Đăng tin tìm đồ"; Stats (Tổng bài đăng, Đồ đã tìm thấy, Người dùng); Category quick filter (Ví, Điện thoại, Laptop, Chìa khóa, Thẻ sinh viên, Ba lô).
- **AuthNavbarComponent**: Avatar + dropdown (Profile, My Posts, Archive, Logout) khi đã login; icon chuông thông báo + dropdown placeholder.
- **ClaimModalComponent** (đã có): Form ghi chú, mô tả đặc điểm bí mật, upload ảnh; sau submit toast "Yêu cầu xác minh đã được gửi."

---

## 2. Các route mới

| Route | Component | Guard | Ghi chú |
|-------|------------|--------|--------|
| `/profile` | ProfileComponent | AuthGuard | Đã có từ trước; không đổi path. |
| `/archive` | ArchiveComponent | AuthGuard | **Route mới** – trang lưu trữ bài đăng đã đóng/đã trả. |

Các route khác giữ nguyên: `/`, `/posts`, `/post-item`, `/about`, `/items/:id`, `/suggestions`, `/auth/login`, `/auth/register`.

---

## 3. Các UI được cải tiến

- **Status badge (toàn site):** APPROVED (xanh), PENDING_SYSTEM / PENDING (vàng), REJECTED (đỏ), ARCHIVED (xám), RETURNED (tím). Dùng trên: post card, post detail, profile (My Posts & Archive tab).
- **Navbar:** Trang chủ, Bài đăng, Đăng tin, Về chúng tôi, Profile. Khi đã login: avatar + dropdown (Profile, My Posts, Archive, Logout); icon chuông + dropdown thông báo (placeholder).
- **Post card:** Thumbnail, badge status, tiêu đề, category, location, time, user name, view count; hover shadow + scale nhẹ.
- **Post detail:** Ảnh lớn, tên, category, location, thời gian, người đăng, lượt xem; section mô tả; nút Gửi yêu cầu xác minh (disable nếu là chủ bài), Đóng bài đăng, section "Các bài đăng liên quan" (card ngang).
- **Profile:** Thông tin user (tên, email, SĐT, trạng thái tài khoản); tab My Posts / Claims / Archive; bảng có status badge và nút Xem chi tiết.
- **Landing:** Hero + CTA "Đăng tin tìm đồ"; Stats; Category quick filter; giữ nguyên các section giới thiệu, quy trình, FAQ.
- **Empty state:** Icon + "Chưa có bài đăng nào" (hoặc "Chưa có bài đăng phù hợp" khi có bộ lọc) + nút "Đăng tin mới" / "Xóa bộ lọc và tìm lại".
- **Skeleton loading:** Trang posts dùng skeleton card khi đang load.
- **Spacing, shadow, hover:** Card shadow nhẹ, button hover, badge rõ ràng (trong `styles.css` và component scss).

---

## 4. Xác nhận không thay đổi backend

- **Không thay đổi backend API:** Mọi gọi API vẫn dùng endpoint và payload hiện có (items, items/my, items/:id, claims, auth, me, v.v.).
- **Không phá logic hiện tại:** Đăng ký, đăng nhập, tạo bài đăng, duyệt bài, claim vẫn hoạt động như cũ; chỉ bổ sung/xử lý dữ liệu phía client (filter ARCHIVED/RETURNED cho archive, related items từ getItems, stats từ getItems).
- **Không thay đổi route đang hoạt động:** Chỉ thêm route `/archive`; các path còn lại giữ nguyên.
- Dữ liệu chưa có từ backend (ví dụ view_count, created_by dạng tên) được hiển thị placeholder (0, "—") hoặc ẩn an toàn.
