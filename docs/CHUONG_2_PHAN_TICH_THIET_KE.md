# CHƯƠNG 2: PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG

Chương này trình bày quá trình phân tích yêu cầu và thiết kế hệ thống Huế Travel AI, bao gồm: phân tích các yêu cầu chức năng và phi chức năng; mô hình hóa hệ thống bằng biểu đồ Use Case; thiết kế kiến trúc phân lớp; thiết kế lược đồ cơ sở dữ liệu đồ thị; thiết kế RESTful API; wireframe giao diện; và flowchart các thuật toán chính.

## 2.1. Phân tích Yêu cầu Hệ thống

### 2.1.1. Yêu cầu Chức năng

Dựa trên phân tích bài toán đặt ra ở phần Mở đầu, hệ thống Huế Travel AI cần đáp ứng hai nhóm yêu cầu chức năng chính: nhóm chức năng dành cho Người dùng (User) và nhóm chức năng dành cho Quản trị viên (Admin).

**a) Nhóm chức năng Người dùng (User):**

*Bảng 2.1. Danh sách yêu cầu chức năng — Nhóm Người dùng*

| STT  | Mã UC | Chức năng             | Mô tả                                                      |
| ---- | ----- | --------------------- | ---------------------------------------------------------- |
| 1    | UC01  | Đăng ký tài khoản     | Tạo tài khoản mới với username, password và email          |
| 2    | UC02  | Đăng nhập             | Xác thực người dùng và tạo phiên làm việc (session)       |
| 3    | UC03  | Đăng xuất             | Kết thúc phiên làm việc hiện tại                           |
| 4    | UC04  | Quên mật khẩu         | Đặt lại mật khẩu qua xác minh email                       |
| 5    | UC05  | Cập nhật hồ sơ        | Sửa thông tin cá nhân (tên, email)                         |
| 6    | UC06  | Xem bản đồ            | Hiển thị bản đồ tương tác với các địa điểm du lịch        |
| 7    | UC07  | Xem chi tiết địa điểm | Xem thông tin, hình ảnh, đánh giá của từng địa điểm       |
| 8    | UC08  | Like địa điểm         | Thêm/bỏ địa điểm vào danh sách yêu thích                 |
| 9    | UC09  | Viết đánh giá         | Chấm điểm (1–5 sao) và viết bình luận cho địa điểm       |
| 10   | UC10  | Xem gợi ý AI          | Xem danh sách địa điểm được hệ thống gợi ý cá nhân hóa   |
| 11   | UC11  | Tạo lộ trình AI       | Tự động lập kế hoạch du lịch theo số ngày và sở thích     |
| 12   | UC12  | Lưu lộ trình          | Lưu lộ trình đã tạo để xem lại sau                        |
| 13   | UC13  | Xem lịch sử           | Xem danh sách địa điểm đã thích, đánh giá và lộ trình đã lưu |

**b) Nhóm chức năng Quản trị viên (Admin):**

*Bảng 2.2. Danh sách yêu cầu chức năng — Nhóm Quản trị viên*

| STT  | Mã UC | Chức năng          | Mô tả                                          |
| ---- | ----- | ------------------ | ---------------------------------------------- |
| 14   | UC14  | Quản lý người dùng | Xem danh sách, xóa tài khoản người dùng       |
| 15   | UC15  | Thêm địa điểm      | Tạo địa điểm mới với đầy đủ thông tin         |
| 16   | UC16  | Sửa địa điểm       | Cập nhật thông tin địa điểm hiện có            |
| 17   | UC17  | Xóa địa điểm       | Loại bỏ địa điểm khỏi hệ thống                |
| 18   | UC18  | Chạy thuật toán AI | Cập nhật lại điểm PageRank và các chỉ số AI   |

### 2.1.2. Yêu cầu Phi chức năng

Ngoài các yêu cầu chức năng, hệ thống cần đảm bảo các yêu cầu phi chức năng được trình bày trong Bảng 2.3.

*Bảng 2.3. Yêu cầu phi chức năng của hệ thống*

