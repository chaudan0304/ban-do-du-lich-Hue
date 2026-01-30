# 🏯 Huế Travel AI - Hệ thống Gợi ý Du lịch Thông minh

> **Đề tài Khóa luận Tốt nghiệp**
>
> Một nền tảng du lịch thông minh sử dụng **Graph Database (Neo4j)** và **Hybrid Recommendation System** (Hệ khuyến nghị lai) để giúp du khách khám phá vẻ đẹp cố đô Huế.

---

## 🌟 Giới thiệu

**Huế Travel AI** giải quyết bài toán "Đi đâu, chơi gì?" tại Huế bằng cách phân tích dữ liệu địa điểm và hành vi người dùng. Hệ thống kết hợp sức mạnh của **PageRank (đánh giá độ phổ biến)** và **Collaborative Filtering (lọc cộng tác)** trên đồ thị tri thức để đưa ra những gợi ý cá nhân hóa chính xác nhất.

## 🚀 Danh sách chức năng (Full Features)

Dự án hiện tại đã hoàn thiện các nhóm chức năng chính phục vụ cả người dùng cuối và quản trị viên:

### 👤 1. Chức năng dành cho Người dùng

- **Đăng ký/Đăng nhập:** Hệ thống xác thực người dùng, bảo mật mật khẩu.
- **Quản lý Hồ sơ (Profile):**
  - Xem thông tin cá nhân (Họ tên, Email, Ngày tham gia).
  - Cập nhật thông tin cá nhân và mật khẩu.
  - **Bộ sưu tập yêu thích:** Xem lại danh sách các địa điểm đã "thả tim" với giao diện gallery ảnh sinh động.
- **Tương tác Địa điểm:**
  - **Yêu thích (Like):** Lưu lại các địa điểm quan tâm.
  - **Đánh giá (Review):** Gửi bình luận và xếp hạng sao (1-5⭐).
  - **Quản lý Đánh giá:** Người dùng có thể chỉnh sửa hoặc xóa đánh giá cũ của mình.
- **Tìm kiếm & Lọc:**
  - Tìm kiếm địa điểm theo tên với gợi ý thời gian thực.
  - Lọc nhanh địa điểm theo danh mục (Di tích, Ẩm thực, Tâm linh, v.v.).

### 🧠 2. Hệ thống Gợi ý Thông minh (AI Core)

- **Hybrid Recommendation:** Tự động tính toán và hiển thị các gợi ý "Dành riêng cho bạn" dựa trên:
  - **Personalization:** Dựa trên hành vi Like/Review của chính người dùng.
  - **Collaborative Filtering:** Gợi ý dựa trên sở thích của những người dùng có hành vi tương đồng.
  - **PageRank Score:** Độ ưu tiên hiển thị dựa trên độ phổ biến toàn hệ thống.
- **Khám phá thêm (Similar Locations):** Khi xem một địa điểm, hệ thống tự động đề xuất 5-10 địa điểm tương tự trong cùng khu vực hoặc danh mục.
- **Giải thích Gợi ý:** Hiển thị lý do tại sao AI lại gợi ý địa điểm này cho bạn (ví dụ: "Vì bạn đã thích ...", hoặc "Được cộng đồng đánh giá cao").

### 🗺️ 3. Bản đồ & Trực quan hóa tương tác

- **Bản đồ 4K:** Trải nghiệm mượt mà với hàng trăm địa điểm.
- **Bản đồ nhiệt (Heatmap):** Chế độ xem mật độ "hot" của các địa điểm du lịch.
- **Marker Thông minh:**
  - Phân biệt loại địa điểm qua biểu tượng (Icon) khác nhau.
  - Phân biệt trạng thái gợi ý qua màu sắc (Đỏ: Top phổ biến, Xanh: Gợi ý riêng biệt).
- **Marker Cluster:** Tự động gom nhóm marker khi zoom out để tối ưu hiệu suất và thẩm mỹ.

### 🛠️ 4. Chức năng dành cho Quản trị viên (Admin)

- **Dashboard Thống kê:** Theo dõi tổng số người dùng, địa điểm, tổng lượt tương tác.
- **Quản lý Địa điểm (CRUD):**
  - Thêm địa điểm mới kèm công cụ **Map Picker** (lấy tọa độ bằng cách click trực tiếp lên bản đồ).
  - Chỉnh sửa thông tin, hình ảnh, tọa độ.
  - Xóa địa điểm khỏi hệ thống.
- **Quản lý Người dùng:**
  - Xem danh sách toàn bộ thành viên.
  - Xem chi tiết hoạt động của từng user (hồ sơ, các nơi đã thích, các đánh giá đã gửi).
  - Xóa tài khoản người dùng vi phạm.
- **Quản trị AI:** Nút kích hoạt chạy lại thuật toán Neo4j GDS để cập nhật điểm số AI ngay lập tức khi có dữ liệu mới.

### 🎨 5. Tiện ích UI/UX Cao cấp

- **Sidebar Resizable:** Thanh bên có thể co giãn linh hoạt, tối ưu cho mọi kích thước màn hình.
- **Custom Notifications:** Hệ thống thông báo tùy chỉnh (Success, Error, Confirm) thay thế cho alert/confirm mặc định, mang lại cảm giác ứng dụng chuyên nghiệp.
- **Premium Design:** Sử dụng hiệu ứng Glassmorphism, Gradient, và các micro-animations tinh tế.

---

## 🛠️ Công nghệ sử dụng

