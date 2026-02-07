# CHƯƠNG 1: CƠ SỞ LÝ THUYẾT

## 1.1. Tổng quan về Hệ thống Gợi ý (Recommendation System)

### 1.1.1. Định nghĩa

**Hệ thống gợi ý (Recommendation System)** là một lớp con của hệ thống lọc thông tin, được thiết kế để dự đoán sở thích hoặc đánh giá của người dùng đối với các mục (items) và đưa ra những gợi ý phù hợp.

Hệ thống gợi ý được sử dụng rộng rãi trong nhiều lĩnh vực:

- **Thương mại điện tử:** Amazon, Shopee gợi ý sản phẩm
- **Giải trí:** Netflix, Spotify gợi ý phim, nhạc
- **Mạng xã hội:** Facebook, TikTok gợi ý bài viết, video
- **Du lịch:** TripAdvisor, Booking gợi ý địa điểm, khách sạn

### 1.1.2. Phân loại Hệ thống Gợi ý

Có 3 phương pháp chính trong xây dựng hệ thống gợi ý:

#### a) Content-Based Filtering (Lọc theo Nội dung)

**Nguyên lý:** Gợi ý các items có nội dung/đặc điểm tương tự với những items mà người dùng đã thích trước đó.

**Ví dụ:** Nếu user thích "Chùa Thiên Mụ" (category: Tâm linh), hệ thống sẽ gợi ý các địa điểm khác cũng thuộc category "Tâm linh".

**Ưu điểm:**

- Không cần dữ liệu từ người dùng khác
- Có thể giải thích lý do gợi ý

**Nhược điểm:**

- Giới hạn trong phạm vi đã biết (filter bubble)
- Khó khám phá items mới lạ

#### b) Collaborative Filtering (Lọc Cộng tác)

**Nguyên lý:** Gợi ý dựa trên sự tương đồng giữa các người dùng. Nếu User A và User B có sở thích giống nhau, những items B thích mà A chưa biết sẽ được gợi ý cho A.

**Có 2 loại:**

- **User-based:** Tìm users có sở thích tương tự
- **Item-based:** Tìm items được đánh giá tương tự

**Ưu điểm:**

- Không cần phân tích nội dung item
- Có thể khám phá items mới lạ

**Nhược điểm:**

- Cold Start: Khó gợi ý cho user mới hoặc item mới
- Cần nhiều dữ liệu tương tác

#### c) Hybrid Approach (Phương pháp Lai)

**Nguyên lý:** Kết hợp Content-Based và Collaborative Filtering để tận dụng ưu điểm và khắc phục nhược điểm của từng phương pháp.

**Các cách kết hợp:**

- **Weighted:** Kết hợp điểm số với trọng số
- **Switching:** Chuyển đổi giữa các phương pháp tùy ngữ cảnh
- **Mixed:** Hiển thị kết quả từ cả hai phương pháp
- **Feature combination:** Kết hợp đặc trưng

---

## 1.2. Cơ sở dữ liệu Đồ thị (Graph Database)

### 1.2.1. Định nghĩa

**Graph Database** (Cơ sở dữ liệu đồ thị) là loại cơ sở dữ liệu sử dụng cấu trúc đồ thị để lưu trữ, ánh xạ và truy vấn các mối quan hệ. Dữ liệu được biểu diễn dưới dạng:

- **Nodes (Đỉnh):** Đại diện cho thực thể (User, Location, Category...)
- **Edges (Cạnh):** Đại diện cho quan hệ (:LIKED, :REVIEWED, :HAS_CATEGORY...)
- **Properties:** Thuộc tính của nodes và edges

### 1.2.2. So sánh với Cơ sở dữ liệu Quan hệ (RDBMS)