| Loại                 | Yêu cầu            | Mô tả chi tiết                                           |
| -------------------- | ------------------ | -------------------------------------------------------- |
| **Hiệu năng**        | Thời gian phản hồi | Mỗi API phản hồi trong vòng < 500ms                     |
| **Hiệu năng**        | Xử lý đồng thời   | Hỗ trợ tối thiểu 100 người dùng truy cập đồng thời     |
| **Bảo mật**          | Mã hóa mật khẩu    | Sử dụng thuật toán băm PBKDF2-SHA256 (Werkzeug)         |
| **Bảo mật**          | Quản lý phiên      | Flask-Login quản lý session, chống truy cập trái phép   |
| **Bảo mật**          | Chống injection    | Sử dụng parameterized queries cho mọi truy vấn Cypher   |
| **Khả dụng**         | Uptime             | Đảm bảo 99% thời gian hoạt động                         |
| **Khả năng mở rộng** | Dữ liệu            | Hỗ trợ mở rộng lên 1.000+ địa điểm                     |
| **Tương thích**      | Trình duyệt        | Tương thích Chrome, Firefox, Edge, Safari                |
| **Giao diện**        | Responsive         | Hiển thị tốt trên cả desktop và thiết bị di động        |

## 2.2. Biểu đồ Use Case

### 2.2.1. Biểu đồ Use Case tổng quan

Hình 2.1 mô tả biểu đồ Use Case tổng quan của hệ thống với 2 tác nhân chính: Người dùng (User) và Quản trị viên (Admin).

*Hình 2.1. Biểu đồ Use Case tổng quan hệ thống Huế Travel AI*

```
                    ┌──────────────────────────────────────────────────────┐
                    │             HUẾ TRAVEL AI SYSTEM                     │
                    │                                                      │
                    │  ┌──────────────┐    ┌──────────────┐               │
         ┌──────┐   │  │  UC01: Đăng  │    │  UC02: Đăng  │               │
         │      │───┼──│  ký tài khoản│    │  nhập        │               │
         │      │   │  └──────────────┘    └──────────────┘               │
         │      │   │                                                      │
         │ User │   │  ┌──────────────┐    ┌──────────────┐               │
         │      │───┼──│  UC06: Xem   │    │  UC08: Like  │               │
         │      │   │  │  bản đồ      │    │  địa điểm    │               │
         │      │   │  └──────────────┘    └──────────────┘               │
         │      │   │                                                      │
         │      │   │  ┌──────────────┐    ┌──────────────┐               │
         │      │───┼──│  UC09: Viết  │    │  UC10: Xem   │               │
         │      │   │  │  đánh giá    │    │  gợi ý AI    │               │
         └──────┘   │  └──────────────┘    └──────────────┘               │
                    │                                                      │
                    │  ┌──────────────┐    ┌──────────────┐               │
         ┌──────┐   │  │  UC11: Tạo   │    │  UC12: Lưu   │               │
         │      │───┼──│  lộ trình AI │    │  lộ trình     │               │
         │      │   │  └──────────────┘    └──────────────┘               │
         │      │   │                                                      │
         │Admin │   │  ┌──────────────┐    ┌──────────────┐               │
         │      │───┼──│  UC14: Quản  │    │  UC15-17:    │               │
         │      │   │  │  lý user     │    │  CRUD địa    │               │
         │      │   │  └──────────────┘    │  điểm        │               │
         │      │   │                      └──────────────┘               │
         │      │   │  ┌──────────────┐                                   │
         │      │───┼──│  UC18: Chạy  │                                   │
         └──────┘   │  │  thuật toán  │                                   │
                    │  └──────────────┘                                   │
                    │                                                      │
                    └──────────────────────────────────────────────────────┘
```

*Ghi chú:* Admin kế thừa toàn bộ chức năng của User, đồng thời có thêm các chức năng quản trị (UC14–UC18).

### 2.2.2. Đặc tả Use Case chính

Dưới đây là đặc tả chi tiết hai Use Case quan trọng nhất của hệ thống.

**a) Use Case UC10 — Xem gợi ý AI:**

*Bảng 2.4. Đặc tả Use Case UC10 — Xem gợi ý AI*