| Thành phần       | Công nghệ                                     |
| :--------------- | :-------------------------------------------- |
| **Backend**      | Python (Flask), Pandas                        |
| **Database**     | **Neo4j** (Graph Database), Neo4j GDS Library |
| **Frontend**     | HTML5, CSS3 (Modern UI), JavaScript (Vanilla) |
| **Maps**         | Leaflet.js, OpenStreetMap, Leaflet-Heat       |
| **AI/Algorithm** | PageRank, Community Detection (trên Neo4j)    |

---

## ⚙️ Cài đặt và Chạy dự án

### Yêu cầu tiên quyết

- Python 3.9+
- Neo4j Desktop (hoặc Neo4j AuraDB)
- Cài đặt thư viện **Graph Data Science (GDS)** plugin trong Neo4j.

### Các bước cài đặt

1.  **Clone repository**

    ```bash
    git clone https://github.com/chaudan0304/ban-do-du-lich-Hue.git
    cd ban-do-du-lich-Hue
    ```

2.  **Cài đặt dependencies**

    ```bash
    pip install -r requirements.txt
    ```

3.  **Cấu hình môi trường (.env)**
    Tạo file `.env` tại thư mục gốc với nội dung:

    ```env
    NEO4J_URI=bolt://localhost:7687
    NEO4J_USER=neo4j
    NEO4J_PASS=your_password
    FLASK_SECRET_KEY=your_secret_key
    ```

4.  **Khởi tạo dữ liệu**
    Chạy các script sau để nạp dữ liệu và tính toán AI ban đầu:

    ```bash
    # 1. Nạp dữ liệu từ Excel vào Neo4j
    python import_data.py

    # 2. Chạy thuật toán tính điểm PageRank & Similarity
    python setup_algo.py
    ```

5.  **Chạy ứng dụng**
    ```bash
    python app.py
    ```
    Truy cập tại: `http://127.0.0.1:5000`

---

## 📂 Cấu trúc dự án

```
📂 ban-do-du-lich-Hue
├── 📂 static/           # Tài nguyên tĩnh (CSS, JS, Images)
│   ├── 📂 css/          # Style.css (Giao diện chính), Map.css
│   ├── 📂 js/           # Main.js (Logic Frontend & Map)
│   └── 📂 images/       # Ảnh địa điểm
├── 📂 templates/        # HTML Templates (Jinja2)
│   └── index.html       # Trang chủ SPA (Single Page App)
├── app.py               # Backend Flask Server & API
├── db.py                # Module kết nối Neo4j, xử lý User/Review
├── import_data.py       # Script nạp dữ liệu (ETL)
├── setup_algo.py        # Script chạy thuật toán GDS
├── data.xlsx            # Dữ liệu nguồn (Địa điểm, User mẫu)
└── requirements.txt     # Danh sách thư viện Python
```

---

## 🔐 Tài khoản Demo

Để trải nghiệm tính năng Admin (Quản lý dữ liệu, Chạy AI):

- **User:** `admin`
- **Password:** `admin` (hoặc mật khẩu bạn đã thiết lập trong `import_data.py`)

---

## 👨‍💻 Tác giả

**Châu Đàn** - Sinh viên thực hiện Khóa luận.

- © 2026 Hue Travel AI Project.

---

## 📜 Nhật ký Cập nhật (Update Log)

### 🚀 Phiên bản hiện tại - 30/01/2026 (Nhánh: `feature/complete-ui-and-docs`)

#### 🎨 Giao diện & Trải nghiệm người dùng (UI/UX)

- **Hệ thống Thông báo mới:** Thay thế toàn bộ `alert()` và `confirm()` bằng `showNotification` tùy chỉnh, hỗ trợ Success, Error, Confirm với UI hiện đại.
- **Sidebar Linh hoạt:** Nâng cấp thanh Sidebar Resizable với `min-width: 420px`.
- **Tinh chỉnh Form Admin:** Thêm icon đa sắc màu và căn chỉnh vị trí icon trong Input cân đối hơn.
- **Tối ưu hiển thị:** Hiển thị tên địa điểm đầy đủ trong phần Khám phá, giảm bớt khoảng trắng dư thừa.

#### 👤 Quản lý Người dùng & Backend

- **Hồ sơ chi tiết:** Hiển thị Họ tên, Email và gallery "Địa điểm đã thích" dạng scroll ngang.
- **API Enhancement:** Nâng cấp API trả về đầy đủ thông tin tọa độ và danh sách yêu thích của người dùng.

---

### 🕰️ Lịch sử phát triển các phiên bản (Legacy Branches)

#### 🔸 Nhánh `pb1` (Tiền thân là nhánh `test`)

- **Thời gian:** 21/12/2025 -> 08/01/2026
- **Chức năng chính:**
  - Thiết lập cấu trúc đồ thị Neo4j.
  - Triển khai thuật toán **PageRank** & **Collaborative Filtering** cơ bản.
- **Trạng thái:** Bản thử nghiệm nền tảng về AI.

#### 🔹 Nhánh `pb2` (Tiền thân là nhánh `pb1_reset`)

- **Thời gian:** 21/12/2025 -> 28/01/2026
- **Chức năng chính:**
  - Tích hợp **Bản đồ nhiệt (Heatmap)**.
  - Bổ sung tính năng **Similar Locations**.
  - Sửa lỗi tọa độ, rating và chuẩn hóa dữ liệu.
- **Trạng thái:** Bản ổn định cuối cùng trước khi đại tu giao diện.
