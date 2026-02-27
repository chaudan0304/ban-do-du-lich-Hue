# CHƯƠNG 3: TRIỂN KHAI VÀ CÀI ĐẶT HỆ THỐNG

## 3.1. Môi trường và Công nghệ

### 3.1.1. Môi trường phát triển

Hệ thống được xây dựng và thử nghiệm trên môi trường phần cứng và phần mềm như sau:

- **Hệ điều hành:** Windows 11 / Linux (Ubuntu 22.04 LTS).
- **Ngôn ngữ lập trình:** Python 3.9+ (Backend), JavaScript ES6+ (Frontend).
- **Cơ sở dữ liệu:** Neo4j Community Edition 5.11.2 kèm thư viện Graph Data Science (GDS) 2.24.0.
- **IDE:** Visual Studio Code.
- **Quản lý mã nguồn:** Git & GitHub.

### 3.1.2. Các thư viện và công cụ chính

Hệ thống sử dụng các thư viện mã nguồn mở phổ biến để đảm bảo tính ổn định và khả năng mở rộng:

**Backend (Python):**

- **Flask (>=2.0.0):** Micro-framework web nhẹ, linh hoạt, dùng để xây dựng RESTful API.
- **Neo4j Driver (>=5.0.0):** Thư viện kết nối và thực thi truy vấn Cypher với cơ sở dữ liệu đồ thị.
- **Flask-Login (>=0.6.0):** Quản lý phiên đăng nhập và xác thực người dùng.
- **Pandas (>=1.3.0):** Xử lý và phân tích dữ liệu dạng bảng trước khi nạp vào đồ thị.
- **Werkzeug (>=2.0.0):** Cung cấp hàm `generate_password_hash` và `check_password_hash` để mã hóa mật khẩu an toàn.
- **python-dotenv (>=0.19.0):** Quản lý biến môi trường từ file `.env` (URI Neo4j, Secret Key...).
- **openpyxl (>=3.0.0):** Engine đọc/ghi file Excel, phục vụ import/export dữ liệu địa điểm.

**Frontend (Web):**

- **Leaflet.js:** Thư viện bản đồ tương tác mã nguồn mở, hỗ trợ hiển thị marker, popup và heatmap.
- **MarkerCluster:** Plugin giúp gom nhóm các địa điểm khi zoom out để tránh rối mắt.
- **Leaflet.heat:** Plugin tạo bản đồ nhiệt dựa trên mật độ dữ liệu.

---

## 3.2. Cấu trúc Tổ chức Mã nguồn

Dự án được tổ chức theo kiến trúc **MVC mở rộng** (Model-View-Controller), tách biệt rõ ràng giữa tầng giao diện, tầng xử lý logic, và tầng truy cập dữ liệu. Cấu trúc thư mục như sau:

