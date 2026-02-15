# CHƯƠNG 2: PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG

## 2.1. Phân tích Yêu cầu Hệ thống

### 2.1.1. Yêu cầu Chức năng

Hệ thống Huế Travel AI cần đáp ứng các yêu cầu chức năng sau:

**Nhóm chức năng Người dùng (User):**

| STT  | Chức năng             | Mô tả                                      |
| ---- | --------------------- | ------------------------------------------ |
| UC01 | Đăng ký tài khoản     | Tạo tài khoản mới với username và password |
| UC02 | Đăng nhập             | Xác thực và tạo phiên làm việc             |
| UC03 | Đăng xuất             | Kết thúc phiên làm việc                    |
| UC04 | Quên mật khẩu         | Đặt lại mật khẩu qua email                 |
| UC05 | Cập nhật hồ sơ        | Sửa thông tin cá nhân                      |
| UC06 | Xem bản đồ            | Hiển thị bản đồ với các địa điểm           |
| UC07 | Xem chi tiết địa điểm | Thông tin, hình ảnh, đánh giá              |
| UC08 | Like địa điểm         | Thêm vào danh sách yêu thích               |
| UC09 | Viết đánh giá         | Rating và bình luận                        |
| UC10 | Xem gợi ý AI          | Địa điểm được gợi ý cá nhân hóa            |
| UC11 | Tạo lộ trình AI       | Lập kế hoạch du lịch tự động               |
| UC12 | Lưu lộ trình          | Lưu lộ trình đã tạo                        |
| UC13 | Xem lịch sử           | Địa điểm đã thích, đánh giá, lộ trình      |

**Nhóm chức năng Quản trị (Admin):**

| STT  | Chức năng          | Mô tả                       |
| ---- | ------------------ | --------------------------- |
| UC14 | Quản lý người dùng | Xem, xóa tài khoản          |
| UC15 | Thêm địa điểm      | Tạo địa điểm mới            |
| UC16 | Sửa địa điểm       | Cập nhật thông tin địa điểm |
| UC17 | Xóa địa điểm       | Loại bỏ địa điểm            |
| UC18 | Chạy thuật toán AI | Cập nhật PageRank           |

### 2.1.2. Yêu cầu Phi chức năng

| Loại                 | Yêu cầu            | Mô tả                           |
| -------------------- | ------------------ | ------------------------------- |
| **Hiệu năng**        | Thời gian phản hồi | API response < 500ms            |
| **Hiệu năng**        | Đồng thời          | Hỗ trợ 100+ users đồng thời     |
| **Bảo mật**          | Mã hóa mật khẩu    | Sử dụng hashing (PBKDF2-SHA256) |
| **Bảo mật**          | Phiên làm việc     | Flask-Login quản lý session     |
| **Khả dụng**         | Uptime             | 99% availability                |
| **Khả năng mở rộng** | Dữ liệu            | Hỗ trợ 1000+ địa điểm           |
| **Tương thích**      | Trình duyệt        | Chrome, Firefox, Edge, Safari   |
| **Giao diện**        | Responsive         | Hỗ trợ desktop và mobile        |

---

## 2.2. Biểu đồ Use Case

### 2.2.1. Use Case Diagram - Tổng quan