| Thành phần         | Mô tả                                                                                                    |
| ------------------ | -------------------------------------------------------------------------------------------------------- |
| **Tên UC**         | UC10 — Xem gợi ý AI                                                                                     |
| **Tác nhân**       | User (đã đăng nhập)                                                                                      |
| **Mô tả**          | Người dùng xem danh sách các địa điểm du lịch được hệ thống AI gợi ý dựa trên sở thích cá nhân          |
| **Tiền điều kiện** | Người dùng đã đăng nhập thành công                                                                       |
| **Luồng chính**    | 1. User chọn tab "Gợi ý AI" trên sidebar. 2. Hệ thống lấy username từ session. 3. Gọi API `/api/recommend/{username}`. 4. Thuật toán Hybrid tính điểm cho từng địa điểm. 5. Trả về Top 12 địa điểm kèm lý do gợi ý. 6. Hiển thị danh sách cards với thông tin và biểu đồ phân tích. |
| **Luồng phụ**      | Nếu chưa đăng nhập → Hiển thị form nhập username để phân tích thử                                        |
| **Luồng ngoại lệ** | Nếu hệ thống gặp lỗi kết nối Neo4j → Hiển thị thông báo lỗi                                             |
| **Hậu điều kiện**  | Danh sách gợi ý được hiển thị thành công, markers tương ứng được đánh dấu trên bản đồ                     |

**b) Use Case UC11 — Tạo lộ trình AI:**

*Bảng 2.5. Đặc tả Use Case UC11 — Tạo lộ trình AI*

| Thành phần         | Mô tả                                                                                                                   |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| **Tên UC**         | UC11 — Tạo lộ trình AI                                                                                                  |
| **Tác nhân**       | User (đã đăng nhập)                                                                                                      |
| **Mô tả**          | Người dùng tạo lộ trình du lịch tự động dựa trên AI                                                                     |
| **Tiền điều kiện** | Người dùng đã đăng nhập thành công                                                                                       |
| **Luồng chính**    | 1. User chọn "Lập Lộ Trình Thông Minh". 2. Modal hiển thị các tùy chọn. 3. User chọn số ngày (1–5). 4. User chọn sở thích (danh mục). 5. User chọn chế độ (AI gợi ý mới / Từ danh sách đã thích). 6. Nhấn "Tạo lộ trình". 7. Hệ thống chạy thuật toán Nearest Neighbor. 8. Hiển thị lộ trình dạng timeline kèm bản đồ. |
| **Luồng phụ**      | Nếu chọn "Từ đã thích" nhưng chưa like địa điểm nào → Hiển thị thông báo yêu cầu like trước                             |
| **Luồng ngoại lệ** | Nếu số lượng ứng viên không đủ cho số ngày yêu cầu → Giảm số hoạt động mỗi ngày                                         |
| **Hậu điều kiện**  | Lộ trình được hiển thị, người dùng có thể lưu hoặc thay thế địa điểm                                                    |

## 2.3. Thiết kế Kiến trúc Hệ thống

### 2.3.1. Mô hình kiến trúc tổng quan

Hệ thống được thiết kế theo mô hình **kiến trúc 3 tầng (3-Layer Architecture)**, tách biệt rõ ràng giữa giao diện, xử lý nghiệp vụ và truy cập dữ liệu. Mô hình này đảm bảo tính module hóa, dễ bảo trì và mở rộng.

*Hình 2.2. Kiến trúc 3 tầng của hệ thống Huế Travel AI*