```
ban_do_du_lich_hue/
│
├── app.py                  # Điểm khởi chạy chính (Flask Application)
├── models.py               # Model User (Flask-Login UserMixin)
├── utils.py                # Hàm tiện ích (Sentiment Analysis, Topic Classification)
├── setup_algo.py           # Engine AI — Thuật toán Hybrid Recommendation v2.0
├── requirements.txt        # Danh sách thư viện Python
├── .env                    # Biến môi trường (NEO4J_URI, SECRET_KEY...)
│
├── routes/                 # Tầng Controller — Flask Blueprints
│   ├── __init__.py         # Package init
│   ├── main.py             # Blueprint "main" — Serve trang chủ
│   ├── auth.py             # Blueprint "auth" — Xác thực (đăng ký, đăng nhập, quên MK)
│   ├── api.py              # Blueprint "api" — API cốt lõi (Recommend, Like, Review...)
│   └── admin.py            # Blueprint "admin" — Quản trị hệ thống
│
├── db/                     # Tầng Model — Data Access Layer (Neo4j)
│   ├── __init__.py         # Export tất cả hàm truy vấn
│   ├── connection.py       # Quản lý kết nối Neo4j Driver, hàm run_query()
│   ├── user.py             # CRUD người dùng, hash mật khẩu (Werkzeug)
│   ├── location.py         # CRUD địa điểm, toggle like, thêm/xóa review
│   ├── planner.py          # AI Itinerary Planner (Nearest Neighbor)
│   ├── itinerary.py        # Lưu/Xóa/Lấy lộ trình đã lưu
│   ├── admin.py            # Truy vấn quản trị (thống kê, danh sách user)
│   └── sync.py             # Đồng bộ Location từ Neo4j → Excel
│
├── templates/              # Tầng View — Giao diện HTML (Jinja2)
│   ├── index.html          # Trang chủ chính
│   └── components/         # Các thành phần UI tái sử dụng
│       ├── review_template.html
│       └── modals/         # 11 modal dialogs
│           ├── auth_modal.html
│           ├── profile_modal.html
│           ├── planner_input_modal.html
│           ├── planner_result_modal.html
│           ├── admin_dashboard_modal.html
│           ├── add_location_modal.html
│           ├── edit_location_modal.html
│           ├── reset_password_modal.html
│           ├── replacement_modal.html
│           ├── user_comments_modal.html
│           └── notification_modal.html
│
├── static/                 # Tài nguyên tĩnh
│   ├── css/                # 10 file CSS (modular)
│   │   ├── style.css       # Style chung, biến CSS, typography
│   │   ├── map.css         # Bản đồ Leaflet
│   │   ├── sidebar.css     # Thanh bên danh sách địa điểm
│   │   ├── sidebar-tabs.css# Tab chuyển đổi trong sidebar
│   │   ├── modals.css      # Tất cả modal dialogs
│   │   ├── auth.css        # Form đăng nhập/đăng ký
│   │   ├── reviews.css     # Khu vực đánh giá
│   │   ├── planner.css     # AI Planner UI
│   │   ├── profile.css     # Trang hồ sơ
│   │   └── admin.css       # Dashboard quản trị
│   ├── js/                 # 9 file JavaScript (modular)
│   │   ├── app.js          # Khởi tạo ứng dụng, quản lý state
│   │   ├── map.js          # Bản đồ, markers, popup, sidebar chi tiết
│   │   ├── auth.js         # Logic xác thực
│   │   ├── recommend.js    # Hiển thị gợi ý AI, biểu đồ phân tích
│   │   ├── planner.js      # AI Planner UI, lưu/xem/xóa lộ trình
│   │   ├── reviews.js      # Đánh giá, lọc sao, sentiment
│   │   ├── profile.js      # Hồ sơ người dùng
│   │   ├── admin.js        # Dashboard quản trị
│   │   └── utils.js        # Hàm dùng chung (notification, sanitize...)
│   └── images/             # ~65 hình ảnh địa điểm du lịch
│
├── data/                   # Dữ liệu gốc
│   └── data.xlsx           # File Excel chứa thông tin địa điểm
│
├── scripts/                # Scripts tiện ích
│   ├── import_data.py      # Nạp dữ liệu từ Excel → Neo4j
│   ├── generate_users.py   # Tạo dữ liệu mẫu (Users, Likes)
│   ├── analyze_weights.py  # Phân tích phân bổ trọng số
│   └── migrate_review_ids.py # Migration review IDs
│
├── tests/                  # Kiểm thử tự động
│   ├── __init__.py
│   ├── run_all_tests.py    # Chạy toàn bộ test suite
│   ├── test_auth.py        # Test xác thực
│   ├── test_recommend.py   # Test thuật toán gợi ý
│   └── test_planner.py     # Test AI Planner
│
└── docs/                   # Tài liệu báo cáo
    ├── MO_DAU.md
    ├── CHUONG_1_LY_THUYET.md
    ├── CHUONG_2_PHAN_TICH_THIET_KE.md
    ├── CHUONG_3_TRIEN_KHAI.md
    ├── CHUONG_4_KET_QUA_DANH_GIA.md
    ├── KET_LUAN.md
    └── TAI_LIEU_THAM_KHAO.md
```

**Nguyên tắc tổ chức:**

- **Tách biệt trách nhiệm (Separation of Concerns):** Mỗi file/module chỉ đảm nhận một chức năng cụ thể. Ví dụ: `db/user.py` chỉ xử lý CRUD người dùng, `db/planner.py` chỉ chứa logic lập lộ trình.
- **CSS và JS modular:** Thay vì gộp tất cả vào một file lớn, mã nguồn frontend được chia thành 10 file CSS và 9 file JS theo chức năng, giúp bảo trì và mở rộng dễ dàng.
- **Template Components:** Giao diện HTML sử dụng Jinja2 `{% include %}` để tái sử dụng các thành phần modal, tránh lặp code.
- **Data Access Layer:** Tầng `db/` đóng vai trò trung gian duy nhất giữa Flask routes và Neo4j, đảm bảo tất cả truy vấn Cypher đều đi qua một điểm kiểm soát.

---

## 3.3. Thiết kế và Triển khai Cơ sở dữ liệu Đồ thị

Khác với các hệ thống truyền thống dùng RDBMS (như MySQL), đề tài sử dụng Neo4j để mô hình hóa dữ liệu dưới dạng đồ thị, giúp tối ưu hóa việc truy vấn các mối quan hệ phức tạp trong bài toán gợi ý.

### 3.3.1. Lược đồ dữ liệu (Graph Schema)

