# 🏯 Huế Travel AI - Hệ thống Gợi ý Du lịch Thông minh

![Python](https://img.shields.io/badge/Python-3.9%2B-blue?style=for-the-badge&logo=python)
![Flask](https://img.shields.io/badge/Flask-2.0%2B-green?style=for-the-badge&logo=flask)
![Neo4j](https://img.shields.io/badge/Neo4j-Graph_DB-blueviolet?style=for-the-badge&logo=neo4j)
![GDS](https://img.shields.io/badge/Neo4j-Graph_Data_Science-orange?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Active_Development-brightgreen?style=for-the-badge)

> **Đề tài Khóa luận Tốt nghiệp**
>
> Một nền tảng du lịch thông minh sử dụng **Graph Database (Neo4j)** và **Hybrid Recommendation System** (Hệ khuyến nghị lai) để giúp du khách khám phá vẻ đẹp cố đô Huế.

---

## 🌟 Giới thiệu

**Huế Travel AI** giải quyết bài toán "Đi đâu, chơi gì?" tại Huế bằng cách phân tích dữ liệu địa điểm và hành vi người dùng. Hệ thống kết hợp sức mạnh của **PageRank (đánh giá độ phổ biến)** và **Collaborative Filtering (lọc cộng tác)** trên đồ thị tri thức để đưa ra những gợi ý cá nhân hóa chính xác nhất.

## 🚀 Tính năng Nổi bật (Key Features)

### 👤 Dành cho Người dùng (Travelers)

- **Hệ thống Gợi ý Lai (Hybrid AI):**
  - _Cá nhân hóa:_ Gợi ý dựa trên lịch sử tương tác (Like/Review) của bạn.
  - _Cộng đồng:_ Gợi ý dựa trên những người có sở thích tương đồng (Collaborative Filtering).
  - _Xu hướng:_ Đề xuất các địa điểm đang "hot" nhất hệ thống (PageRank).
- **Lập kế hoạch Thông minh (AI Planner):** Tạo lịch trình 1-5 ngày tự động chỉ với vài cú click, tối ưu theo sở thích cá nhân.
- **Bản đồ Tương tác 4K:** Heatmap mật độ du lịch, Marker Cluster thông minh, xem chi tiết địa điểm trực quan.
- **Quản lý Hồ sơ:** Lưu bộ sưu tập yêu thích, xem lại lịch trình đã tạo.

### 🛠️ Dành cho Quản trị viên (Admin)

- **Dashboard Thống kê:** Tổng quan số liệu hệ thống (User, Location, Interactions).
- **Quản lý Dữ liệu (CRUD):** Thêm/Sửa/Xóa địa điểm trực quan với công cụ Map Picker.
- **AI Control:** Kích hoạt chạy lại thuật toán Neo4j GDS để cập nhật điểm số gợi ý theo thời gian thực.
- **Quản lý Người dùng:** Theo dõi hoạt động và kiểm soát tài khoản.

---

## 🛠️ Công nghệ Sử dụng (Tech Stack)

| Thành phần     | Công nghệ                                                   |
| :------------- | :---------------------------------------------------------- |
| **Backend**    | Python (Flask), Pandas, Blueprint Architecture              |
| **Database**   | **Neo4j** (Graph Database) + Neo4j GDS Library              |
| **Frontend**   | HTML5, CSS3 (Modern UI/Glassmorphism), JavaScript (Vanilla) |
| **Maps**       | Leaflet.js, OpenStreetMap, Leaflet-Heat                     |
| **Algorithms** | PageRank, Community Detection, Cosine Similarity            |

---

## ⚙️ Cài đặt & Triển khai (Installation)

### Yêu cầu tiên quyết

- Python 3.9+
- Neo4j Desktop (hoặc Neo4j AuraDB)
- **Quan trọng:** Cài đặt plugin **Graph Data Science (GDS)** trong Neo4j.

### Các bước cài đặt

**1. Clone dự án**

```bash
git clone https://github.com/chaudan0304/ban-do-du-lich-Hue.git
cd ban-do-du-lich-Hue
```

**2. Cài đặt thư viện**

```bash
pip install -r requirements.txt
```

**3. Cấu hình môi trường**
Tạo file `.env` tại thư mục gốc và điền thông tin kết nối Neo4j:

```env
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASS=your_password
FLASK_SECRET_KEY=your_super_secret_key
```

**4. Khởi tạo dữ liệu**
Chạy các script (đã được tổ chức trong thư mục `scripts/`) để nạp dữ liệu mẫu:

```bash
# Nạp dữ liệu từ Excel (data/data.xlsx) vào Neo4j
python scripts/import_data.py

# (Tùy chọn) Tạo thêm user mẫu ngẫu nhiên
python scripts/generate_users.py

# Chạy thuật toán tính điểm AI ban đầu
python setup_algo.py
```

**5. Chạy ứng dụng**

```bash
python app.py
```

👉 Truy cập: `http://127.0.0.1:5000`

---

## 📂 Cấu trúc Dự án (Project Structure)

Dự án được tổ chức theo mô hình Modular (Flask Blueprints) để dễ dàng mở rộng và bảo trì.

```
ban-do-du-lich-Hue/
├── 📂 data/                 # Chứa dữ liệu nguồn (Excel)
├── 📂 routes/               # Các nhóm chức năng (Controller/View)
│   ├── � auth.py           # Authentication (Login, Register, Profile)
│   ├── � admin.py          # Admin Dashboard & CRUD
│   ├── � api.py            # Core Logic (AI Recommend, Itinerary, Map Data)
│   └── 📄 main.py           # Main View Rendering
├── 📂 scripts/              # Các công cụ/tool chạy một lần
│   ├── 📄 import_data.py    # ETL Dữ liệu vào Database
│   └── 📄 generate_users.py # Tạo dữ liệu giả lập (Mocking data)
├── 📂 static/               # Tài nguyên Frontend
│   ├── 📂 css/              # Stylesheets (đã tách module: style, sidebar, modals...)
│   ├── 📂 js/               # JavaScript Logic (map, planner, profile...)
│   └── 📂 images/           # Assets hình ảnh
├── 📂 templates/            # Giao diện HTML (Jinja2)
├── 📄 app.py                # Entry Point (Khởi chạy Server)
├── 📄 db.py                 # Module kết nối Database Neo4j
├── 📄 models.py             # Định nghĩa Data Models (User)
├── 📄 utils.py              # Các hàm tiện ích dùng chung
├── 📄 setup_algo.py         # Script cấu hình thuật toán GDS
└── 📄 README.md             # Tài liệu dự án
```

---

## 🔐 Tài khoản Demo

Để trải nghiệm đầy đủ tính năng Admin:

- **User:** `admin`
- **Password:** `admin` (Mặc định được tạo khi chạy `import_data.py`)

---

## 👨‍💻 Tác giả

**Châu Đàn** - Sinh viên thực hiện Khóa luận.

- © 2026 Hue Travel AI Project.

---

## 📜 Nhật ký Cập nhật (Changelog)

### v2.0 - Refactoring & Optimization (02/02/2026)

- 🏗️ **Back-end Overhaul:** Tái cấu trúc toàn bộ `app.py` thành mô hình **Blueprints** (`routes/`).
- 🧹 **Code Cleanup:** Tách biệt Scripts và Data ra thư mục riêng, chuẩn hóa cấu trúc dự án.
- 🗺️ **AI Planner:** Nâng cấp thuật toán gợi ý lộ trình dựa trên sở thích thực tế.
- 🔒 **Security:** Cải thiện quy trình đổi mật khẩu 2 lớp và phân quyền Admin chặt chẽ.

### v1.5 - UI Enhancement (30/01/2026)

- 🎨 **New UI:** Giao diện Glassmorphism, Sidebar co giãn, Hệ thống thông báo mới.
- 📱 **Responsive:** Tối ưu hóa hiển thị cho thiết bị di động.

### v1.0 - Core AI (08/01/2026)

- 🧠 Khởi chạy thuật toán PageRank & Collaborative Filtering trên Neo4j.