```
                    ┌─────────────────────────────────────────────────┐
                    │          HUẾ TRAVEL AI SYSTEM                   │
                    │                                                 │
                    │  ┌──────────────┐    ┌──────────────┐          │
         ┌──────┐   │  │  Đăng ký     │    │  Đăng nhập   │          │
         │      │───┼──│  tài khoản   │    │              │          │
         │      │   │  └──────────────┘    └──────────────┘          │
         │      │   │                                                 │
         │ User │   │  ┌──────────────┐    ┌──────────────┐          │
         │      │───┼──│  Xem bản đồ  │    │  Like địa    │          │
         │      │   │  │  & địa điểm  │    │  điểm        │          │
         │      │   │  └──────────────┘    └──────────────┘          │
         │      │   │                                                 │
         │      │   │  ┌──────────────┐    ┌──────────────┐          │
         │      │───┼──│  Viết đánh   │    │  Xem gợi ý   │          │
         │      │   │  │  giá         │    │  AI          │          │
         └──────┘   │  └──────────────┘    └──────────────┘          │
                    │                                                 │
                    │  ┌──────────────┐    ┌──────────────┐          │
         ┌──────┐   │  │  Tạo lộ      │    │  Lưu lộ      │          │
         │      │───┼──│  trình AI    │    │  trình       │          │
         │      │   │  └──────────────┘    └──────────────┘          │
         │      │   │                                                 │
         │Admin │   │  ┌──────────────┐    ┌──────────────┐          │
         │      │───┼──│  Quản lý     │    │  Quản lý     │          │
         │      │   │  │  người dùng  │    │  địa điểm    │          │
         │      │   │  └──────────────┘    └──────────────┘          │
         │      │   │                                                 │
         │      │   │  ┌──────────────┐                              │
         │      │───┼──│  Chạy thuật  │                              │
         └──────┘   │  │  toán AI     │                              │
                    │  └──────────────┘                              │
                    │                                                 │
                    └─────────────────────────────────────────────────┘
```

### 2.2.2. Mô tả Use Case Chính

**Use Case: UC10 - Xem gợi ý AI**

| Thành phần         | Mô tả                                                                                                                                                                                                                   |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Actor**          | User (đã đăng nhập)                                                                                                                                                                                                     |
| **Mô tả**          | Người dùng xem danh sách địa điểm được AI gợi ý                                                                                                                                                                         |
| **Tiền điều kiện** | User đã đăng nhập                                                                                                                                                                                                       |
| **Luồng chính**    | 1. User click tab "Gợi ý AI" <br> 2. Hệ thống lấy username từ session <br> 3. Gọi API /api/recommend/{username} <br> 4. Thuật toán Hybrid tính điểm <br> 5. Trả về Top 12 địa điểm <br> 6. Hiển thị cards với thông tin |
| **Luồng phụ**      | Nếu chưa đăng nhập → Hiển thị form nhập username để phân tích                                                                                                                                                           |
| **Hậu điều kiện**  | Danh sách gợi ý được hiển thị                                                                                                                                                                                           |

**Use Case: UC11 - Tạo lộ trình AI**

| Thành phần         | Mô tả                                                                                                                                                                                                                                                                                              |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Actor**          | User (đã đăng nhập)                                                                                                                                                                                                                                                                                |
| **Mô tả**          | Người dùng tạo lộ trình du lịch tự động                                                                                                                                                                                                                                                            |
| **Tiền điều kiện** | User đã đăng nhập                                                                                                                                                                                                                                                                                  |
| **Luồng chính**    | 1. User click "Lập Lộ Trình Thông Minh" <br> 2. Modal hiện lên với options <br> 3. User chọn số ngày (1-5) <br> 4. User chọn sở thích (categories) <br> 5. User chọn chế độ (AI mới / Từ đã thích) <br> 6. Click "Tạo lộ trình" <br> 7. Hệ thống chạy thuật toán <br> 8. Hiển thị kết quả lộ trình |
| **Luồng phụ**      | Nếu chọn "Từ đã thích" nhưng chưa like địa điểm nào → Báo lỗi                                                                                                                                                                                                                                      |
| **Hậu điều kiện**  | Lộ trình được hiển thị, có thể lưu                                                                                                                                                                                                                                                                 |

---

## 2.3. Thiết kế Kiến trúc Hệ thống

### 2.3.1. Kiến trúc Tổng quan