Cơ sở dữ liệu gồm 5 loại nhãn (Labels) và 8 loại quan hệ (Relationships):

**Các Node (Đỉnh):**

1.  **User (`:User`):** Chứa thông tin người dùng (username, password hash, role, email, fullname).
2.  **Location (`:Location`):** Địa điểm du lịch (tên, tọa độ, mô tả, hình ảnh).
    - Thuộc tính quan trọng: `pagerankNorm` (Độ phổ biến), `pagerankConnectNorm` (Độ kết nối), `avgRating` (Điểm đánh giá trung bình).
3.  **Category (`:Category`):** Danh mục địa điểm (Di tích, Ẩm thực, Tâm linh...).
4.  **City (`:City`):** Thành phố (Huế).
5.  **Itinerary (`:Itinerary`):** Lộ trình du lịch được lưu trữ.

**Các Relationship (Cạnh):**

1.  `(:User)-[:LIKED]->(:Location)`: Người dùng thích địa điểm.
2.  `(:User)-[:REVIEWED {rating, comment, sentiment, topics}]->(:Location)`: Người dùng đánh giá (kèm phân tích cảm xúc và chủ đề tự động).
3.  `(:Location)-[:HAS_CATEGORY]->(:Category)`: Phân loại địa điểm.
4.  `(:Location)-[:LOCATED_IN]->(:City)`: Vị trí địa lý.
5.  `(:User)-[:INTERACTED {weight}]->(:Location)`: Quan hệ tổng hợp dùng cho thuật toán (được tạo tự động bởi `setup_algo.py`).
6.  `(:Location)-[:RELATED_TO {weight}]-(:Location)`: Quan hệ đồng xuất hiện (Co-occurrence) và cùng danh mục giữa các địa điểm.
7.  `(:User)-[:SIMILAR_TO {score}]-(:User)`: Độ tương đồng Jaccard giữa các cặp người dùng (được tạo tự động bởi GDS).
8.  `(:Location)-[:LOC_SIMILAR {score}]-(:Location)`: Độ tương đồng Jaccard giữa các cặp địa điểm (được tạo tự động bởi GDS).

### 3.3.2. Quy trình nạp và tổng hợp dữ liệu

Dữ liệu thô từ Excel (`data/data.xlsx`) được import vào Neo4j thông qua script `scripts/import_data.py`. Ngoài ra, script `scripts/generate_users.py` tạo dữ liệu mẫu (Users và Likes) để phục vụ kiểm thử hệ thống.

Sau đó, script `setup_algo.py` sẽ thực hiện các bước tiền xử lý:

1.  **Tạo quan hệ `:INTERACTED`:** Tổng hợp từ `:LIKED` và `:REVIEWED`.
    - Công thức trọng số: `weight = LIKED(0 hoặc 1.0) + REVIEWED(0-5 sao)`.
    - Tối đa 6 điểm cho mỗi cặp User-Location (1 điểm từ LIKED + 5 điểm từ đánh giá 5 sao).
2.  **Tạo quan hệ `:RELATED_TO`:** Kết hợp từ 2 nguồn:
    - **Co-occurrence:** Nếu nhiều người cùng tương tác địa điểm A và B, hệ thống tạo cạnh nối A-B với trọng số `common_users × 1.2`.
    - **Category:** Nếu 2 địa điểm cùng thuộc một danh mục, trọng số được cộng thêm `0.8`.

---

## 3.4. Thiết kế và Triển khai Thuật toán Gợi ý (Core AI)

Hệ thống sử dụng mô hình **Hybrid Recommendation System** (Gợi ý lai), kết hợp 3 phương pháp chính để tận dụng ưu điểm và khắc phục nhược điểm của từng loại.

### 3.4.1. Thuật toán Weighted PageRank (Độ phổ biến & Kết nối)

Thuật toán PageRank (của Google) được áp dụng trên đồ thị người dùng - địa điểm để đo lường tầm quan trọng của từng node. Hệ thống chạy **2 đồ thị PageRank riêng biệt**:

- **PageRank Norm (`pagerankNorm`):** Đo độ phổ biến dựa trên tương tác người dùng. Chạy trên đồ thị `User↔Location` qua quan hệ `:INTERACTED` (có trọng số). Địa điểm nào được nhiều người (có uy tín) tương tác sẽ có điểm cao.
- **PageRank Connectivity (`pagerankConnectNorm`):** Đo độ trung tâm dựa trên cấu trúc liên kết địa lý và ngữ nghĩa. Chạy trên đồ thị `Location↔Location` qua quan hệ `:RELATED_TO` (undirected). Địa điểm nằm ở vị trí "cầu nối" giữa các cụm tham quan sẽ có điểm cao.

