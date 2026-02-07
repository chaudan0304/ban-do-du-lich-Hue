# CHƯƠNG 3: TRIỂN KHAI VÀ CÀI ĐẶT HỆ THỐNG

## 3.1. Môi trường Phát triển

### 3.1.1. Công cụ và Phần mềm

Hệ thống được phát triển trên môi trường sau:

| Thành phần         | Phiên bản  | Mô tả                       |
| ------------------ | ---------- | --------------------------- |
| Hệ điều hành       | Windows 11 | Môi trường phát triển chính |
| Python             | 3.11+      | Ngôn ngữ lập trình backend  |
| Neo4j Desktop      | 5.11.2     | Cơ sở dữ liệu đồ thị        |
| Neo4j GDS          | 2.24.0     | Thư viện Graph Data Science |
| Visual Studio Code | 1.85+      | IDE phát triển              |
| Git                | 2.43+      | Quản lý phiên bản           |

### 3.1.2. Thư viện Python

Các thư viện chính được sử dụng trong dự án:

```
Flask>=2.0.0          # Framework web
Flask-Login>=0.6.0    # Quản lý phiên đăng nhập
neo4j>=5.0.0          # Driver kết nối Neo4j
pandas>=1.3.0         # Xử lý dữ liệu
python-dotenv>=0.19.0 # Quản lý biến môi trường
openpyxl>=3.0.0       # Đọc/ghi file Excel
werkzeug>=2.0.0       # Mã hóa mật khẩu
```

### 3.1.3. Thư viện Frontend

| Thư viện              | Phiên bản | Mục đích                  |
| --------------------- | --------- | ------------------------- |
| Leaflet.js            | 1.9.4     | Hiển thị bản đồ tương tác |
| Leaflet.markercluster | 1.4.1     | Gom nhóm marker           |
| Leaflet.heat          | 0.2.0     | Bản đồ nhiệt (Heatmap)    |
| Font Awesome          | 6.4.0     | Icon giao diện            |
| Google Fonts (Inter)  | -         | Typography                |

---

## 3.2. Cấu trúc Dự án

Dự án được tổ chức theo mô hình **Modular** với kiến trúc **Flask Blueprints**, giúp dễ dàng mở rộng và bảo trì.

```
ban-do-du-lich-Hue/
├── 📂 db/                   # Package Database (Neo4j)
│   ├── __init__.py          # Export tất cả hàm (backward compatible)
│   ├── connection.py        # Quản lý kết nối Neo4j
│   ├── user.py              # Hàm xử lý User
│   ├── admin.py             # Hàm quản trị
│   ├── location.py          # Hàm xử lý Location & tương tác
│   ├── planner.py           # AI Itinerary Planner
│   ├── itinerary.py         # Quản lý lộ trình đã lưu
│   └── sync.py              # Đồng bộ dữ liệu Excel
├── 📂 routes/               # Các nhóm API (Blueprints)
│   ├── auth.py              # Authentication
│   ├── admin.py             # Admin Dashboard
│   ├── api.py               # Core API (Recommend, Planner)
│   └── main.py              # Render trang chính
├── 📂 static/               # Tài nguyên Frontend
│   ├── css/                 # 10 file CSS modular
│   ├── js/                  # 9 file JavaScript
│   └── images/              # Hình ảnh địa điểm
├── 📂 templates/            # Giao diện HTML (Jinja2)
├── 📂 tests/                # Unit Tests
├── 📂 scripts/              # Công cụ import dữ liệu
├── app.py                   # Entry Point
├── setup_algo.py            # Chạy thuật toán PageRank
└── requirements.txt         # Dependencies
```

---

## 3.3. Triển khai Cơ sở dữ liệu

### 3.3.1. Mô hình Dữ liệu Đồ thị (Graph Schema)

Hệ thống sử dụng **Neo4j Graph Database** với các node và relationship sau:

**Các Node (Đỉnh):**