Hệ thống được thiết kế theo mô hình **3-Layer Architecture**:

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   HTML5     │  │   CSS3      │  │ JavaScript  │              │
│  │  (Jinja2)   │  │ (Modular)   │  │ (Vanilla)   │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                         │                                        │
│  ┌──────────────────────┴──────────────────────┐                │
│  │              Leaflet.js (Maps)               │                │
│  └──────────────────────────────────────────────┘                │
└─────────────────────────────────────────────────────────────────┘
                              │ HTTP/JSON
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BUSINESS LAYER                               │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                  Flask Application                       │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │    │
│  │  │ auth.py  │ │ api.py   │ │ admin.py │ │ main.py  │    │    │
│  │  │ (Login)  │ │ (Core)   │ │ (CRUD)   │ │ (Views)  │    │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│  ┌───────────────────────────┴───────────────────────────┐      │
│  │            AI Algorithms (PageRank, CF, Planner)       │      │
│  └───────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
                              │ Cypher
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              Neo4j Graph Database                        │    │
│  │                                                          │    │
│  │    (User)──[:LIKED]──>(Location)──[:HAS_CATEGORY]──>(Cat)│    │
│  │       │                   │                              │    │
│  │       └──[:REVIEWED]──────┘                              │    │
│  │                                                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────┐                                                │
│  │ Neo4j GDS   │ (PageRank, Graph Algorithms)                   │
│  └─────────────┘                                                │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3.2. Mô tả Các Layer

**1. Presentation Layer (Tầng Trình bày):**

- HTML5 với Jinja2 templating
- CSS3 modular (10 files riêng biệt)
- JavaScript Vanilla cho interactivity
- Leaflet.js cho bản đồ tương tác

**2. Business Layer (Tầng Nghiệp vụ):**

- Flask framework xử lý HTTP requests
- Flask Blueprints tổ chức code theo modules
- Các thuật toán AI: PageRank, Collaborative Filtering, Nearest Neighbor
- Flask-Login quản lý authentication

**3. Data Layer (Tầng Dữ liệu):**

- Neo4j Graph Database lưu trữ nodes và relationships
- Neo4j GDS chạy thuật toán đồ thị
- Python neo4j driver kết nối và truy vấn

### 2.3.3. Luồng Dữ liệu

```
User Request → Flask Routes → Business Logic → Neo4j Query →
    → Result Processing → JSON Response → JavaScript → UI Update
```

---

## 2.4. Thiết kế Cơ sở dữ liệu Đồ thị

### 2.4.1. Graph Schema

**Nodes:**

```
(:User {
    name: String,           // Username (unique)
    password: String,       // Hashed password
    email: String,          // Email
    fullname: String,       // Họ tên
    role: String,           // "user" | "admin"
    created_at: DateTime    // Ngày tạo
})

(:Location {
    name: String,           // Tên địa điểm (unique)
    desc: String,           // Mô tả
    lat: Float,             // Vĩ độ
    lng: Float,             // Kinh độ
    image: String,          // URL hình ảnh
    rating: Float,          // Điểm đánh giá TB
    reviewCount: Integer,   // Số lượt đánh giá
    pagerankScore: Float,   // Điểm PageRank
    pagerankNorm: Float,    // PageRank chuẩn hóa (0-1)
    pagerankConnect: Float, // PageRank kết nối
    lastAlgoRun: String     // Thời gian chạy thuật toán
})

(:Category {
    name: String            // Tên danh mục
})

(:City {
    name: String            // Tên thành phố
})

(:Itinerary {
    id: String,             // UUID
    title: String,          // Tiêu đề
    data: String,           // JSON data
    days: Integer,          // Số ngày
    created_at: DateTime    // Ngày tạo
})
```

**Relationships:**

```
(:User)-[:LIKED {
    timestamp: DateTime,
    auto_from_review: Boolean
}]->(:Location)

(:User)-[:REVIEWED {
    id: String,
    rating: Float,
    comment: String,
    sentiment: String,
    topics: List<String>,
    timestamp: DateTime
}]->(:Location)

(:User)-[:INTERACTED {
    weight: Float,          // Trọng số tổng hợp
    liked_score: Float,     // Điểm từ LIKED
    review_score: Float,    // Điểm từ REVIEWED
    created_at: DateTime
}]->(:Location)

(:Location)-[:HAS_CATEGORY]->(:Category)

(:Location)-[:LOCATED_IN]->(:City)

(:Location)-[:RELATED_TO {
    weight: Float           // Trọng số (co-occurrence + category)
}]-(:Location)

(:User)-[:CREATED]->(:Itinerary)
```

### 2.4.2. Sơ đồ quan hệ ERD-style