**Triển khai (Neo4j GDS):**

```cypher
-- PageRank Phổ biến (User-Location graph)
CALL gds.graph.project(
    'hybrid_user_graph',
    ['User', 'Location'],
    { INTERACTED: { properties: 'weight' } }
)

CALL gds.pageRank.write('hybrid_user_graph', {
  maxIterations: 12,
  dampingFactor: 0.88,
  relationshipWeightProperty: 'weight',
  writeProperty: 'pagerankScore'
})

-- PageRank Kết nối (Location-Location graph)
CALL gds.graph.project(
    'hybrid_loc_graph',
    'Location',
    { RELATED_TO: { orientation: 'UNDIRECTED', properties: 'weight' } }
)

CALL gds.pageRank.write('hybrid_loc_graph', {
  maxIterations: 12,
  dampingFactor: 0.88,
  relationshipWeightProperty: 'weight',
  writeProperty: 'pagerankConnect'
})
```

**Bảng tham số PageRank:**

| Tham số              |  Giá trị  | Ý nghĩa                                                                    |
| :------------------- | :-------: | :-------------------------------------------------------------------------- |
| `maxIterations`      |   `12`    | Số vòng lặp — đủ cho đồ thị nhỏ (~100 nodes) để hội tụ                     |
| `dampingFactor`      |  `0.88`   | Hệ số tắt dần — cân bằng giữa tín hiệu toàn cục (global) và cục bộ (local) |
| `relationshipWeightProperty` | `'weight'` | Sử dụng trọng số từ INTERACTED/RELATED_TO thay vì đếm đơn thuần    |

Sau khi chạy PageRank, hệ thống thực hiện **chuẩn hóa (Normalize)** về thang 0-1:
- `pagerankNorm = pagerankScore / max(pagerankScore)`
- `pagerankConnectNorm = pagerankConnect / max(pagerankConnect)`

### 3.4.2. Thuật toán Collaborative Filtering (Lọc cộng tác)

Sử dụng thuật toán **Node Similarity** (Jaccard Index) từ thư viện Neo4j GDS để tìm ra những người dùng có sở thích giống nhau, từ đó gợi ý các địa điểm mà người dùng tương đồng đã thích.

- **Nguyên lý:** Nếu User A và User B cùng thích {Đại Nội, Chùa Thiên Mụ}, hệ thống coi họ là "tương đồng". Những địa điểm B thích mà A chưa biết (ví dụ: Lăng Tự Đức) sẽ được gợi ý cho A.
- **Công thức Jaccard Similarity:**

$$Similarity(A, B) = \frac{|Interacted(A) \cap Interacted(B)|}{|Interacted(A) \cup Interacted(B)|}$$

**Quy trình triển khai gồm 2 giai đoạn:**

**Giai đoạn 1 — Tiền xử lý dữ liệu (Co-occurrence):**

Tạo quan hệ `:RELATED_TO` giữa các cặp địa điểm dựa trên hành vi tương tác chung của người dùng:

```cypher
MATCH (u:User)-[:INTERACTED]->(l1:Location)
MATCH (u)-[:INTERACTED]->(l2:Location)
WHERE elementId(l1) < elementId(l2)
WITH l1, l2, count(DISTINCT u) AS common_users
MERGE (l1)-[r:RELATED_TO]-(l2)
SET r.weight = coalesce(r.weight, 0) + (common_users * 1.2)
```

- Nếu 3 users cùng thích Đại Nội và Lăng Tự Đức → `RELATED_TO.weight += 3 × 1.2 = 3.6`.
- Quan hệ này phục vụ cho bước PageRank Kết nối (Bước 5 trong `setup_algo.py`).

**Giai đoạn 2 — Thuật toán GDS Node Similarity:**

Sử dụng thuật toán `gds.nodeSimilarity` trên đồ thị `User → Location` để tính Jaccard Index chính xác giữa tất cả các cặp users:

```cypher
-- Bước 1: Project đồ thị User-Location
CALL gds.graph.project(
    'user_similarity_graph',
    ['User', 'Location'],
    { INTERACTED: { orientation: 'NATURAL' } }
)

-- Bước 2: Chạy thuật toán Node Similarity (Jaccard)
CALL gds.nodeSimilarity.write('user_similarity_graph', {
    writeRelationshipType: 'SIMILAR_TO',
    writeProperty: 'score',
    topK: 10,
    similarityCutoff: 0.1
})
YIELD nodesCompared, relationshipsWritten, similarityDistribution
```

**Bảng tham số thuật toán:**

