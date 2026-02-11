# CHƯƠNG 3: TRIỂN KHAI VÀ CÀI ĐẶT HỆ THỐNG

## 3.1. Môi trường và Công nghệ

### 3.1.1. Môi trường phát triển

Hệ thống được xây dựng và thử nghiệm trên môi trường phần cứng và phần mềm như sau:

- **Hệ điều hành:** Windows 11 / Linux (Ubuntu 22.04 LTS).
- **Ngôn ngữ lập trình:** Python 3.9+ (Backend), JavaScript ES6+ (Frontend).
- **Cơ sở dữ liệu:** Neo4j Community Edition 5.11.2 kèm thư viện Graph Data Science (GDS) 2.4.0.
- **IDE:** Visual Studio Code.
- **Quản lý mã nguồn:** Git & GitHub.

### 3.1.2. Các thư viện và công cụ chính

Hệ thống sử dụng các thư viện mã nguồn mở phổ biến để đảm bảo tính ổn định và khả năng mở rộng:

**Backend (Python):**

- **Flask:** Micro-framework web nhẹ, linh hoạt, dùng để xây dựng RESTful API.
- **Neo4j Driver:** Thư viện kết nối và thực thi truy vấn Cypher với cơ sở dữ liệu đồ thị.
- **Flask-Login:** Quản lý phiên đăng nhập và xác thực người dùng.
- **Pandas:** Xử lý và phân tích dữ liệu dạng bảng trước khi nạp vào đồ thị.

**Frontend (Web):**

- **Leaflet.js:** Thư viện bản đồ tương tác mã nguồn mở, hỗ trợ hiển thị marker, popup và heatmap.
- **MarkerCluster:** Plugin giúp gom nhóm các địa điểm khi zoom out để tránh rối mắt.
- **Leaflet.heat:** Plugin tạo bản đồ nhiệt dựa trên mật độ dữ liệu.

---

## 3.2. Thiết kế và Triển khai Cơ sở dữ liệu Đồ thị

Khác với các hệ thống truyền thống dùng RDBMS (như MySQL), đề tài sử dụng Neo4j để mô hình hóa dữ liệu dưới dạng đồ thị, giúp tối ưu hóa việc truy vấn các mối quan hệ phức tạp trong bài toán gợi ý.

### 3.2.1. Lược đồ dữ liệu (Graph Schema)

Cơ sở dữ liệu gồm 5 loại nhãn (Labels) và 6 loại quan hệ (Relationships):

**Các Node (Đỉnh):**

1.  **User (`:User`):** Chứa thông tin người dùng (username, password hash, role).
2.  **Location (`:Location`):** Địa điểm du lịch (tên, tọa độ, mô tả, hình ảnh).
    - Thuộc tính quan trọng: `pagerankNorm` (Độ phổ biến), `pagerankConnectNorm` (Độ kết nối).
3.  **Category (`:Category`):** Danh mục địa điểm (Di tích, Ẩm thực, Tâm linh...).
4.  **City (`:City`):** Thành phố (Huế).
5.  **Itinerary (`:Itinerary`):** Lộ trình du lịch được lưu trữ.

**Các Relationship (Cạnh):**

1.  `(:User)-[:LIKED]->(:Location)`: Người dùng thích địa điểm.
2.  `(:User)-[:REVIEWED {rating, comment}]->(:Location)`: Người dùng đánh giá.
3.  `(:Location)-[:HAS_CATEGORY]->(:Category)`: Phân loại địa điểm.
4.  `(:Location)-[:LOCATED_IN]->(:City)`: Vị trí địa lý.
5.  `(:User)-[:INTERACTED {weight}]->(:Location)`: Quan hệ tổng hợp dùng cho thuật toán (được tạo tự động).
6.  `(:Location)-[:RELATED_TO]->(:Location)`: Quan hệ đồng xuất hiện (Co-occurrence) giữa các địa điểm.

### 3.2.2. Quy trình nạp và tổng hợp dữ liệu

Dữ liệu thô từ Excel (`data.xlsx`) được import vào Neo4j thông qua script `import_data.py`. Sau đó, script `setup_algo.py` sẽ thực hiện các bước tiền xử lý:

1.  **Tạo quan hệ `:INTERACTED`:** Tổng hợp từ `:LIKED` và `:REVIEWED`.
    - Công thức trọng số: `weight = (Like * 1.0) + (Rating * 1.0)`.
2.  **Tạo quan hệ `:RELATED_TO`:** Dựa trên hành vi của người dùng. Nếu nhiều người cùng thích địa điểm A và B, hệ thống sẽ tạo cạnh nối A-B với trọng số tương ứng.

---

## 3.3. Thiết kế và Triển khai Thuật toán Gợi ý (Core AI)

Hệ thống sử dụng mô hình **Hybrid Recommendation System** (Gợi ý lai), kết hợp 3 phương pháp chính để tận dụng ưu điểm và khắc phục nhược điểm của từng loại.

### 3.3.1. Thuật toán Weighted PageRank (Độ phổ biến & Kết nối)

Thuật toán PageRank (của Google) được áp dụng trên đồ thị người dùng - địa điểm để đo lường tầm quan trọng của từng node.