```
┌─────────────────────────────────────────────────────────────────┐
│                    TẦNG TRÌNH BÀY (Presentation Layer)          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   HTML5      │  │   CSS3      │  │ JavaScript  │            │
│  │  (Jinja2)   │  │ (Modular)   │  │ (Vanilla)   │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│                         │                                      │
│  ┌─────────────────────┴──────────────────────┐                │
│  │           Leaflet.js (Bản đồ tương tác)    │                │
│  └────────────────────────────────────────────┘                │
└─────────────────────────────────────────────────────────────────┘
                              │ HTTP/JSON
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 TẦNG NGHIỆP VỤ (Business Layer)                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  Flask Application                       │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │   │
│  │  │ auth.py  │ │ api.py   │ │ admin.py │ │ main.py  │   │   │
│  │  │ (Xác     │ │ (API     │ │ (Quản    │ │ (Trang   │   │   │
│  │  │  thực)   │ │  cốt lõi)│ │  trị)    │ │  chủ)    │   │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│  ┌───────────────────────────┴───────────────────────────┐     │
│  │    Thuật toán AI (PageRank, CF, CB, Planner)          │     │
│  └───────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
                              │ Cypher Query
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  TẦNG DỮ LIỆU (Data Layer)                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Neo4j Graph Database                        │   │
│  │                                                          │   │
│  │   (User)──[:LIKED]──→(Location)──[:HAS_CATEGORY]──→(Cat)│   │
│  │      │                   │                               │   │
│  │      └──[:REVIEWED]──────┘                               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────┐                                                │
│  │ Neo4j GDS   │ (PageRank, Node Similarity)                    │
│  └─────────────┘                                                │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3.2. Mô tả chi tiết các tầng

**a) Tầng Trình bày (Presentation Layer):**

Chịu trách nhiệm hiển thị giao diện và tương tác với người dùng. Sử dụng HTML5 kết hợp Jinja2 templating engine để tạo trang động, CSS3 modular (chia thành 10 file theo chức năng) để định dạng giao diện, và JavaScript ES6+ (Vanilla JS) để xử lý tương tác phía client. Thư viện Leaflet.js được tích hợp để hiển thị bản đồ tương tác với markers, popup và heatmap.

**b) Tầng Nghiệp vụ (Business Layer):**

Chịu trách nhiệm xử lý logic nghiệp vụ của hệ thống. Flask framework đóng vai trò trung tâm, tiếp nhận HTTP requests và điều phối đến các Blueprint tương ứng: `auth.py` (xác thực), `api.py` (API cốt lõi), `admin.py` (quản trị), `main.py` (serve trang chủ). Các thuật toán AI (PageRank, Collaborative Filtering, Content-Based Filtering, Nearest Neighbor) được triển khai tại tầng này.

**c) Tầng Dữ liệu (Data Layer):**

Chịu trách nhiệm lưu trữ và truy vấn dữ liệu. Neo4j Graph Database lưu trữ toàn bộ dữ liệu dưới dạng nodes và relationships. Thư viện Neo4j GDS cung cấp các thuật toán phân tích đồ thị (PageRank, Node Similarity). Python neo4j driver kết nối và thực thi truy vấn Cypher từ tầng nghiệp vụ.

### 2.3.3. Luồng dữ liệu tổng quát

*Hình 2.3. Luồng dữ liệu tổng quát trong hệ thống*

```
User Request → Flask Routes → Business Logic → Neo4j Cypher Query →
    → Result Processing → JSON Response → JavaScript → UI Update
```

## 2.4. Thiết kế Cơ sở dữ liệu Đồ thị

### 2.4.1. Lược đồ dữ liệu (Graph Schema)

Lược đồ cơ sở dữ liệu đồ thị của hệ thống được thiết kế với 5 loại node (label) và 7 loại quan hệ (relationship), đảm bảo mô hình hóa đầy đủ các thực thể và mối quan hệ trong bài toán gợi ý du lịch.

**a) Các Node (Đỉnh):**

*Bảng 2.6. Thiết kế các node trong lược đồ đồ thị*

| Label | Mô tả | Thuộc tính chính |
|---|---|---|
| `:User` | Người dùng | `name` (PK), `password`, `email`, `fullname`, `role`, `created_at` |
| `:Location` | Địa điểm du lịch | `name` (PK), `desc`, `lat`, `lng`, `image`, `rating`, `reviewCount`, `pagerankScore`, `pagerankNorm` |
| `:Category` | Danh mục | `name` (PK) |
| `:City` | Thành phố | `name` (PK) |
| `:Itinerary` | Lộ trình đã lưu | `id` (PK), `title`, `data` (JSON), `days`, `created_at` |

**b) Các Relationship (Cạnh):**

*Bảng 2.7. Thiết kế các relationship trong lược đồ đồ thị*

| Quan hệ | Mô tả | Thuộc tính | Hướng |
|---|---|---|---|
| `:LIKED` | User thích Location | `timestamp`, `auto_from_review` | User → Location |
| `:REVIEWED` | User đánh giá Location | `id`, `rating`, `comment`, `sentiment`, `topics`, `timestamp` | User → Location |
| `:INTERACTED` | Tương tác tổng hợp (tạo tự động) | `weight`, `liked_score`, `review_score`, `created_at` | User → Location |
| `:HAS_CATEGORY` | Phân loại địa điểm | — | Location → Category |
| `:LOCATED_IN` | Vị trí địa lý | — | Location → City |
| `:RELATED_TO` | Liên kết giữa các địa điểm | `weight` | Location ↔ Location |
| `:CREATED` | User tạo lộ trình | — | User → Itinerary |

**c) Sơ đồ quan hệ tổng thể:**

*Hình 2.4. Sơ đồ quan hệ tổng thể của lược đồ đồ thị*

```
┌─────────────────┐          ┌─────────────────┐
│      USER       │          │    LOCATION     │
├─────────────────┤          ├─────────────────┤
│ name (PK)       │──LIKED──→│ name (PK)       │
│ password        │          │ desc            │
│ email           │─REVIEWED→│ lat, lng        │
│ fullname        │          │ image           │
│ role            │─INTERACT→│ rating          │
│ created_at      │          │ pagerankScore   │
└────────┬────────┘          └───┬────────┬────┘
         │                      │        │
         │ CREATED          HAS_│   LOCATED
         ▼                 CATEG│        │_IN