| Tham số                 |    Giá trị     | Ý nghĩa                                                             |
| :---------------------- | :------------: | :------------------------------------------------------------------ |
| `writeRelationshipType` | `'SIMILAR_TO'` | Tên relationship được tạo giữa các cặp User tương đồng              |
| `writeProperty`         |   `'score'`    | Thuộc tính lưu điểm Jaccard (0.0 → 1.0)                             |
| `topK`                  |      `10`      | Mỗi user chỉ giữ lại tối đa 10 users tương đồng nhất                |
| `similarityCutoff`      |     `0.1`      | Ngưỡng tối thiểu — cặp users có Jaccard < 0.1 (dưới 10%) sẽ bị loại |

**Kết quả:** Tạo ra relationship `(:User)-[:SIMILAR_TO {score}]-(:User)`. Relationship này được sử dụng trực tiếp trong câu query Recommend (Bước 1 — Collaborative Filtering) tại `routes/api.py`:

```cypher
OPTIONAL MATCH (me)-[sim:SIMILAR_TO]-(other:User)
WHERE other <> me
OPTIONAL MATCH (other)-[their_int:INTERACTED]->(l_collab:Location)
WHERE NOT (me)-[:INTERACTED]->(l_collab) AND NOT (me)-[:LIKED]->(l_collab)
-- Công thức: num_similar_users × avg_weight × (1 + avg_similarity)
```

### 3.4.3. Thuật toán Content-Based Filtering (Lọc theo nội dung)

Gợi ý các địa điểm có cùng thuộc tính (Category) với những nơi người dùng đã từng thích. Phương pháp này giúp giải quyết vấn đề khi địa điểm mới chưa có đủ tương tác từ cộng đồng (bổ trợ cho Collaborative Filtering).

**Quy trình triển khai gồm 2 giai đoạn:**

**Giai đoạn 1 — Tiền xử lý dữ liệu (Category Matching):**

Tạo quan hệ `:RELATED_TO` giữa các cặp địa điểm cùng thuộc một danh mục:

```cypher
MATCH (l1:Location)-[:HAS_CATEGORY]->(cat:Category)<-[:HAS_CATEGORY]-(l2:Location)
WHERE elementId(l1) < elementId(l2)
MERGE (l1)-[r:RELATED_TO]-(l2)
SET r.weight = coalesce(r.weight, 0) + 0.8
```

- Nếu Đại Nội và Lăng Tự Đức cùng thuộc "Di tích lịch sử" → `RELATED_TO.weight += 0.8`.
- Trọng số này **cộng dồn** với Co-occurrence ở Giai đoạn 1 của Collaborative Filtering. Ví dụ: 2 địa điểm vừa cùng category vừa có 3 users chung → `weight = (3 × 1.2) + 0.8 = 4.4`.

**Giai đoạn 2 — Thuật toán GDS Node Similarity (Location):**

Sử dụng thuật toán `gds.nodeSimilarity` trên đồ thị **đảo ngược** `Location ← User` để tính độ tương đồng giữa các địa điểm dựa trên tập users đã tương tác:

```cypher
-- Bước 1: Project đồ thị Location-User (reverse)
CALL gds.graph.project(
    'loc_similarity_graph',
    ['Location', 'User'],
    { INTERACTED: { orientation: 'REVERSE' } }
)

-- Bước 2: Chạy thuật toán Node Similarity cho Locations
CALL gds.nodeSimilarity.write('loc_similarity_graph', {
    writeRelationshipType: 'LOC_SIMILAR',
    writeProperty: 'score',
    topK: 5,
    similarityCutoff: 0.15
})
YIELD nodesCompared, relationshipsWritten, similarityDistribution
```

**Bảng tham số thuật toán:**

| Tham số                 |     Giá trị     | Ý nghĩa                                                                                                      |
| :---------------------- | :-------------: | :----------------------------------------------------------------------------------------------------------- |
| `writeRelationshipType` | `'LOC_SIMILAR'` | Tên relationship được tạo giữa các cặp Location tương đồng                                                   |
| `writeProperty`         |    `'score'`    | Thuộc tính lưu điểm Jaccard (0.0 → 1.0)                                                                      |
| `topK`                  |       `5`       | Mỗi địa điểm chỉ giữ tối đa 5 địa điểm tương đồng nhất                                                       |
| `similarityCutoff`      |     `0.15`      | Ngưỡng tối thiểu — cặp locations có Jaccard < 0.15 sẽ bị loại (cao hơn User Similarity do cần chính xác hơn) |
| `orientation`           |   `'REVERSE'`   | Đảo ngược hướng `INTERACTED` (từ Location nhìn về User) để tính similarity giữa các Location                 |