```
┌─────────────────┐          ┌─────────────────┐
│      USER       │          │    LOCATION     │
├─────────────────┤          ├─────────────────┤
│ name (PK)       │──LIKED──>│ name (PK)       │
│ password        │          │ desc            │
│ email           │─REVIEWED>│ lat, lng        │
│ fullname        │          │ image           │
│ role            │─INTERACT>│ rating          │
│ created_at      │          │ pagerankScore   │
└─────────────────┘          └────────┬────────┘
        │                             │
        │ CREATED                     │ HAS_CATEGORY
        ▼                             ▼
┌─────────────────┐          ┌─────────────────┐
│   ITINERARY     │          │    CATEGORY     │
├─────────────────┤          ├─────────────────┤
│ id (PK)         │          │ name (PK)       │
│ title           │          └─────────────────┘
│ data            │
│ days            │          ┌─────────────────┐
│ created_at      │          │      CITY       │
└─────────────────┘          ├─────────────────┤
                             │ name (PK)       │
                             └─────────────────┘
```

### 2.4.3. Index và Constraints

```cypher
// Unique constraints
CREATE CONSTRAINT user_name IF NOT EXISTS FOR (u:User) REQUIRE u.name IS UNIQUE;
CREATE CONSTRAINT location_name IF NOT EXISTS FOR (l:Location) REQUIRE l.name IS UNIQUE;
CREATE CONSTRAINT category_name IF NOT EXISTS FOR (c:Category) REQUIRE c.name IS UNIQUE;

// Indexes
CREATE INDEX user_email IF NOT EXISTS FOR (u:User) ON (u.email);
CREATE INDEX location_category IF NOT EXISTS FOR (l:Location) ON (l.pagerankScore);
```

---

## 2.5. Thiết kế API

### 2.5.1. RESTful API Design

**Base URL:** `http://localhost:5000`

**Authentication APIs:**

| Method | Endpoint        | Request Body                      | Response                   |
| ------ | --------------- | --------------------------------- | -------------------------- |
| POST   | /login          | `{username, password}`            | `{success, message, role}` |
| POST   | /register       | `{username, password}`            | `{success, message}`       |
| GET    | /logout         | -                                 | Redirect                   |
| POST   | /reset-password | `{username, email, new_password}` | `{success, message}`       |

**Location APIs:**

| Method | Endpoint                | Request Body                  | Response                        |
| ------ | ----------------------- | ----------------------------- | ------------------------------- |
| GET    | /api/locations          | ?category=                    | `[{name, lat, lng, ...}]`       |
| GET    | /api/reviews/{location} | -                             | `[{username, rating, comment}]` |
| POST   | /api/like               | `{location_name}`             | `{liked, message}`              |
| POST   | /api/review             | `{location, rating, comment}` | `{success, stats}`              |
| DELETE | /api/review             | `{location, review_id}`       | `{success}`                     |

**AI APIs:**

| Method | Endpoint                  | Request Body                     | Response               |
| ------ | ------------------------- | -------------------------------- | ---------------------- |
| GET    | /api/recommend/{username} | -                                | `[{name, score, ...}]` |
| POST   | /api/planner              | `{days, preferences, use_liked}` | `[{day, activities}]`  |
| GET    | /api/itineraries          | -                                | `[{id, title, data}]`  |
| POST   | /api/save-itinerary       | `{data}`                         | `{success}`            |

**Admin APIs:**

| Method | Endpoint               | Request Body                  | Response                      |
| ------ | ---------------------- | ----------------------------- | ----------------------------- |
| GET    | /admin/users           | -                             | `[{name, role, liked_count}]` |
| DELETE | /admin/user/{name}     | -                             | `{success}`                   |
| POST   | /admin/location        | `{name, desc, lat, lng, ...}` | `{success}`                   |
| PUT    | /admin/location/{name} | `{desc, lat, lng, ...}`       | `{success}`                   |
| POST   | /admin/run-algo        | -                             | `{success, message}`          |

### 2.5.2. Response Format

**Success Response:**

```json
{
    "success": true,
    "data": [...],
    "message": "Thành công"
}
```

**Error Response:**

```json
{
  "success": false,
  "error": "Lỗi mô tả",
  "code": 400
}
```

---