| Node Label  | Thuộc tính                                                       | Mô tả                                    |
| ----------- | ---------------------------------------------------------------- | ---------------------------------------- |
| `User`      | name, password, email, fullname, role, created_at                | Người dùng hệ thống                      |
| `Location`  | name, desc, lat, lng, image, rating, pagerankScore, pagerankNorm | Địa điểm du lịch                         |
| `Category`  | name                                                             | Danh mục (Di tích, Ẩm thực, Tâm linh...) |
| `City`      | name                                                             | Thành phố                                |
| `Itinerary` | id, title, data, days, created_at                                | Lộ trình đã lưu                          |

**Các Relationship (Cạnh):**

| Relationship    | Từ       | Đến       | Thuộc tính                         | Mô tả                              |
| --------------- | -------- | --------- | ---------------------------------- | ---------------------------------- |
| `:LIKED`        | User     | Location  | timestamp                          | Người dùng thích địa điểm          |
| `:REVIEWED`     | User     | Location  | rating, comment, sentiment, topics | Đánh giá                           |
| `:INTERACTED`   | User     | Location  | weight, liked_score, review_score  | Trọng số tương tác (tính toán)     |
| `:HAS_CATEGORY` | Location | Category  | -                                  | Phân loại địa điểm                 |
| `:LOCATED_IN`   | Location | City      | -                                  | Vị trí địa lý                      |
| `:RELATED_TO`   | Location | Location  | weight                             | Địa điểm liên quan (co-occurrence) |
| `:CREATED`      | User     | Itinerary | -                                  | Lộ trình người dùng tạo            |

### 3.3.2. Sơ đồ Quan hệ

```
                    ┌─────────────┐
                    │   City      │
                    │ (Huế)       │
                    └──────▲──────┘
                           │ :LOCATED_IN
    ┌──────────┐    ┌──────┴──────┐    ┌──────────┐
    │ Category │◄───│  Location   │───►│ Category │
    │ (Di tích)│    │ (Lăng tẩm)  │    │ (Ẩm thực)│
    └──────────┘    └──────┬──────┘    └──────────┘
         :HAS_CATEGORY     │              :HAS_CATEGORY
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
    :LIKED            :REVIEWED        :INTERACTED
         │                 │                 │
         └────────┬────────┴────────┬────────┘
                  │                 │
            ┌─────▼─────┐     ┌─────▼─────┐
            │   User    │     │ Itinerary │
            │ (Châu Đàn)│────►│ (Lộ trình)│
            └───────────┘     └───────────┘
                        :CREATED
```

### 3.3.3. Kết nối Cơ sở dữ liệu

File `db/connection.py` quản lý kết nối Neo4j theo mô hình **Singleton**:

```python
from neo4j import GraphDatabase
from dotenv import load_dotenv
import os

load_dotenv()

URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
USER = os.getenv("NEO4J_USER", "neo4j")
PASSWORD = os.getenv("NEO4J_PASS", "12345678")

_driver = None

def get_driver():
    """Lấy driver kết nối Neo4j (singleton pattern)"""
    global _driver
    if _driver is None:
        try:
            _driver = GraphDatabase.driver(URI, auth=(USER, PASSWORD))
            _driver.verify_connectivity()
            print("✅ Kết nối Neo4j thành công!")
        except Exception as e:
            print(f"❌ Lỗi kết nối Neo4j: {e}")
            _driver = None
    return _driver

def run_query(query, params=None):
    """Thực thi câu lệnh Cypher và trả về kết quả"""
    driver = get_driver()
    if not driver:
        return None

    with driver.session() as session:
        result = session.run(query, params or {})
        return [record.data() for record in result]
```

---

## 3.4. Triển khai Thuật toán

### 3.4.1. Thuật toán Weighted PageRank

**Mục đích:** Đánh giá độ phổ biến của địa điểm dựa trên số lượng và chất lượng tương tác.

**Công thức tính trọng số tương tác:**

```
weight = liked_score + review_score
```

Trong đó:

- `liked_score` = 1 (nếu đã Like)
- `review_score` = 1-5 (số sao đánh giá)
- Tổng điểm tối đa: **6 điểm**

**Triển khai (file `setup_algo.py`):**

```python
# Bước 1: Tạo quan hệ :INTERACTED với trọng số
session.run("""
    MATCH (u:User), (l:Location)
    WHERE (u)-[:LIKED]->(l) OR (u)-[:REVIEWED]->(l)

    OPTIONAL MATCH (u)-[like:LIKED]->(l)
    WITH u, l, CASE WHEN like IS NOT NULL THEN 1.0 ELSE 0 END AS liked_score

    OPTIONAL MATCH (u)-[rev:REVIEWED]->(l)
    WITH u, l, liked_score + coalesce(rev.rating, 0) AS total_weight

    MERGE (u)-[i:INTERACTED]->(l)
    SET i.weight = total_weight
""")

# Bước 2: Chạy Weighted PageRank (Neo4j GDS)
session.run("""
    CALL gds.pageRank.write('hybrid_user_graph', {
        writeProperty: 'pagerankScore',
        maxIterations: 12,
        dampingFactor: 0.88,
        relationshipWeightProperty: 'weight'
    })
""")
```

**Tham số PageRank:**

- `maxIterations = 12`: Số vòng lặp tối đa
- `dampingFactor = 0.88`: Hệ số giảm chấn (cân bằng local/global)

### 3.4.2. Thuật toán Collaborative Filtering

**Mục đích:** Gợi ý địa điểm dựa trên người dùng có sở thích tương tự.

**Nguyên lý:** Nếu User A và User B cùng thích nhiều địa điểm giống nhau, thì những nơi B thích mà A chưa biết sẽ được gợi ý cho A.

**Triển khai (file `routes/api.py`):**

```python
cypher_query = """
    MATCH (me:User {name: $name})

    // Tìm user tương tự (cùng thích địa điểm)
    OPTIONAL MATCH (me)-[:INTERACTED]->(:Location)<-[other_int:INTERACTED]-(other:User)
    WHERE other <> me

    // Lấy địa điểm họ thích mà mình chưa đi
    OPTIONAL MATCH (other)-[their_int:INTERACTED]->(l_collab:Location)
    WHERE NOT (me)-[:INTERACTED]->(l_collab)

    // Tính điểm: số user tương tự * trọng số trung bình
    WITH me, l_collab,
         count(DISTINCT other) AS num_similar_users,
         avg(their_int.weight) AS avg_weight

    RETURN l_collab, num_similar_users * coalesce(avg_weight, 1) AS score
"""
```

### 3.4.3. Thuật toán Content-Based Filtering

**Mục đích:** Gợi ý địa điểm dựa trên danh mục/nội dung tương tự.

**Nguyên lý:** Nếu user thích "Chùa Thiên Mụ" (Category: Tâm linh), hệ thống sẽ gợi ý các địa điểm khác cũng thuộc category "Tâm linh".

**Triển khai:**

```python
"""
// Tìm địa điểm cùng category với những nơi đã thích
MATCH (me)-[:INTERACTED]->(liked_loc:Location)
MATCH (liked_loc)-[:HAS_CATEGORY]->(cat:Category)<-[:HAS_CATEGORY]-(l_content:Location)
WHERE NOT (me)-[:INTERACTED]->(l_content)

// Cộng thêm điểm nếu có quan hệ RELATED_TO
OPTIONAL MATCH (liked_loc)-[r:RELATED_TO]-(l_content)
WITH l_content, sum(1 + coalesce(r.weight, 0)) AS score

RETURN l_content, score
"""
```

### 3.4.4. Thuật toán Hybrid Recommendation

**Mục đích:** Kết hợp 3 phương pháp để đưa ra gợi ý tối ưu.

**Công thức tính điểm cuối cùng:**

```
final_score = (score_pagerank_norm × 0.6) + (score_connectivity × 0.3) + (score_rating × 0.1)
```

**Bảng trọng số (Chiến lược Khởi động lạnh):**