**Kết quả:** Tạo ra relationship `(:Location)-[:LOC_SIMILAR {score}]-(:Location)`. Relationship này được sử dụng trong API **Địa điểm tương tự** (`/api/similar/<location_name>`) để gợi ý các nơi cùng loại.

Ngoài ra, trong câu query Recommend (Bước 2 — Content-Based Filtering) tại `routes/api.py`, hệ thống cũng trực tiếp duyệt đồ thị theo category và RELATED_TO:

```cypher
OPTIONAL MATCH (me)-[:INTERACTED]->(liked_loc:Location)
OPTIONAL MATCH (liked_loc)-[:HAS_CATEGORY]->(cat:Category)<-[:HAS_CATEGORY]-(l_content:Location)
WHERE NOT (me)-[:INTERACTED]->(l_content) AND NOT (me)-[:LIKED]->(l_content)
OPTIONAL MATCH (liked_loc)-[r:RELATED_TO]-(l_content)
WITH me, collab_list, l_content,
     sum(1 + coalesce(r.weight, 0)) AS score_content
```

**So sánh 2 thuật toán:**

| Tiêu chí                | Collaborative Filtering     | Content-Based Filtering           |
| :---------------------- | :-------------------------- | :-------------------------------- |
| **Đối tượng so sánh**   | User ↔ User                 | Location ↔ Location               |
| **Dựa trên**            | Tập địa điểm đã tương tác   | Tập users đã tương tác + Category |
| **Relationship tạo ra** | `SIMILAR_TO` (User)         | `LOC_SIMILAR` (Location)          |
| **topK**                | 10                          | 5                                 |
| **similarityCutoff**    | 0.1 (10%)                   | 0.15 (15%)                        |
| **Yêu cầu dữ liệu**     | Cần nhiều users & tương tác | Ít phụ thuộc vào số lượng users   |
| **Giải quyết**          | "Người giống bạn thích gì?" | "Nơi giống nơi bạn thích?"        |

### 3.4.4. Mô hình Gợi ý Lai & Chiến lược Trọng số (Adaptive Hybrid)

Đây là đóng góp chính của đề tài. Hệ thống sử dụng pipeline **4 bước** để đưa ra gợi ý đa dạng và cá nhân hóa:

**Pipeline xử lý:**

```
Bước 1: Collaborative Filtering → collab_list (từ users tương đồng, weight ×3)
Bước 2: Content-Based Filtering → content_list (từ category đã thích, weight ×1)
Bước 2.5: PageRank Diversity Pool → pagerank_list (Top 20 phổ biến nhất, weight ×10)
Bước 3: Gộp tất cả → all_candidates = collab + content + pagerank
Bước 4: Tính Final Score → sắp xếp → Top 12
```

**Bước 2.5 (PageRank Diversity Pool)** là cải tiến quan trọng giải quyết vấn đề "filter bubble": khi user chỉ thích 1 loại category (VD: Mua sắm), Content-Based chỉ trả về cùng loại → kết quả bị hẹp. Bằng cách luôn bổ sung Top 20 địa điểm PageRank cao nhất, hệ thống đảm bảo sự đa dạng (VD: 3 kết quả → 15 kết quả đa chủ đề).

**Công thức tổng quát:**
$$ FinalScore = (P \times w_P) + (C \times w_C) + (R \times w_R) $$

Trong đó, với giai đoạn hiện tại (dữ liệu còn thưa), bộ trọng số được thiết lập như sau:

| Thành phần ($X$)                  | Trọng số ($w$) | Giải thích chiến lược                                                                                                                         |
| :-------------------------------- | :------------: | :-------------------------------------------------------------------------------------------------------------------------------------------- |
| **Độ Phổ Biến (Popularity - P)**  | **0.6 (60%)**  | Ưu tiên các địa điểm đã được cộng đồng kiểm chứng (Crowd Wisdom). Đây là chỉ số đáng tin cậy nhất khi chưa hiểu rõ user (_Park & Chu, 2009_). |
| **Độ Kết Nối (Connectivity - C)** | **0.3 (30%)**  | Tận dụng cấu trúc đồ thị. Các địa điểm "trung tâm" (Hubs) thuận tiện cho việc di chuyển luồng tuyến du lịch (_Page et al., 1999_).            |
| **Chất Lượng (Rating - R)**       | **0.1 (10%)**  | Chỉ đóng vai trò bổ trợ. Do số lượng đánh giá còn ít, tránh việc một vài đánh giá 5 sao ngẫu nhiên làm lệch bảng xếp hạng (_Burke, 2002_).    |

**Chiến lược Cold Start (Khởi động lạnh):**