- **PageRank Norm (`pagerankNorm`):** Đo độ phổ biến dựa trên tương tác người dùng. Địa điểm nào được nhiều người (có uy tín) tương tác sẽ có điểm cao.
- **PageRank Connectivity (`pagerankConnectNorm`):** Đo độ trung tâm dựa trên cấu trúc liên kết địa lý và ngữ nghĩa. Địa điểm nằm ở vị trí "cầu nối" giữa các cụm tham quan sẽ có điểm cao.

**Triển khai (Neo4j GDS):**

```cypher
CALL gds.pageRank.write('hybrid_graph', {
  maxIterations: 20,
  dampingFactor: 0.85,
  relationshipWeightProperty: 'weight',
  writeProperty: 'pagerankScore'
})
```

### 3.3.2. Thuật toán Collaborative Filtering (Lọc cộng tác)

Sử dụng độ tương đồng Jaccard (Jaccard Similarity) để tìm ra những người dùng có sở thích giống nhau.

- **Nguyên lý:** Nếu User A và User B cùng thích {Đại Nội, Chùa Thiên Mụ}, hệ thống coi họ là "tương đồng". Những địa điểm B thích mà A chưa biết (ví dụ: Lăng Tự Đức) sẽ được gợi ý cho A.
- **Công thức:** `Similarity(A, B) = |Interacted(A) ∩ Interacted(B)| / |Interacted(A) ∪ Interacted(B)|`.

### 3.3.3. Thuật toán Content-Based Filtering (Lọc theo nội dung)

Gợi ý các địa điểm có cùng thuộc tính (Category, Description) với những nơi người dùng đã từng thích. Phương pháp này giúp giải quyết vấn đề khi địa điểm mới chưa có tương tác.

### 3.3.4. Mô hình Gợi ý Lai & Chiến lược Trọng số (Adaptive Hybrid)

Đây là đóng góp chính của đề tài. Hệ thống sử dụng pipeline **4 bước** để đưa ra gợi ý đa dạng và cá nhân hóa:

**Pipeline xử lý:**

```
Bước 1: Collaborative Filtering → collab_list (từ users tương đồng)
Bước 2: Content-Based Filtering → content_list (từ category đã thích)
Bước 2.5: PageRank Diversity Pool → pagerank_list (Top 20 phổ biến nhất)
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

**Kết quả:** Hệ thống đưa ra danh sách gợi ý cân bằng giữa "Hot trend" (để thu hút), "Thuận tiện" (để dễ đi), và "Đa dạng" (tránh filter bubble), đồng thời vẫn đảm bảo chất lượng dịch vụ.

---

## 3.4. Triển khai Ứng dụng Web

### 3.4.1. Kiến trúc Backend (Flask Blueprints)

Mã nguồn backend được tổ chức theo kiến trúc Modular, chia thành các Blueprint:

- `routes/auth.py`: Xử lý đăng ký, đăng nhập.
- `routes/api.py`: Các API cốt lõi (Gợi ý, Tìm kiếm, Lịch sử).
- `routes/admin.py`: Trang quản trị (Dashboard).

**API Gợi ý (`/api/recommend/<user>`):**
API này thực thi truy vấn Cypher phức tạp, kết hợp cả 3 luồng thuật toán trên và trả về danh sách JSON chứa thông tin địa điểm kèm theo "Lý do gợi ý" (Explainable AI - XAI).

### 3.4.2. Giao diện Frontend

- **Bản đồ chính:** Sử dụng `L.map` với `L.tileLayer` của OpenStreetMap.
- **Thanh bên (Sidebar):** Hiển thị danh sách địa điểm, có thể lọc theo danh mục hoặc tìm kiếm.
- **Hiển thị điểm số AI:** Sử dụng thanh tiến trình (Progress Bar) để trực quan hóa điểm chất lượng tổng hợp (theo tỷ lệ 60-30-10), giúp người dùng dễ dàng so sánh.

### 3.4.3. Module Lập kế hoạch Du lịch (AI Planner)

Chức năng này sử dụng thuật toán **Nearest Neighbor** (Láng giềng gần nhất) kết hợp với **Weighted Selection**:

1.  Lọc danh sách địa điểm theo sở thích và thời gian của user.
2.  Chọn điểm xuất phát là địa điểm có điểm AI cao nhất (Top Score).
3.  Lần lượt chọn các điểm tiếp theo dựa trên khoảng cách địa lý ngắn nhất (Geodesic Distance) để tối ưu hóa việc di chuyển.

---

## 3.5. Kết luận Chương 3

Chương này đã trình bày chi tiết về quá trình hiện thực hóa hệ thống **Huế Travel AI**. Từ việc thiết kế cơ sở dữ liệu đồ thị Neo4j, xây dựng các thuật toán gợi ý lai với chiến lược trọng số thông minh, đến việc phát triển ứng dụng web hoàn chỉnh. Kết quả là một hệ thống có khả năng đưa ra các gợi ý du lịch cá nhân hóa, giải quyết tốt vấn đề khởi động lạnh và cung cấp trải nghiệm trực quan cho người dùng.