| Thành phần                 | Trọng số | Lý do                                                                                                               |
| -------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------- |
| **Độ Phổ Biến (PageRank)** | **60%**  | Dữ liệu tương tác (View/Click) dễ thu thập hơn, độ tin cậy cao khi Rating thưa thớt (_Park & Chu, 2009_).           |
| **Độ Kết Nối**             | **30%**  | Dựa trên cấu trúc đồ thị (Intrinsic Data). Các node trung tâm quan trọng cho việc điều hướng (_Page et al., 1999_). |
| **Chất Lượng (Rating)**    | **10%**  | Đóng vai trò bổ trợ. Trọng số thấp giúp tránh nhiễu từ phương sai cao khi số lượng đánh giá ít (_Burke, 2002_).     |

**Cơ sở Khoa học & Chiến lược:**

1.  **Vấn đề Khởi động Lạnh (Cold Start):**
    Do hệ thống mới triển khai (Sparsity > 98%), các thuật toán Collaborative Filtering truyền thống kém hiệu quả. _Park & Chu (2009)_ đã chỉ ra rằng phương pháp dựa trên độ phổ biến (Popularity-based) cho độ chính xác cao nhất trong giai đoạn này.

2.  **Vai trò của Cấu trúc Đồ thị:**
    Cấu trúc mạng lưới (Graph Connectivity) là dữ liệu nội tại, luôn có sẵn và đáng tin cậy hơn Rating thưa thớt (_Page et al., 1999_). Do đó, trọng số 30% cho yếu tố này giúp đảm bảo tính kết nối của các gợi ý.

3.  **Lộ trình Điều chỉnh (Dynamic Weighting):**
    Hệ thống được thiết kế để tự động điều chỉnh trọng số khi dữ liệu lớn dần. Khi mật độ Rating đạt > 50%, trọng số Rating sẽ được nâng lên mức 50% ("Tỷ lệ vàng") để ưu tiên chất lượng trải nghiệm.

**Triển khai:**

```python
WITH l,
     (coalesce(l.pagerankNorm, 0) * 0.6 +
      coalesce(l.pagerankConnectNorm, 0) * 0.3 +
      (coalesce(avg_rating, l.rating, 0) / 5.0) * 0.1) * 10.0 AS final_score

ORDER BY final_score DESC
LIMIT 12
```

### 3.4.5. Thuật toán Nearest Neighbor (Lập lộ trình)

**Mục đích:** Sắp xếp lộ trình tối ưu khoảng cách di chuyển.

**Nguyên lý:** Từ vị trí hiện tại, luôn chọn địa điểm gần nhất trong danh sách ứng viên.

**Triển khai (file `db/planner.py`):**

```python
def dist_sq(loc1, loc2):
    """Tính bình phương khoảng cách Euclidean"""
    lat1, lng1 = float(loc1.get("lat", 0)), float(loc1.get("lng", 0))
    lat2, lng2 = float(loc2.get("lat", 0)), float(loc2.get("lng", 0))
    return (lat1 - lat2) ** 2 + (lng1 - lng2) ** 2

def pop_nearest(current_location, pool):
    """Lấy địa điểm gần nhất từ pool"""
    if not pool:
        return None

    if not current_location:
        return pool.pop(0)  # Đầu ngày: lấy điểm hot nhất

    # Tìm địa điểm gần nhất
    nearest_idx = 0
    min_dist = float("inf")

    for i, loc in enumerate(pool):
        d = dist_sq(current_location, loc)
        if d < min_dist:
            min_dist = d
            nearest_idx = i

    return pool.pop(nearest_idx)
```

**Luồng xử lý lộ trình 1 ngày:**

```
1. SÁNG: Chọn địa điểm có score cao nhất (điểm neo)
2. TRƯA: Chọn quán ăn GẦN NHẤT so với địa điểm sáng
3. CHIỀU: Chọn địa điểm tham quan GẦN NHẤT so với quán ăn trưa
4. TỐI: Chọn nơi GẦN NHẤT so với địa điểm chiều
```