Đối với người dùng mới chưa có tương tác (chưa LIKED hoặc INTERACTED), hệ thống sẽ bỏ qua Collaborative và Content-Based Filtering, thay vào đó sử dụng **Fallback Query** chỉ dựa trên điểm PageRank tổng hợp (công thức 60-30-10) để đảm bảo mọi người dùng đều nhận được gợi ý ngay từ lần truy cập đầu tiên.

**Kết quả:** Hệ thống đưa ra danh sách gợi ý cân bằng giữa "Hot trend" (để thu hút), "Thuận tiện" (để dễ đi), và "Đa dạng" (tránh filter bubble), đồng thời vẫn đảm bảo chất lượng dịch vụ.

### 3.4.5. Explainable AI (Giải thích kết quả gợi ý)

Mỗi địa điểm trong danh sách gợi ý đều kèm theo thông tin giải thích chi tiết, giúp người dùng hiểu _tại sao_ hệ thống chọn nơi đó:

- **`reason`:** Lý do chính bằng ngôn ngữ tự nhiên (VD: "3 người có sở thích giống bạn đã thích địa điểm này").
- **`reason_icon`:** Emoji trực quan tương ứng (👥 Collab, 🎯 Content, 🔥 PageRank).
- **`reason_type`:** Phân loại lý do (`collab`, `content`, `pagerank`, `default`).
- **`reason_details`:** Dữ liệu chi tiết cho biểu đồ UI, bao gồm:
  - Điểm số và phần trăm đóng góp của từng thành phần (Collaborative, Content-Based, PageRank).
  - Danh sách users tương đồng đã thích (tối đa 5 users).
  - Danh sách địa điểm đã thích cùng category (tối đa 3 nơi).
  - Dữ liệu biểu đồ tròn: tỷ lệ đóng góp của 3 thành phần (tổng 100%).

---

## 3.5. Triển khai Ứng dụng Web

### 3.5.1. Kiến trúc Backend (Flask Blueprints)

Mã nguồn backend được tổ chức theo kiến trúc Modular, chia thành 4 Blueprint:

- `routes/main.py`: Serve trang chủ (`index.html`) — điểm vào chính của ứng dụng trên trình duyệt.
- `routes/auth.py`: Xử lý đăng ký, đăng nhập, đăng xuất, xác minh tài khoản, đặt lại mật khẩu, quản lý hồ sơ.
- `routes/api.py`: Các API cốt lõi (Gợi ý AI, Tìm kiếm, Đánh giá, Like, Lộ trình, Users tương tự, Địa điểm tương tự).
- `routes/admin.py`: Trang quản trị — CRUD địa điểm, quản lý user, thống kê hệ thống, trigger chạy lại thuật toán AI.

**Tầng truy cập dữ liệu (Data Access Layer — `db/`):**

Hệ thống tách biệt logic truy vấn cơ sở dữ liệu vào thư mục `db/` với các module chuyên biệt:

| Module            | Chức năng                                                        |
| :---------------- | :--------------------------------------------------------------- |
| `db/connection.py`| Quản lý kết nối Neo4j (driver, `run_query` helper)               |
| `db/user.py`      | Đăng ký, xác thực, hash mật khẩu (Werkzeug)                     |
| `db/location.py`  | CRUD địa điểm, truy vấn lọc/tìm kiếm                            |
| `db/planner.py`   | AI Itinerary Planner (Nearest Neighbor + Weighted Selection)     |
| `db/itinerary.py` | Lưu/Xóa/Lấy lộ trình đã lưu                                     |
| `db/admin.py`     | Truy vấn quản trị (thống kê, danh sách user)                     |
| `db/sync.py`      | Đồng bộ dữ liệu Location từ Neo4j ra file Excel (`data.xlsx`)   |

**Module tiện ích (`utils.py`):**

File `utils.py` cung cấp các hàm phân tích văn bản tự động, được tích hợp vào quy trình thêm đánh giá:

- **`analyze_sentiment(comment)`:** Phân tích cảm xúc bình luận (tích cực / tiêu cực / trung lập).
- **`classify_comment_topic(comment)`:** Phân loại chủ đề bình luận (VD: "phong cảnh", "dịch vụ", "giá cả").

**API Gợi ý (`/api/recommend/<user>`):**
API này thực thi truy vấn Cypher phức tạp, kết hợp cả 3 luồng thuật toán trên và trả về danh sách JSON chứa thông tin địa điểm kèm theo "Lý do gợi ý" (Explainable AI - XAI).

### 3.5.2. Giao diện Frontend

Giao diện được xây dựng bằng HTML5, CSS3 và JavaScript thuần (Vanilla JS), tổ chức theo các module chức năng:

**Cấu trúc JavaScript (`static/js/`):**

