# Lost & Found Web Application

## 📖 Mô Tả Dự Án

Ứng dụng web **Lost & Found** (Tìm - Mất Đồ Vật) là một nền tảng cho phép người dùng đăng tải thông tin về những vật phẩm bị mất hoặc tìm được, giúp kết nối những người mất đồ với những người tìm được đồ vật đó. Ứng dụng bao gồm:

- **Server Backend**: Built with NestJS + MongoDB
- **Admin Site**: Angular application để quản lý hệ thống
- **Client Site**: Angular application cho người dùng thông thường

---

## 🛠️ Công Nghệ Sử Dụng

### Backend (Server)
- **NestJS** v10 - Framework Node.js
- **MongoDB** - NoSQL Database
- **JWT** - Authentication & Authorization
- **Passport** - Authentication middleware
- **Bcryptjs** - Password hashing
- **Cloudinary** - Image storage
- **Nodemailer** - Email service
- **Class Validator** - DTO validation

### Frontend
- **Angular** v17+ - Web framework
- **TypeScript** - Language
- **SCSS/Tailwind CSS** - Styling
- **RxJS** - Reactive programming

---

## 📁 Cấu Trúc Dự Án

```
final_project_advance_web/
├── server/                          # Backend NestJS
│   ├── src/
│   │   ├── main.ts                  # Entry point
│   │   ├── app.module.ts            # Root module
│   │   ├── app.controller.ts        # Root controller
│   │   ├── auth/                    # Authentication module
│   │   ├── users/                   # Users module
│   │   ├── posts/                   # Posts management
│   │   ├── claims/                  # Claims/Requests
│   │   ├── matches/                 # Matching algorithm
│   │   ├── me/                      # Current user profile
│   │   ├── admin/                   # Admin panel
│   │   ├── audit-log/               # Audit logging
│   │   ├── notifications/           # Notifications
│   │   ├── keyword/                 # Keyword management
│   │   ├── mail/                    # Email service
│   │   ├── cloudinary/              # Image upload service
│   │   └── common/                  # Shared utilities
│   ├── config/
│   │   ├── db/                      # Database config
│   │   └── passport.js              # Passport strategies
│   ├── package.json
│   └── tsconfig.json
│
├── admin-site/                      # Admin Angular Application
│   ├── src/
│   │   ├── app/
│   │   ├── assets/
│   │   └── environments/
│   └── angular.json
│
├── client-site/                     # Client Angular Application
│   ├── src/
│   │   ├── app/
│   │   ├── assets/
│   │   └── environments/
│   └── angular.json
│
└── README.md
```

---

## 🚀 Hướng Dẫn Cài Đặt

### Yêu Cầu
- Node.js v16+
- npm v8+
- MongoDB v5+

### 1. Clone Project
```bash
git clone https://github.com/nhynhi23411/final_project_advance_web.git
cd final_project_advance_web
```

### 2. Cài Đặt Backend

```bash
cd server
npm install
```

**Tạo file `.env`:**
```env
# Database
MONGO_URI=mongodb://localhost:27017/lost_found_db

# JWT
JWT_SECRET=your_secret_key_here
JWT_EXPIRATION=24h

# Mail Service
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your_email@gmail.com
MAIL_PASSWORD=your_app_password

# Cloudinary
CLOUDINARY_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Reset Password
RESET_PASSWORD_EXPIRES_MINUTES=20
ADMIN_RESET_PASSWORD_URL=http://localhost:4200/reset-password
CLIENT_RESET_PASSWORD_URL=http://localhost:4300/auth/reset-password

# Port
PORT=3000
```

### 3. Cài Đặt Admin Site
```bash
cd admin-site
npm install
```

### 4. Cài Đặt Client Site
```bash
cd client-site
npm install
```

---

## 📝 Hướng Dẫn Chạy Ứng Dụng

### Chạy Backend Server
```bash
cd server
npm start
```
Server chạy tại `http://localhost:3000`

### Chạy Admin Site
```bash
cd admin-site
ng serve
```
Admin site chạy tại `http://localhost:4200`

### Chạy Client Site
```bash
cd client-site
ng serve --port 4300
```
Client site chạy tại `http://localhost:4300`

---

## 🔑 Các Module Chính