| Tiêu chí                  | RDBMS (MySQL, PostgreSQL) | Graph DB (Neo4j)         |
| ------------------------- | ------------------------- | ------------------------ |
| Mô hình dữ liệu           | Bảng (Tables)             | Đồ thị (Nodes, Edges)    |
| Quan hệ                   | Foreign Keys, JOIN        | Edges (trực tiếp)        |
| Truy vấn quan hệ phức tạp | Nhiều JOIN, chậm          | Nhanh (native)           |
| Schema                    | Cứng nhắc                 | Linh hoạt                |
| Use case                  | Dữ liệu có cấu trúc       | Dữ liệu quan hệ phức tạp |

### 1.2.3. Khi nào sử dụng Graph Database?

Graph Database phù hợp khi:

- Mối quan hệ giữa dữ liệu là **trọng tâm**
- Cần truy vấn **nhiều bước nhảy** (multi-hop queries)
- Dữ liệu có cấu trúc **mạng lưới** phức tạp
- Cần **linh hoạt** thay đổi schema

**Ví dụ ứng dụng:**

- Mạng xã hội (bạn bè của bạn bè)
- Hệ thống gợi ý
- Fraud detection
- Knowledge graphs

---

## 1.3. Neo4j và Cypher Query Language

### 1.3.1. Giới thiệu Neo4j

**Neo4j** là hệ quản trị cơ sở dữ liệu đồ thị phổ biến nhất thế giới, được viết bằng Java. Neo4j lưu trữ dữ liệu dưới dạng nodes và relationships, cho phép truy vấn quan hệ với tốc độ cao.

**Đặc điểm:**

- **Native Graph Storage:** Lưu trữ đồ thị gốc (không chuyển đổi)
- **ACID Transactions:** Đảm bảo tính toàn vẹn dữ liệu
- **High Performance:** Tối ưu cho truy vấn quan hệ
- **Cypher Query Language:** Ngôn ngữ truy vấn trực quan

### 1.3.2. Cypher Query Language

**Cypher** là ngôn ngữ truy vấn khai báo của Neo4j, được thiết kế trực quan và dễ đọc.

**Cú pháp cơ bản:**

```cypher
// Tạo node
CREATE (u:User {name: 'Châu Đàn', email: 'chaudan@example.com'})

// Tạo relationship
MATCH (u:User {name: 'Châu Đàn'})
MATCH (l:Location {name: 'Đại Nội'})
CREATE (u)-[:LIKED]->(l)

// Truy vấn
MATCH (u:User)-[:LIKED]->(l:Location)
RETURN u.name, l.name

// Truy vấn bước nhảy (2 hops)
MATCH (u:User)-[:LIKED]->(:Location)<-[:LIKED]-(other:User)
WHERE u <> other
RETURN DISTINCT other.name AS similar_users
```

### 1.3.3. Neo4j Graph Data Science (GDS)

**Neo4j GDS** là thư viện mở rộng cung cấp các thuật toán phân tích đồ thị và Machine Learning.

**Các nhóm thuật toán:**

- **Centrality:** PageRank, Betweenness, Closeness
- **Community Detection:** Louvain, Label Propagation
- **Path Finding:** Dijkstra, A\*
- **Similarity:** Node Similarity, Jaccard
- **Link Prediction:** Common Neighbors, Adamic Adar

---

## 1.4. Thuật toán PageRank

### 1.4.1. Lịch sử và Nguyên lý

**PageRank** là thuật toán được phát triển bởi Larry Page và Sergey Brin tại Stanford năm 1996, là nền tảng của công cụ tìm kiếm Google.

**Nguyên lý:** "Một trang web quan trọng nếu có nhiều trang quan trọng khác liên kết đến nó."

Áp dụng vào du lịch: "Một địa điểm phổ biến nếu có nhiều người dùng quan trọng tương tác với nó."

### 1.4.2. Công thức Toán học

```
PR(u) = (1-d)/N + d × Σ(PR(v) / L(v))
```

Trong đó:

- **PR(u):** PageRank của node u
- **d:** Damping factor (thường = 0.85)
- **N:** Tổng số nodes trong đồ thị
- **v:** Các nodes có edge đến u
- **L(v):** Số edges đi ra từ v

### 1.4.3. Weighted PageRank