### 3.4.6. Thuật toán Jaccard Similarity

**Mục đích:** Đo độ tương đồng giữa hai đối tượng (Users hoặc Locations) dựa trên tập hợp các items chung.

**Công thức Jaccard Index:**

```
Jaccard(A, B) = |A ∩ B| / |A ∪ B|
```

Trong đó:

- `|A ∩ B|`: Số phần tử giao (items chung của A và B)
- `|A ∪ B|`: Số phần tử hợp (tất cả items của A và B)
- Kết quả: Giá trị từ 0 (hoàn toàn khác) đến 1 (hoàn toàn giống)

**Ví dụ:**

- User A thích: {Đại Nội, Chùa Thiên Mụ, Lăng Khải Định}
- User B thích: {Đại Nội, Chùa Thiên Mụ, Biển Thuận An}
- Giao (∩): {Đại Nội, Chùa Thiên Mụ} = 2 phần tử
- Hợp (∪): {Đại Nội, Chùa Thiên Mụ, Lăng Khải Định, Biển Thuận An} = 4 phần tử
- **Jaccard = 2/4 = 0.5 (50% tương đồng)**

**Triển khai với Neo4j GDS (file `setup_algo.py`):**

```python
# User Similarity - Tìm users có sở thích giống nhau
session.run("""
    CALL gds.nodeSimilarity.write($graphName, {
        writeRelationshipType: 'SIMILAR_TO',
        writeProperty: 'score',
        topK: 10,
        similarityCutoff: 0.1
    })
""")

# Location Similarity - Tìm địa điểm được thích bởi nhóm users giống nhau
session.run("""
    CALL gds.nodeSimilarity.write($graphName, {
        writeRelationshipType: 'LOC_SIMILAR',
        writeProperty: 'score',
        topK: 5,
        similarityCutoff: 0.15
    })
""")
```

**Tham số:**

- `topK`: Số lượng neighbors tương tự nhất cần lưu
- `similarityCutoff`: Ngưỡng tối thiểu để tạo relationship

**Relationships được tạo:**

- `(:User)-[:SIMILAR_TO {score}]-(:User)`: Độ tương đồng giữa users
- `(:Location)-[:LOC_SIMILAR {score}]-(:Location)`: Độ tương đồng giữa địa điểm

**Ứng dụng trong Collaborative Filtering:**

```python
# Công thức cải tiến:
score = num_similar_users * avg_weight * (1 + avg_similarity)
```

Users có Jaccard Similarity cao hơn sẽ có trọng số lớn hơn trong gợi ý.

---

## 3.5. Triển khai Backend

### 3.5.1. Kiến trúc Flask Blueprints

Ứng dụng được chia thành 4 Blueprint để dễ quản lý:

```python
# app.py
from flask import Flask
from routes.auth import bp as auth_bp
from routes.admin import bp as admin_bp
from routes.api import bp as api_bp
from routes.main import bp as main_bp

app = Flask(__name__)

app.register_blueprint(auth_bp)    # /login, /register, /logout
app.register_blueprint(admin_bp)   # /admin/*
app.register_blueprint(api_bp)     # /api/*
app.register_blueprint(main_bp)    # /
```

### 3.5.2. API Endpoints

**Authentication APIs:**

| Method | Endpoint          | Mô tả             |
| ------ | ----------------- | ----------------- |
| POST   | `/login`          | Đăng nhập         |
| POST   | `/register`       | Đăng ký tài khoản |
| GET    | `/logout`         | Đăng xuất         |
| POST   | `/reset-password` | Đặt lại mật khẩu  |

**Core APIs:**