| File             | Chức năng                                                      |
| :--------------- | :------------------------------------------------------------- |
| `app.js`         | Khởi tạo ứng dụng, quản lý state chung                         |
| `map.js`         | Bản đồ Leaflet, markers, popup, sidebar chi tiết địa điểm      |
| `auth.js`        | Đăng nhập, đăng ký, quên mật khẩu                              |
| `recommend.js`   | Hiển thị gợi ý AI, biểu đồ phân tích                           |
| `planner.js`     | AI Planner UI, lưu/xem/xóa lộ trình                            |
| `reviews.js`     | Đánh giá, lọc theo sao, hiển thị cảm xúc                       |
| `profile.js`     | Trang hồ sơ người dùng                                         |
| `admin.js`       | Dashboard quản trị                                              |
| `utils.js`       | Hàm tiện ích dùng chung (notification, format, sanitize)        |

**Các thành phần chính:**

- **Bản đồ chính:** Sử dụng `L.map` với `L.tileLayer` của OpenStreetMap.
- **Thanh bên (Sidebar):** Hiển thị danh sách địa điểm, có thể lọc theo danh mục hoặc tìm kiếm.
- **Hiển thị điểm số AI:** Sử dụng thanh tiến trình (Progress Bar) để trực quan hóa điểm chất lượng tổng hợp (theo tỷ lệ 60-30-10), giúp người dùng dễ dàng so sánh.

### 3.5.3. Module Lập kế hoạch Du lịch (AI Planner)

Chức năng này sử dụng thuật toán **Nearest Neighbor** (Láng giềng gần nhất) kết hợp với **Weighted Selection**, hỗ trợ **2 chế độ vận hành**:

- **Chế độ "Đã thích" (`use_liked=true`):** Chỉ sử dụng các địa điểm user đã thả tim ❤️. Nếu chưa thích nơi nào, hệ thống trả về thông báo lỗi rõ ràng.
- **Chế độ "AI gợi ý" (`use_liked=false`):** AI tự chọn các địa điểm chưa ghé dựa trên PageRank và mức độ phổ biến. Có cơ chế fallback nếu không có ứng viên.

**Quy trình thuật toán 4 bước:**

1.  **Candidate Selection:** Lọc danh sách địa điểm theo sở thích (preferences) và chế độ vận hành. Ở chế độ AI, công thức điểm: `PageRank(50%) + log(Popularity)(30%)`.
2.  **Category Splitting:** Tách ứng viên thành 2 pool riêng biệt:
    - `pool_sightseeing`: Địa điểm tham quan (di tích, thiên nhiên, chùa...).
    - `pool_food`: Quán ăn, cà phê, ẩm thực (phát hiện qua keyword matching).
3.  **Nearest Neighbor (Greedy):** Chọn điểm xuất phát là địa điểm có điểm AI cao nhất (Top Score). Lần lượt chọn các điểm tiếp theo dựa trên **khoảng cách Euclid bình phương** (`(lat₁−lat₂)² + (lng₁−lng₂)²`) để tối ưu hóa việc di chuyển.
4.  **Day Planning:** Sắp lịch **4 buổi mỗi ngày** theo mẫu xen kẽ:

| Buổi       | Loại          | Chiến lược chọn                                     |
| :--------- | :------------ | :--------------------------------------------------- |
| **Sáng**   | Tham quan     | Điểm Neo (Anchor) — nơi có điểm AI cao nhất còn lại |
| **Trưa**   | Ẩm thực       | Quán gần nhất từ điểm tham quan sáng                 |
| **Chiều**  | Tham quan     | Địa điểm gần nhất từ quán ăn trưa                    |
| **Tối**    | Ẩm thực/Dạo  | Nơi gần nhất từ điểm chiều (ưu tiên ăn, fallback dạo)|

---

## 3.6. Kết luận Chương 3

Chương này đã trình bày chi tiết về quá trình hiện thực hóa hệ thống **Huế Travel AI**. Từ việc thiết kế cơ sở dữ liệu đồ thị Neo4j với lược đồ gồm 5 loại node và 8 loại quan hệ, xây dựng các thuật toán gợi ý lai với chiến lược trọng số thông minh (60-30-10), tích hợp Explainable AI giải thích kết quả, đến việc phát triển ứng dụng web hoàn chỉnh với kiến trúc modular (4 Blueprint, 7 module Data Access Layer). Hệ thống còn bao gồm module AI Planner sử dụng thuật toán Nearest Neighbor với 2 pool riêng biệt, phân tích cảm xúc tự động, và cơ chế Cold Start cho người dùng mới. Kết quả là một hệ thống có khả năng đưa ra các gợi ý du lịch cá nhân hóa, giải quyết tốt vấn đề khởi động lạnh và cung cấp trải nghiệm trực quan cho người dùng.