**Weighted PageRank** là biến thể cho phép edges có trọng số khác nhau, phản ánh mức độ quan trọng của quan hệ.

**Ứng dụng trong đề tài:**

- Edge :LIKED có trọng số = 1
- Edge :REVIEWED có trọng số = rating (1-5)
- Tổng trọng số tối đa = 6 (Like + 5-star review)

```cypher
CALL gds.pageRank.write('graph', {
    writeProperty: 'pagerankScore',
    maxIterations: 20,
    dampingFactor: 0.85,
    relationshipWeightProperty: 'weight'
})
```

### 1.4.4. Tham số Điều chỉnh

| Tham số       | Giá trị   | Ý nghĩa                                       |
| ------------- | --------- | --------------------------------------------- |
| dampingFactor | 0.85-0.90 | Xác suất tiếp tục duyệt (cao = ưu tiên local) |
| maxIterations | 10-20     | Số vòng lặp tối đa                            |
| tolerance     | 0.0001    | Ngưỡng hội tụ                                 |

---

## 1.5. Thuật toán Collaborative Filtering

### 1.5.1. User-Based Collaborative Filtering

**Nguyên lý:** Tìm nhóm users có sở thích tương tự với user hiện tại, sau đó gợi ý các items mà nhóm này đã thích.

**Các bước:**

1. Xây dựng ma trận User-Item (ratings)
2. Tính độ tương đồng giữa các users (Cosine, Pearson)
3. Tìm K users tương đồng nhất
4. Dự đoán rating và gợi ý

**Công thức Cosine Similarity:**

```
sim(u, v) = (u · v) / (||u|| × ||v||)
```

### 1.5.2. Item-Based Collaborative Filtering

**Nguyên lý:** Thay vì so sánh users, ta so sánh items. Nếu user thích item A, hệ thống sẽ tìm items tương tự với A.

**Ưu điểm so với User-Based:**

- Ổn định hơn (items ít thay đổi)
- Có thể tính toán offline

### 1.5.3. Triển khai trên Graph Database

Trên Neo4j, Collaborative Filtering được triển khai dưới dạng **graph traversal**:

```cypher
// Tìm users tương tự (có địa điểm chung)
MATCH (me:User {name: $name})-[:INTERACTED]->(:Location)<-[:INTERACTED]-(other:User)
WHERE other <> me

// Lấy địa điểm họ thích mà mình chưa đi
MATCH (other)-[:INTERACTED]->(loc:Location)
WHERE NOT (me)-[:INTERACTED]->(loc)

// Đếm số users tương tự đã thích
RETURN loc.name, count(DISTINCT other) AS score
ORDER BY score DESC
```

---

## 1.6. Thuật toán Content-Based Filtering

### 1.6.1. Nguyên lý Hoạt động

**Content-Based Filtering** phân tích nội dung/đặc điểm của items để tìm items tương tự với những gì user đã thích.

**Các đặc điểm thường dùng:**

- **Text:** TF-IDF, Word Embeddings
- **Categories:** One-hot encoding
- **Metadata:** Tags, genres, attributes

### 1.6.2. Triển khai trong Đề tài

Trong Huế Travel AI, Content-Based dựa trên:

- **Category:** Di tích, Ẩm thực, Tâm linh, Thiên nhiên...
- **RELATED_TO relationship:** Liên kết địa điểm cùng category

```cypher
// Tìm địa điểm cùng category với nơi đã thích
MATCH (me:User)-[:INTERACTED]->(liked:Location)
MATCH (liked)-[:HAS_CATEGORY]->(cat:Category)<-[:HAS_CATEGORY]-(similar:Location)
WHERE NOT (me)-[:INTERACTED]->(similar)

// Cộng điểm nếu có quan hệ RELATED_TO
OPTIONAL MATCH (liked)-[r:RELATED_TO]-(similar)
RETURN similar.name, sum(1 + coalesce(r.weight, 0)) AS score
```

---