| Method | Endpoint                    | Mô tả                     |
| ------ | --------------------------- | ------------------------- |
| GET    | `/api/locations`            | Danh sách địa điểm        |
| GET    | `/api/recommend/<username>` | Gợi ý AI cho user         |
| POST   | `/api/like`                 | Like/Unlike địa điểm      |
| POST   | `/api/review`               | Thêm đánh giá             |
| GET    | `/api/reviews/<location>`   | Lấy reviews của địa điểm  |
| POST   | `/api/planner`              | Tạo lộ trình AI           |
| GET    | `/api/itineraries`          | Danh sách lộ trình đã lưu |

**Admin APIs:**

| Method | Endpoint               | Mô tả                |
| ------ | ---------------------- | -------------------- |
| GET    | `/admin/users`         | Danh sách người dùng |
| DELETE | `/admin/user/<id>`     | Xóa người dùng       |
| POST   | `/admin/location`      | Thêm địa điểm mới    |
| PUT    | `/admin/location/<id>` | Sửa địa điểm         |
| POST   | `/admin/run-algo`      | Chạy lại PageRank    |

### 3.5.3. Xử lý Authentication

Hệ thống sử dụng **Flask-Login** để quản lý phiên đăng nhập:

```python
from flask_login import LoginManager, login_user, logout_user, current_user

login_manager = LoginManager()
login_manager.init_app(app)

@login_manager.user_loader
def load_user(user_id):
    info = get_user_info(user_id)
    if info:
        return User(id=user_id, role=info.get("role", "user"))
    return None

# Custom unauthorized handler cho API
@login_manager.unauthorized_handler
def unauthorized_callback():
    if request.path.startswith("/api/"):
        return jsonify({"error": "Unauthorized"}), 401
    return redirect(url_for("main.index"))
```

### 3.5.4. Mã hóa Mật khẩu

Sử dụng **Werkzeug** với thuật toán **PBKDF2-SHA256**:

```python
from werkzeug.security import generate_password_hash, check_password_hash

# Khi đăng ký
hashed_pw = generate_password_hash(password)

# Khi đăng nhập
if check_password_hash(stored_hash, password):
    login_user(user)
```

---

## 3.6. Triển khai Frontend

### 3.6.1. Cấu trúc CSS Modular

CSS được tách thành 10 file để dễ bảo trì:

| File               | Mục đích                         | Kích thước |
| ------------------ | -------------------------------- | ---------- |
| `style.css`        | Styles chung, layout, typography | 22.7 KB    |
| `sidebar.css`      | Thanh bên trái                   | 3.7 KB     |
| `modals.css`       | Các popup modal                  | 21.5 KB    |
| `planner.css`      | Giao diện AI Planner             | 11.0 KB    |
| `map.css`          | Styles bản đồ                    | 3.0 KB     |
| `reviews.css`      | Phần đánh giá                    | 5.1 KB     |
| `auth.css`         | Form đăng nhập/đăng ký           | 3.9 KB     |
| `profile.css`      | Trang cá nhân                    | 3.5 KB     |
| `admin.css`        | Dashboard admin                  | 5.2 KB     |
| `sidebar-tabs.css` | Tabs chuyển đổi                  | 1.3 KB     |

### 3.6.2. Cấu trúc JavaScript

| File           | Chức năng                              |
| -------------- | -------------------------------------- |
| `app.js`       | Khởi tạo ứng dụng, global functions    |
| `map.js`       | Xử lý bản đồ Leaflet, markers, heatmap |
| `auth.js`      | Đăng nhập, đăng ký, đổi mật khẩu       |
| `planner.js`   | AI Itinerary Planner                   |
| `recommend.js` | Hiển thị gợi ý AI                      |
| `reviews.js`   | CRUD đánh giá                          |
| `profile.js`   | Quản lý hồ sơ cá nhân                  |
| `admin.js`     | Chức năng quản trị                     |
| `utils.js`     | Hàm tiện ích dùng chung                |

### 3.6.3. Bản đồ Tương tác (Leaflet.js)

**Khởi tạo bản đồ:**

```javascript
const map = L.map("map").setView([16.4637, 107.5909], 13);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors",
}).addTo(map);
```

**Marker Clustering:**

