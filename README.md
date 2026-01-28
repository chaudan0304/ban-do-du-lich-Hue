# 🏯 Huế Travel AI - Hệ thống Gợi ý Du lịch Thông minh

> **Đề tài Khóa luận Tốt nghiệp**
> 
> Một nền tảng du lịch thông minh sử dụng **Graph Database (Neo4j)** và **Hybrid Recommendation System** (Hệ khuyến nghị lai) để giúp du khách khám phá vẻ đẹp cố đô Huế.

---

## 🌟 Giới thiệu

**Huế Travel AI** giải quyết bài toán "Đi đâu, chơi gì?" tại Huế bằng cách phân tích dữ liệu địa điểm và hành vi người dùng. Hệ thống kết hợp sức mạnh của **PageRank (đánh giá độ phổ biến)** và **Collaborative Filtering (lọc cộng tác)** trên đồ thị tri thức để đưa ra những gợi ý cá nhân hóa chính xác nhất.

## 🚀 Tính năng nổi bật

### 🧠 1. Hệ thống Gợi ý Thông minh (AI Core)
*   **Hybrid Recommendation:** Kết hợp đa chiều dữ liệu để gợi ý:
    *   **PageRank Popularity:** Đánh giá độ nổi tiếng dựa trên lượng tương tác người dùng.
    *   **Graph Connectivity:** Đánh giá tầm quan trọng trong mạng lưới kết nối địa điểm.
    *   **Content-Based:** Gợi ý các địa điểm tương tự cùng danh mục.
*   **Similar Locations:** Tự động đề xuất các địa điểm liên quan khi xem chi tiết một địa điểm.

### 🗺️ 2. Bản đồ & Trực quan hóa (Visualization)
*   **Interactive Map:** Tích hợp **Leaflet.js** cho trải nghiệm bản đồ mượt mà.
*   **Heatmap (Bản đồ nhiệt):** Hiển thị trực quan các khu vực tập trung nhiều địa điểm nổi bật/được yêu thích.
*   **Dynamic Markers:** Icon thay đổi theo loại địa điểm (Di tích 🏛️, Ẩm thực 🍜...) và màu sắc thay đổi theo độ hot (Đỏ: Hot, Xanh: Cá nhân hóa).
*   **Map Clustering:** Gom nhóm các địa điểm khi zoom out để tránh rối mắt.

### ⭐ 3. Tương tác Người dùng (Social Features)
*   **Reviews & Ratings:**
    *   Đánh giá sao (1-5 ⭐) và viết bình luận cho địa điểm.
    *   **CRUD Review:** Người dùng có thể Thêm, Sửa, Xóa bình luận của chính mình.
    *   Hiển thị điểm đánh giá trung bình thời gian thực.
*   **User Profiles:** Theo dõi lịch sử du lịch và các địa điểm yêu thích (Wishlist).

### 🛠️ 4. Quản trị & Dashboard
*   **Admin Dashboard:** Thống kê tổng quan (Users, Locations, Likes).
*   **CRUD Locations:** Thêm, sửa, xóa địa điểm trực tiếp với giao diện trực quan.
*   **Map Picker:** Click chọn tọa độ trực tiếp trên bản đồ khi thêm/sửa địa điểm.
*   **Data Consistency:** Hệ thống tự động chuẩn hóa dữ liệu và tính toán lại điểm số AI sau mỗi lần cập nhật.

---

## 🛠️ Công nghệ sử dụng

| Thành phần | Công nghệ |
| :--- | :--- |
| **Backend** | Python (Flask), Pandas |
| **Database** | **Neo4j** (Graph Database), Neo4j GDS Library |
| **Frontend** | HTML5, CSS3 (Modern UI), JavaScript (Vanilla) |
| **Maps** | Leaflet.js, OpenStreetMap, Leaflet-Heat |
| **AI/Algorithm** | PageRank, Community Detection (trên Neo4j) |

---

## ⚙️ Cài đặt và Chạy dự án

### Yêu cầu tiên quyết
*   Python 3.9+
*   Neo4j Desktop (hoặc Neo4j AuraDB)
*   Cài đặt thư viện **Graph Data Science (GDS)** plugin trong Neo4j.

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
*   **User:** `admin`
*   **Password:** `admin` (hoặc mật khẩu bạn đã thiết lập trong `import_data.py`)

---

## 👨‍💻 Tác giả

**Châu Đàn** - Sinh viên thực hiện Khóa luận.
*   © 2026 Hue Travel AI Project.