┌─────────────────┐          │        ▼
│   ITINERARY     │          ▼   ┌─────────┐
├─────────────────┤   ┌─────────┐│  CITY   │
│ id (PK)         │   │CATEGORY ││─────────│
│ title           │   │─────────││ name(PK)│
│ data (JSON)     │   │ name(PK)│└─────────┘
│ days            │   └─────────┘
│ created_at      │
└─────────────────┘
```

### 2.4.2. Ràng buộc và Chỉ mục (Constraints & Indexes)

Để đảm bảo tính toàn vẹn dữ liệu và hiệu suất truy vấn, hệ thống thiết kế các ràng buộc duy nhất (Unique Constraints) và chỉ mục (Indexes) sau:

*Bảng 2.8. Ràng buộc và chỉ mục cơ sở dữ liệu*

| Loại | Đối tượng | Thuộc tính | Mục đích |
|---|---|---|---|
| Unique Constraint | `:User` | `name` | Đảm bảo username không trùng lặp |
| Unique Constraint | `:Location` | `name` | Đảm bảo tên địa điểm duy nhất |
| Unique Constraint | `:Category` | `name` | Đảm bảo tên danh mục duy nhất |
| Index | `:User` | `email` | Tăng tốc truy vấn theo email |
| Index | `:Location` | `pagerankScore` | Tăng tốc sắp xếp theo độ phổ biến |

## 2.5. Thiết kế API

### 2.5.1. Nguyên tắc thiết kế RESTful API

Hệ thống API được thiết kế theo kiến trúc REST (Representational State Transfer), tuân thủ các nguyên tắc:

- Sử dụng **HTTP methods** phù hợp: GET (đọc), POST (tạo mới), PUT (cập nhật), DELETE (xóa).
- URL được thiết kế theo dạng **tài nguyên** (resource-based): `/api/locations`, `/api/reviews/{location}`.
- Dữ liệu trả về theo định dạng **JSON** thống nhất.
- Mỗi response bao gồm trường `success` (boolean) để phân biệt thành công/thất bại.

### 2.5.2. Danh sách API Endpoints

Hệ thống triển khai tổng cộng **32 endpoints**, chia thành 5 nhóm chức năng. Dưới đây trình bày các endpoints chính.

**a) API Xác thực (Authentication — 8 endpoints):**

*Bảng 2.9. API Xác thực*

| Method | Endpoint              | Request Body                      | Response                   |
| ------ | --------------------- | --------------------------------- | -------------------------- |
| POST   | /api/login            | `{username, password}`            | `{success, message, role}` |
| POST   | /api/register         | `{username, password, email}`     | `{success, message}`       |
| POST   | /api/logout           | —                                 | `{success}`                |
| POST   | /api/verify-account   | `{username, email}`               | `{success, message}`       |
| POST   | /api/reset-password   | `{username, email, new_password}` | `{success, message}`       |
| GET    | /api/current_user     | —                                 | `{logged_in, username}`    |
| GET,POST | /api/profile        | `{fullname, email}`               | `{success, data}`          |

**b) API Địa điểm và Tương tác (8 endpoints):**

*Bảng 2.10. API Địa điểm và Tương tác*

| Method | Endpoint                       | Request Body                  | Response                        |
| ------ | ------------------------------ | ----------------------------- | ------------------------------- |
| GET    | /api/locations                 | `?category=`                  | `[{name, lat, lng, ...}]`       |
| GET    | /api/history/{user}            | —                             | `[{name, image, lat, lng}]`     |
| GET    | /api/reviews/{location}        | —                             | `[{username, rating, comment}]` |
| POST   | /api/like                      | `{location_name}`             | `{liked, message}`              |
| POST   | /api/review                    | `{location, rating, comment}` | `{success, stats, sentiment}`   |
| DELETE | /api/review                    | `{location, review_id}`       | `{success}`                     |
| GET    | /api/similar/{location}        | —                             | `[{name, similarity, ...}]`     |
| GET    | /api/similar-users/{username}  | —                             | `[{username, similarity}]`      |

**c) API Trí tuệ Nhân tạo (7 endpoints):**

*Bảng 2.11. API Trí tuệ Nhân tạo*

| Method | Endpoint                         | Request Body                     | Response                      |
| ------ | -------------------------------- | -------------------------------- | ----------------------------- |
| GET    | /api/recommend/{username}        | —                                | `[{name, score, reason, ...}]`|
| POST   | /api/planner/generate            | `{days, preferences, use_liked}` | `[{day, activities}]`         |
| POST   | /api/planner/suggest-replacement | `{current, exclude_list}`        | `{replacement}`               |
| GET    | /api/itineraries                 | —                                | `[{id, title, data}]`         |
| POST   | /api/itineraries                 | `{title, data, days}`            | `{success, id}`               |
| DELETE | /api/itineraries/{id}            | —                                | `{success}`                   |
| GET    | /api/user/activity               | —                                | `{likes, reviews}`            |

**d) API Quản trị (9 endpoints):**

*Bảng 2.12. API Quản trị*

| Method | Endpoint                          | Request Body                  | Response                      |
| ------ | --------------------------------- | ----------------------------- | ----------------------------- |
| GET    | /api/admin/users                  | —                             | `[{name, role, liked_count}]` |
| DELETE | /api/admin/users/{username}       | —                             | `{success}`                   |
| GET    | /api/admin/user_comments/{user}   | —                             | `[{location, comment, ...}]`  |
| GET    | /api/admin/user_profile/{user}    | —                             | `{name, email, stats}`        |
| GET    | /api/admin/stats                  | —                             | `{users, locations, reviews}` |
| POST   | /api/admin/run-algo               | —                             | `{success, message}`          |
| POST   | /api/admin/location/add           | `{name, desc, lat, lng, ...}` | `{success}`                   |
| PUT    | /api/admin/location/update        | `{name, desc, lat, lng, ...}` | `{success}`                   |
| DELETE | /api/admin/location/delete/{name} | —                             | `{success}`                   |

### 2.5.3. Định dạng Response

Tất cả API trả về response theo định dạng JSON thống nhất:

**Trường hợp thành công:**

```json
{
    "success": true,
    "data": [...],
    "message": "Thành công"
}
```

**Trường hợp lỗi:**

```json
{
    "success": false,
    "error": "Mô tả lỗi chi tiết",
    "code": 400
}
```

## 2.6. Thiết kế Giao diện

### 2.6.1. Wireframe Trang chủ

Giao diện trang chủ được thiết kế theo bố cục 2 cột: sidebar bên trái chứa các chức năng tương tác, bản đồ chiếm phần lớn diện tích bên phải.

*Hình 2.5. Wireframe trang chủ*

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

Modal lập lộ trình thông minh cho phép người dùng tùy chỉnh các thông số đầu vào trước khi hệ thống tạo lộ trình.

*Hình 2.6. Wireframe modal AI Planner*

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

### 2.6.3. Bảng màu và Typography

Giao diện sử dụng thiết kế Dark Mode hiện đại với bảng màu và kiểu chữ được quy hoạch thống nhất.

*Bảng 2.13. Bảng màu chính của hệ thống*

| Vai trò         | Mã màu (Hex)           | Mô tả sử dụng                   |
| --------------- | ---------------------- | -------------------------------- |
| Primary         | #6366f1                | Nút bấm, liên kết, điểm nhấn    |
| Secondary       | #8b5cf6                | Accent, hiệu ứng hover          |
| Background      | #0f172a                | Nền chính (Dark Mode)            |
| Surface         | rgba(255,255,255,0.05) | Nền card, modal                  |
| Text Primary    | #f1f5f9                | Chữ chính                        |
| Text Secondary  | #94a3b8                | Chữ phụ, mô tả                  |
| Success         | #22c55e                | Trạng thái thành công            |
| Error           | #ef4444                | Trạng thái lỗi                   |
| Warning         | #f59e0b                | Cảnh báo                         |

*Bảng 2.14. Quy chuẩn Typography*

| Phần tử  | Font  | Kích thước | Độ đậm |
| -------- | ----- | ---------- | ------ |
| Heading 1| Inter | 28px       | 700    |
| Heading 2| Inter | 22px       | 600    |
| Heading 3| Inter | 18px       | 600    |
| Body     | Inter | 14px       | 400    |
| Small    | Inter | 12px       | 400    |
| Button   | Inter | 14px       | 600    |

## 2.7. Thiết kế Thuật toán

### 2.7.1. Flowchart thuật toán Hybrid Recommendation

Hình 2.7 mô tả luồng xử lý tổng quát của thuật toán Hybrid Recommendation — thuật toán chính của hệ thống gợi ý.

*Hình 2.7. Flowchart thuật toán Hybrid Recommendation*

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
           │ weight ×3      │ weight ×1      │ weight ×10
           │                │                │
           └────────────────┼────────────────┘
                            │
                            ▼
                  ┌───────────────────┐
                  │ Bước 3: GỘP TẤT  │
                  │ CẢ ứng viên      │
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
                    │  giảm dần       │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │   Trả về        │
                    │   Top 12        │
                    │ kèm lý do       │
                    └────────┬────────┘
                             │
                             ▼
                       ┌──────────┐
                       │   END    │
                       └──────────┘
```

