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

## 🚀 Chi tiết Chức năng (Feature Breakdown)

### 🧠 1. Hệ thống Gợi ý Lai (Hybrid Recommendation Engine)

Trái tim của ứng dụng là thuật toán AI kết hợp 3 phương pháp tiên tiến để đưa ra những gợi ý "đúng ý" người dùng nhất:

- **Collaborative Filtering (Lọc cộng tác):** Phân tích đồ thị quan hệ `(:User)-[:INTERACTED]->(:Location)` để tìm những người dùng có "gu" du lịch giống bạn và gợi ý những địa điểm họ thích mà bạn chưa khám phá.
- **Content-Based Filtering (Lọc theo nội dung):** Nếu bạn thường xuyên check-in tại các "Chùa chiền" hay "Di tích", hệ thống sẽ ưu tiên đề xuất các địa điểm tương tự cùng danh mục.
- **Weighted PageRank (Độ phổ biến):** Đánh giá độ "hot" của địa điểm dựa trên tổng số lượng tương tác, chất lượng đánh giá (sao) và mức độ uy tín của người review.

### 📅 2. Lập kế hoạch Du lịch Thông minh (AI Planner)

Giải quyết nỗi lo "không biết đi đâu" chỉ trong 3 giây:

- **Tùy chỉnh linh hoạt:** Chọn số ngày đi (1-5 ngày) và sở thích ưu tiên (Văn hóa, Ẩm thực, Thiên nhiên...).
- **Tối ưu hóa:** Thuật toán tự động sắp xếp các địa điểm gần nhau vào cùng một buổi để tối ưu thời gian di chuyển.
- **Chế độ "Dựa trên sở thích" (Use Liked):** Ưu tiên đưa các địa điểm bạn đã "Thả tim" vào lịch trình, kết hợp với các gợi ý phù hợp nhất từ AI.
- **Lưu trữ:** Dễ dàng lưu lại và quản lý các lịch trình đã tạo trong hồ sơ cá nhân.

### 🗺️ 3. Bản đồ Tương tác Nâng cao (Interactive Map)

Không chỉ là bản đồ tĩnh, Hue Travel AI mang đến trải nghiệm khám phá sống động:

- **Heatmap (Bản đồ nhiệt):** Trực quan hóa những khu vực tập trung đông khách du lịch nhất tại Huế.
- **Marker Clustering:** Tự động gom nhóm các địa điểm khi thu nhỏ bản đồ, giúp giao diện không bị rối mắt.
- **Routing (Chỉ đường):** Tích hợp điều hướng trực tiếp đến địa điểm thông qua Google Maps/Apple Maps.
- **Smart Markers:** Phân loại địa điểm bằng bộ icon đa dạng (🍜 cho Ẩm thực, 🏯 cho Di tích, 🌳 cho Thiên nhiên).

### 👤 4. Hồ sơ & Tương tác Người dùng

- **Bộ sưu tập cá nhân:** Lưu lại danh sách "Bucket list" những nơi muốn đi.
- **Đánh giá & Bình luận:** Đánh giá 5 sao và viết review chi tiết. Phần review hỗ trợ phân tích cảm xúc (Sentiment Analysis) cơ bản.
- **Bảo mật 2 lớp:** Quy trình đổi mật khẩu an toàn yêu cầu xác thực email và username.

### 🛠️ 5. Quản trị Hệ thống (Admin Dashboard)

Dành cho người quản lý để vận hành hệ thống:

- **Quản lý Dữ liệu (CRUD):** Thêm mới/Chỉnh sửa địa điểm trực quan với công cụ chọn tọa độ trên bản đồ (Map Picker).
- **Real-time AI Update:** Kích hoạt tính toán lại điểm số PageRank và Gợi ý ngay lập tức khi có dữ liệu mới nạp vào.
- **Thống kê:** Theo dõi sức khỏe hệ thống qua các chỉ số tăng trưởng User và Review.

---

## 🛠️ Công nghệ Sử dụng (Tech Stack)

| Thành phần     | Công nghệ                                                   |
| :------------- | :---------------------------------------------------------- |
| **Backend**    | Python (Flask), Pandas, Blueprint Architecture              |
| **Database**   | **Neo4j** (Graph Database) + Neo4j GDS Library              |
| **Frontend**   | HTML5, CSS3 (Modern UI/Glassmorphism), JavaScript (Vanilla) |
| **Maps**       | Leaflet.js, OpenStreetMap, Leaflet-Heat                     |
| **Algorithms** | PageRank, Collaborative Filtering, Content-Based Filtering  |
| **Testing**    | Python Unit Tests (Custom Test Suite)                       |

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
│   ├── 📄 auth.py           # Authentication (Login, Register, Profile)
│   ├── 📄 admin.py          # Admin Dashboard & CRUD
│   ├── 📄 api.py            # Core Logic (AI Recommend, Itinerary, Map Data)
│   └── 📄 main.py           # Main View Rendering
├── 📂 scripts/              # Các công cụ/tool chạy một lần
│   ├── 📄 import_data.py    # ETL Dữ liệu vào Database
│   └── 📄 generate_users.py # Tạo dữ liệu giả lập (Mocking data)
├── 📂 static/               # Tài nguyên Frontend
│   ├── 📂 css/              # Stylesheets (7 modules: style, sidebar, modals...)
│   ├── 📂 js/               # JavaScript Logic (map, planner, profile...)
│   └── 📂 images/           # Assets hình ảnh
├── 📂 templates/            # Giao diện HTML (Jinja2)
├── 📂 tests/                # Unit Tests
│   ├── 📄 test_auth.py      # Tests cho Authentication
│   ├── 📄 test_recommend.py # Tests cho Recommendation API
│   ├── 📄 test_planner.py   # Tests cho AI Planner
│   └── 📄 run_all_tests.py  # Script chạy tất cả tests
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

## 🧪 Chạy Tests

Dự án bao gồm bộ Unit Tests để kiểm tra các chức năng chính:

```bash
# Chạy từng test riêng lẻ
python tests/test_auth.py       # Test Authentication
python tests/test_recommend.py  # Test Recommendation API
python tests/test_planner.py    # Test AI Planner

# Hoặc chạy tất cả tests
python tests/run_all_tests.py
```

**Các test bao gồm:**

- ✅ User Registration & Login
- ✅ Profile Update
- ✅ PageRank Scores Existence
- ✅ Cold Start Recommendation
- ✅ Liked Locations Exclusion
- ✅ AI Itinerary Generation

---

## 👨‍💻 Tác giả

**Châu Đàn** - Sinh viên thực hiện Khóa luận.

- © 2026 Hue Travel AI Project.

---

## 📜 Nhật ký Cập nhật (Changelog)

### v2.1 - Algorithm Fix & Code Quality (04/02/2026)

- 🧠 **Recommendation Fix:** Sửa lỗi công thức tính điểm Hybrid - bổ sung `pagerankConnectNorm` (Connection Rank) vào gợi ý AI.
- 🔧 **Bug Fix:** Sửa `ORDER BY` trong Fallback Query để sắp xếp đúng theo `final_score`.
- 🏗️ **CSS Refactoring:** Tách `style.css` thành 7 file module riêng biệt (`sidebar.css`, `modals.css`, `planner.css`, `map.css`, `reviews.css`, `sidebar-tabs.css`).
- 🧹 **Code Cleanup:** Xóa các file debug, chuẩn hóa `requirements.txt` với version constraints.
- 🧪 **Testing:** Bổ sung Unit Tests cho Authentication và Recommendation API.

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