## 2.6. Thiết kế Giao diện

### 2.6.1. Wireframe Trang Chủ

```
┌─────────────────────────────────────────────────────────────────────┐
│  ┌──────────────────────────┐  ┌───────────────────────────────────┐│
│  │ 🗺️ Huế Travel AI        │  │                                   ││
│  │    Hệ gợi ý du lịch      │  │                                   ││
│  │                          │  │                                   ││
│  │  [👤 Đăng nhập]          │  │          BẢN ĐỒ LEAFLET           ││
│  ├──────────────────────────┤  │                                   ││
│  │  🔍 [Tìm kiếm user...]   │  │     📍 Markers địa điểm          ││
│  ├──────────────────────────┤  │                                   ││
│  │                          │  │                                   ││
│  │  [✨ Gợi ý AI] [🧭 Khám  │  │     🔥 Heatmap overlay            ││
│  │      phá]                │  │                                   ││
│  ├──────────────────────────┤  │                                   ││
│  │                          │  ├───────────────────────────────────┤│
│  │  📍 Địa điểm nổi bật     │  │  [🔥 Bản đồ nhiệt]               ││
│  │  [🔍 Tìm nhanh...]       │  │                                   ││
│  │                          │  │  ● PageRank   ● Gợi ý AI         ││
│  │  [Tất cả] [Di tích]      │  │                                   ││
│  │  [Ẩm thực] [Tâm linh]    │  │                                   ││
│  │                          │  │                                   ││
│  │  ┌────────────────────┐  │  │                                   ││
│  │  │ 🏯 Đại Nội        │  │  │                                   ││
│  │  │ ⭐ 4.7  📍 1.2km   │  │  │                                   ││
│  │  └────────────────────┘  │  │                                   ││
│  │  ┌────────────────────┐  │  │                                   ││
│  │  │ 🛕 Chùa Thiên Mụ  │  │  │                                   ││
│  │  │ ⭐ 4.8  📍 2.5km   │  │  │                                   ││
│  │  └────────────────────┘  │  │                                   ││
│  │                          │  │                                   ││
│  └──────────────────────────┘  └───────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

### 2.6.2. Wireframe Modal AI Planner

```
┌─────────────────────────────────────────┐
│  ✨ Lập Lộ Trình Thông Minh       [X]  │
├─────────────────────────────────────────┤
│                                         │
│  📅 Số ngày:                            │
│  ┌───────────────────────────────────┐  │
│  │  [1] [2] [3] [4] [5]  ngày        │  │
│  └───────────────────────────────────┘  │
│                                         │
│  🎯 Sở thích (chọn nhiều):              │
│  ┌───────────────────────────────────┐  │
│  │ [x] Di tích    [ ] Ẩm thực       │  │
│  │ [x] Tâm linh   [ ] Thiên nhiên   │  │
│  │ [ ] Bãi biển   [ ] Mua sắm       │  │
│  └───────────────────────────────────┘  │
│                                         │
│  🤖 Chế độ:                             │
│  ○ AI gợi ý mới                        │
│  ● Từ danh sách đã thích               │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │     🚀 TẠO LỘ TRÌNH              │  │
│  └───────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

### 2.6.3. Bảng Màu và Typography

**Bảng màu chính:**

| Màu            | Hex                    | Sử dụng                    |
| -------------- | ---------------------- | -------------------------- |
| Primary        | #6366f1                | Buttons, links, highlights |
| Secondary      | #8b5cf6                | Accents                    |
| Background     | #0f172a                | Dark mode background       |
| Surface        | rgba(255,255,255,0.05) | Cards, modals              |
| Text Primary   | #f1f5f9                | Main text                  |
| Text Secondary | #94a3b8                | Muted text                 |
| Success        | #22c55e                | Success states             |
| Error          | #ef4444                | Error states               |
| Warning        | #f59e0b                | Warnings                   |

**Typography:**

| Element | Font  | Size | Weight |
| ------- | ----- | ---- | ------ |
| H1      | Inter | 28px | 700    |
| H2      | Inter | 22px | 600    |
| H3      | Inter | 18px | 600    |
| Body    | Inter | 14px | 400    |
| Small   | Inter | 12px | 400    |
| Button  | Inter | 14px | 600    |