## 1.7. Thuật toán Nearest Neighbor (Láng giềng Gần nhất)

### 1.7.1. Định nghĩa

**Nearest Neighbor** là thuật toán tìm kiếm/sắp xếp dựa trên khoảng cách. Trong bài toán lập lộ trình (TSP - Traveling Salesman Problem), thuật toán Nearest Neighbor là heuristic đơn giản để tìm đường đi ngắn.

### 1.7.2. Thuật toán Greedy Nearest Neighbor

```
1. Chọn điểm bắt đầu (điểm có score cao nhất)
2. Lặp lại cho đến khi hết điểm:
   a. Từ vị trí hiện tại, tìm điểm CHƯA ĐI và GẦN NHẤT
   b. Di chuyển đến điểm đó
   c. Đánh dấu đã đi
3. Trả về lộ trình
```

### 1.7.3. Độ phức tạp

- **Time Complexity:** O(n²)
- **Space Complexity:** O(n)
- **Độ chính xác:** ~75-95% so với tối ưu (cho bài toán nhỏ)

### 1.7.4. Ứng dụng trong AI Planner

```python
def pop_nearest(current_location, pool):
    """Lấy địa điểm gần nhất từ pool"""
    if not current_location:
        return pool.pop(0)  # Đầu ngày: lấy điểm hot nhất

    min_dist = float('inf')
    nearest_idx = 0

    for i, loc in enumerate(pool):
        d = (current.lat - loc.lat)**2 + (current.lng - loc.lng)**2
        if d < min_dist:
            min_dist = d
            nearest_idx = i

    return pool.pop(nearest_idx)
```

---

## 1.8. Các Công nghệ Liên quan

### 1.8.1. Flask Framework

**Flask** là micro web framework cho Python, được thiết kế đơn giản và linh hoạt.

**Đặc điểm:**

- Lightweight, không có sẵn ORM hoặc form validation
- Dễ dàng mở rộng với extensions
- Phù hợp cho API và ứng dụng nhỏ-vừa

**So sánh với Django:**

| Tiêu chí          | Flask          | Django     |
| ----------------- | -------------- | ---------- |
| Kiến trúc         | Microframework | Full-stack |
| Learning curve    | Dễ             | Trung bình |
| Tính linh hoạt    | Cao            | Trung bình |
| Built-in features | Ít             | Nhiều      |

### 1.8.2. Leaflet.js

**Leaflet** là thư viện JavaScript mã nguồn mở để tạo bản đồ tương tác trên web.

**Ưu điểm:**

- Nhẹ (~42KB gzipped)
- API đơn giản, dễ sử dụng
- Hỗ trợ mobile
- Nhiều plugins (heatmap, clustering, routing...)

### 1.8.3. OpenStreetMap

**OpenStreetMap (OSM)** là dự án bản đồ mã nguồn mở, được xây dựng bởi cộng đồng. Trong đề tài, OSM được sử dụng làm tile layer cho Leaflet.js.

---

## 1.9. Kết luận Chương

Chương này đã trình bày các cơ sở lý thuyết quan trọng:

1. **Hệ thống Gợi ý:** Phân loại (Content-Based, Collaborative Filtering, Hybrid) và nguyên lý hoạt động.

2. **Graph Database:** Định nghĩa, so sánh với RDBMS, và khi nào nên sử dụng.

3. **Neo4j và Cypher:** Giới thiệu hệ quản trị CSDL đồ thị và ngôn ngữ truy vấn.

4. **Thuật toán PageRank:** Nguyên lý, công thức và biến thể Weighted PageRank.

5. **Collaborative Filtering:** User-Based và triển khai trên Graph DB.

6. **Content-Based Filtering:** Lọc theo nội dung và category.

7. **Nearest Neighbor:** Thuật toán tối ưu lộ trình.

8. **Công nghệ liên quan:** Flask, Leaflet.js, OpenStreetMap.

Các kiến thức này là nền tảng để xây dựng hệ thống Huế Travel AI được trình bày ở các chương tiếp theo.