```javascript
const markerCluster = L.markerClusterGroup({
  spiderfyOnMaxZoom: true,
  showCoverageOnHover: false,
  maxClusterRadius: 50,
});

locations.forEach((loc) => {
  const marker = L.marker([loc.lat, loc.lng]);
  markerCluster.addLayer(marker);
});

map.addLayer(markerCluster);
```

**Bản đồ nhiệt (Heatmap):**

```javascript
const heatData = locations.map((loc) => [
  loc.lat,
  loc.lng,
  loc.pagerankScore * 100, // Intensity dựa trên PageRank
]);

const heatLayer = L.heatLayer(heatData, {
  radius: 25,
  blur: 15,
  gradient: { 0.4: "blue", 0.65: "lime", 1: "red" },
});
```

---

## 3.7. Testing

### 3.7.1. Cấu trúc Test

```
tests/
├── __init__.py
├── test_auth.py        # Test Authentication
├── test_recommend.py   # Test Recommendation API
├── test_planner.py     # Test AI Planner
└── run_all_tests.py    # Script chạy tất cả tests
```

### 3.7.2. Các Test Case

**Authentication Tests:**

- Đăng ký tài khoản mới
- Đăng ký trùng username
- Đăng nhập thành công
- Đăng nhập sai mật khẩu

**Recommendation Tests:**

- Cold Start (user mới, chưa có tương tác)
- User có lịch sử tương tác
- Loại trừ địa điểm đã thích

**Planner Tests:**

- Tạo lộ trình 1 ngày
- Tạo lộ trình nhiều ngày
- Lọc theo category

### 3.7.3. Chạy Tests

```bash
# Chạy từng test
python tests/test_auth.py
python tests/test_recommend.py
python tests/test_planner.py

# Chạy tất cả
python tests/run_all_tests.py
```

---

## 3.8. Hướng dẫn Cài đặt

### 3.8.1. Yêu cầu Hệ thống

- Python 3.9 trở lên
- Neo4j Desktop với GDS plugin
- Trình duyệt modern (Chrome, Firefox, Edge)

### 3.8.2. Các bước Cài đặt

**Bước 1: Clone dự án**

```bash
git clone https://github.com/chaudan0304/ban-do-du-lich-Hue.git
cd ban-do-du-lich-Hue
```

**Bước 2: Cài đặt thư viện Python**

```bash
pip install -r requirements.txt
```

**Bước 3: Cấu hình môi trường**

Tạo file `.env`:

```env
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASS=your_password
FLASK_SECRET_KEY=your_secret_key
```

**Bước 4: Import dữ liệu**

```bash
python scripts/import_data.py
```

**Bước 5: Chạy thuật toán AI**

```bash
python setup_algo.py
```

**Bước 6: Khởi chạy Server**

```bash
python app.py
```

Truy cập: http://127.0.0.1:5000

---

## 3.9. Kết luận Chương

Chương này đã trình bày chi tiết quá trình triển khai hệ thống Huế Travel AI, bao gồm:

1. **Môi trường phát triển**: Các công cụ, thư viện được sử dụng.

2. **Cơ sở dữ liệu**: Mô hình đồ thị Neo4j với các node và relationship phù hợp cho bài toán gợi ý du lịch.

3. **Thuật toán AI**:
   - Weighted PageRank đánh giá độ phổ biến
   - Collaborative Filtering gợi ý theo người dùng tương tự
   - Content-Based Filtering gợi ý theo nội dung
   - Hybrid Recommendation kết hợp cả 3 phương pháp
   - Nearest Neighbor tối ưu lộ trình
   - **Jaccard Similarity đo độ tương đồng giữa users/locations**

4. **Backend Flask**: Kiến trúc Blueprints, API RESTful, Authentication.

5. **Frontend**: Giao diện hiện đại với Leaflet.js, CSS modular.

6. **Testing**: Bộ Unit Tests đảm bảo chất lượng code.

Chương tiếp theo sẽ trình bày kết quả thử nghiệm và đánh giá hiệu quả của hệ thống.