---

## 2.7. Thiết kế Thuật toán

### 2.7.1. Flowchart Hybrid Recommendation

```
                    ┌─────────────┐
                    │   START     │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ Nhận input  │
                    │ username    │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │ Bước 1:      │ │ Bước 2:      │ │ Bước 2.5:    │
    │ Collaborative│ │Content-Based │ │  PageRank    │
    │  Filtering   │ │  Filtering   │ │Diversity Pool│
    │  (collab)    │ │  (content)   │ │ (Top 20)     │
    └──────┬───────┘ └──────┬───────┘ └──────┬───────┘
           │                │                │
           │ score × 3      │ score × 1      │ score × 5
           │                │                │
           └────────────────┼────────────────┘
                            │
                            ▼
                  ┌───────────────────┐
                  │ Bước 3: GỘP TẤT CẢ│
                  │ collab + content  │
                  │ + pagerank        │
                  └────────┬──────────┘
                           │
                           ▼
                    ┌─────────────────┐
                    │ Bước 4: Tính    │
                    │ Final Score     │
                    │ = CF + CB + PR  │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  Sắp xếp theo   │
                    │  Final Score    │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │   Trả về        │
                    │   Top 12        │
                    └────────┬────────┘
                             │
                             ▼
                       ┌──────────┐
                       │   END    │
                       └──────────┘
```

### 2.7.2. Flowchart AI Planner

```
                    ┌─────────────┐
                    │   START     │
                    └──────┬──────┘
                           │
                           ▼
              ┌────────────────────────┐
              │ Input: days, preferences│
              │        use_liked        │
              └───────────┬────────────┘
                          │
                          ▼
              ┌────────────────────────┐
              │ Lấy danh sách ứng viên │
              │ (Query Neo4j)          │
              └───────────┬────────────┘
                          │
                          ▼
              ┌────────────────────────┐
              │ Phân loại:             │
              │ - pool_sightseeing     │
              │ - pool_food            │
              └───────────┬────────────┘
                          │
                          ▼
              ┌────────────────────────┐
              │    FOR day = 1 to N    │◄────┐
              └───────────┬────────────┘     │
                          │                  │
      ┌───────────────────┼───────────────┐  │
      ▼                   ▼               ▼  │
┌──────────┐       ┌──────────┐    ┌──────────┐
│  SÁNG    │       │  TRƯA    │    │  CHIỀU   │
│ pop_near │       │ pop_near │    │ pop_near │
│ (sight)  │       │ (food)   │    │ (sight)  │
└────┬─────┘       └────┬─────┘    └────┬─────┘
     │                  │               │
     └──────────────────┴───────────────┘
                        │
                        ▼
              ┌────────────────────────┐
              │        day++           │────┘
              └───────────┬────────────┘
                          │
                          ▼
              ┌────────────────────────┐
              │    Trả về itinerary    │
              └───────────┬────────────┘
                          │
                          ▼
                    ┌──────────┐
                    │   END    │
                    └──────────┘
```

---

## 2.8. Kết luận Chương

Chương này đã trình bày phân tích và thiết kế hệ thống Huế Travel AI:

1. **Phân tích yêu cầu:** 18 chức năng chia thành 2 nhóm User và Admin, cùng các yêu cầu phi chức năng về hiệu năng, bảo mật.

2. **Biểu đồ Use Case:** Mô tả các tác nhân và chức năng của hệ thống.

3. **Kiến trúc 3-Layer:** Presentation - Business - Data layer với các công nghệ phù hợp.

4. **Graph Schema:** Thiết kế nodes (User, Location, Category...) và relationships (LIKED, REVIEWED, INTERACTED...) cho Neo4j.

5. **RESTful API:** 20+ endpoints được thiết kế theo chuẩn REST.

6. **Giao diện:** Wireframes và bảng màu/typography hiện đại.

7. **Flowchart thuật toán:** Mô tả luồng xử lý Hybrid Recommendation và AI Planner.

Các thiết kế này là nền tảng để triển khai hệ thống ở Chương 3.