### 2.7.2. Flowchart thuật toán AI Planner

Hình 2.8 mô tả luồng xử lý của thuật toán AI Planner — tự động lập lộ trình du lịch theo ngày.

*Hình 2.8. Flowchart thuật toán AI Planner*

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
│ Nearest  │       │ Nearest  │    │ Nearest  │
│ Neighbor │       │ Neighbor │    │ Neighbor │
│ (sight)  │       │ (food)   │    │ (sight)  │
└────┬─────┘       └────┬─────┘    └────┬─────┘
     │                  │               │
     └──────────────────┴───────────────┘
                        │
                        ▼
              ┌────────────────────────┐
              │  TỐI: Nearest Neighbor │
              │  (food/dạo phố)        │
              └───────────┬────────────┘
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

## 2.8. Tiểu kết chương 2

Chương này đã trình bày đầy đủ quá trình phân tích và thiết kế hệ thống Huế Travel AI, bao gồm:

1. **Phân tích yêu cầu:** Xác định 18 yêu cầu chức năng chia thành 2 nhóm (User: 13, Admin: 5) cùng 9 yêu cầu phi chức năng về hiệu năng, bảo mật, khả dụng và tương thích.

2. **Biểu đồ Use Case:** Mô hình hóa hệ thống với 2 tác nhân (User, Admin), đặc tả chi tiết 2 Use Case quan trọng nhất (UC10, UC11).

3. **Kiến trúc 3 tầng:** Thiết kế phân tách rõ ràng giữa Presentation (HTML/CSS/JS), Business (Flask/AI) và Data (Neo4j/GDS).

4. **Lược đồ đồ thị:** Thiết kế 5 loại node và 7 loại relationship cơ bản cho Neo4j (bổ sung thêm 2 relationship do thuật toán tạo ra: SIMILAR_TO, LOC_SIMILAR), kèm ràng buộc và chỉ mục.

5. **RESTful API:** Thiết kế 32 endpoints theo chuẩn REST, phân nhóm 5 nhóm chức năng (Xác thực, Địa điểm, AI, Lộ trình, Quản trị) với định dạng response thống nhất.

6. **Giao diện:** Wireframe trang chủ và modal AI Planner, bảng màu Dark Mode và Typography thống nhất với font Inter.

7. **Flowchart thuật toán:** Mô tả luồng xử lý Hybrid Recommendation (4 bước) và AI Planner (Nearest Neighbor + Interleaving).

Các thiết kế trên tạo nền tảng vững chắc cho việc triển khai hệ thống ở Chương 3.