### 1. **Auth Module** (`auth/`)
Quản lý xác thực người dùng
- `auth.controller.ts` - Register, Login, Forgot Password, Reset Password
- `auth.service.ts` - Business logic for authentication
- `auth.module.ts` - Auth module configuration
- `jwt.strategy.ts` - JWT strategy
- `jwt-auth.guard.ts` - JWT guard
- `roles.guard.ts` - Role-based authorization

### 2. **Users Module** (`users/`)
Quản lý tài khoản người dùng
- `users.service.ts` - User operations
- `users.module.ts` - Users module
- `schemas/user.schema.ts` - User database schema

### 3. **Posts Module** (`posts/`)
Quản lý bài đăng (mất/tìm được vật phẩm)
- `posts.controller.ts` - Create, Read, Update, Delete posts
- `posts.service.ts` - Post business logic
- `schemas/post.schema.ts` - Post database schema
- `dto/` - Data transfer objects

### 4. **Claims Module** (`claims/`)
Quản lý yêu cầu khôi phục vật phẩm
- `claims.controller.ts` - Claim endpoints
- `claims.service.ts` - Claim logic

### 5. **Matches Module** (`matches/`)
Thuật toán khớp vật phẩm
- `matches.controller.ts` - Match endpoints
- `matches.service.ts` - Matching algorithm

### 6. **Admin Module** (`admin/`)
Bảng điều khiển quản trị
- `admin.controller.ts` - Admin endpoints
- `admin-posts.controller.ts` - Post management
- `admin-posts.service.ts` - Post admin operations

### 7. **Me Module** (`me/`)
Quản lý hồ sơ người dùng hiện tại
- `me.controller.ts` - Get/Update profile
- `dto/update-me.dto.ts` - Update profile DTO

### 8. **Notifications Module** (`notifications/`)
Hệ thống thông báo
- `notifications.service.ts` - Notification logic

### 9. **Audit Log Module** (`audit-log/`)
Ghi nhật ký hoạt động hệ thống
- `audit-log.service.ts` - Logging operations

---

## 📡 Các API Endpoints Chính

### Authentication
```
POST   /api/auth/register        - Đăng ký tài khoản
POST   /api/auth/login           - Đăng nhập
POST   /api/auth/forgot-password - Quên mật khẩu
POST   /api/auth/reset-password  - Đặt lại mật khẩu
```

### Profile
```
GET    /api/me                   - Lấy thông tin hồ sơ
PATCH  /api/me                   - Cập nhật hồ sơ
```

### Posts
```
GET    /api/posts                - Danh sách bài đăng
POST   /api/posts                - Tạo bài đăng mới
GET    /api/posts/:id            - Chi tiết bài đăng
PATCH  /api/posts/:id            - Cập nhật bài đăng
DELETE /api/posts/:id            - Xóa bài đăng
```

### Claims
```
POST   /api/claims               - Tạo yêu cầu khôi phục
GET    /api/claims               - Danh sách yêu cầu
PATCH  /api/claims/:id           - Cập nhật trạng thái yêu cầu
```

### Matches
```
GET    /api/matches              - Danh sách khớp đối
POST   /api/matches              - Tạo khớp đối
```

### Admin
```
GET    /api/admin/posts          - Quản lý bài đăng
GET    /api/admin/users          - Quản lý người dùng
GET    /api/admin/system-config  - Cấu hình hệ thống
```

---

## 🔐 Bảo Mật

- **JWT Authentication**: Tất cả endpoints được bảo vệ bằng JWT
- **Password Hashing**: Mật khẩu được hash với bcryptjs
- **Role-Based Access Control**: Phân quyền dựa trên role (USER, ADMIN)
- **CORS Protection**: Cấu hình CORS cho các domain  được phép
- **Validation**: DTO validation cho tất cả requests

---

## 💾 Database Schema

Project sử dụng MongoDB với các collections chính:

- **users** - Thông tin người dùng
- **posts** - Bài đăng mất/tìm được vật phẩm
- **claims** - Yêu cầu nhận đồ
- **matches** - Kết quả khớp đối
- **notifications** - Thông báo
- **audit_logs** - Lịch sử hoạt động
- **keywords** - Từ khóa bị cấm

---

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm test -- --coverage
```

---

## 📦 Build Production

### Backend
```bash
cd server
npm run build
npm run start:prod
```

### Admin Site
```bash
cd admin-site
ng build --configuration production
```

### Client Site
```bash
cd client-site
ng build --configuration production
```

---

## 👨‍💻 Tác Giả
**Nhóm 7**

---

## 📄 License
ISC
