# PHẦN MỞ ĐẦU

## 1. Lý do chọn đề tài

Trong bối cảnh ngành du lịch Việt Nam đang phục hồi mạnh mẽ sau đại dịch COVID-19, Thừa Thiên Huế là một trong những điểm đến hấp dẫn nhất miền Trung với hệ thống di sản văn hóa thế giới phong phú. Theo thống kê của Sở Du lịch tỉnh Thừa Thiên Huế, năm 2024 tỉnh đón hơn 4 triệu lượt khách, tăng 25% so với năm trước [2].

Tuy nhiên, du khách thường gặp những khó khăn nhất định trong quá trình trải nghiệm du lịch tại Huế:

- **Khó khăn trong lựa chọn địa điểm:** Với hàng trăm di tích, đền chùa, quán ăn và địa điểm giải trí, du khách — đặc biệt là khách lần đầu — không biết nên ưu tiên tham quan ở đâu cho phù hợp với sở thích và quỹ thời gian.
- **Khó khăn trong lập lộ trình:** Du khách thường di chuyển lòng vòng, không tối ưu hóa được quãng đường giữa các địa điểm, gây lãng phí thời gian và chi phí.
- **Thiếu cá nhân hóa:** Các nền tảng du lịch phổ biến hiện tại (Google Maps, TripAdvisor) đưa ra gợi ý chung cho tất cả đối tượng, chưa thực sự cá nhân hóa dựa trên hành vi và sở thích riêng biệt của từng người dùng.

**Hệ thống gợi ý (Recommendation System)** là giải pháp hiệu quả cho những bài toán trên. Đặc biệt, **cơ sở dữ liệu đồ thị (Graph Database)** với khả năng mô hình hóa tự nhiên các mối quan hệ phức tạp giữa người dùng, địa điểm và danh mục, kết hợp với các thuật toán phân tích đồ thị như **PageRank** và **Collaborative Filtering**, có thể đưa ra những gợi ý cá nhân hóa chính xác và hiệu quả.

Xuất phát từ những lý do trên, tác giả đã chọn đề tài:

> **"XÂY DỰNG HỆ THỐNG GỢI Ý DU LỊCH THÔNG MINH CHO THÀNH PHỐ HUẾ SỬ DỤNG GRAPH DATABASE VÀ THUẬT TOÁN HYBRID RECOMMENDATION"**

## 2. Mục tiêu nghiên cứu

### 2.1. Mục tiêu tổng quát

Xây dựng một hệ thống web gợi ý du lịch thông minh cho thành phố Huế, sử dụng công nghệ Graph Database (Neo4j) và các thuật toán Hybrid Recommendation để đưa ra gợi ý cá nhân hóa, giúp du khách lựa chọn địa điểm phù hợp và lập lộ trình tham quan tối ưu.

### 2.2. Mục tiêu cụ thể

1. **Xây dựng cơ sở dữ liệu đồ thị (Graph Database):**
   - Mô hình hóa quan hệ giữa người dùng, địa điểm du lịch và danh mục dưới dạng đồ thị trên Neo4j.
   - Thiết kế lược đồ dữ liệu (Graph Schema) gồm các node và relationship phù hợp với bài toán gợi ý.

2. **Triển khai thuật toán Hybrid Recommendation:**
   - Weighted PageRank (trên 2 đồ thị riêng biệt: User–Location và Location–Location) để đánh giá độ phổ biến và độ kết nối của địa điểm.
   - Collaborative Filtering (User-Based) với Jaccard Similarity để gợi ý dựa trên người dùng có sở thích tương tự.
   - Content-Based Filtering để gợi ý theo danh mục sở thích.
   - Kết hợp 3 phương pháp trên với chiến lược trọng số thích ứng (Adaptive Weighting).

3. **Xây dựng tính năng AI Planner (Lập lộ trình thông minh):**
   - Tự động lập lộ trình du lịch theo số ngày (1–5 ngày), phân bổ hoạt động tham quan và ẩm thực xen kẽ.
   - Tối ưu hóa quãng đường di chuyển bằng thuật toán Nearest Neighbor (Greedy TSP).

4. **Phát triển giao diện web hiện đại và trực quan:**
   - Bản đồ tương tác với Leaflet.js hiển thị vị trí địa điểm.
   - Hệ thống đánh giá, bình luận và yêu thích.
   - Bản đồ nhiệt (Heatmap) hiển thị mật độ phổ biến địa điểm.
   - Dashboard quản trị cho phép quản lý nội dung và chạy thuật toán.

## 3. Nội dung nghiên cứu

Nội dung nghiên cứu chính của đề tài bao gồm:
- Khảo sát và phân tích các nền tảng lý thuyết về hệ thống gợi ý (Recommendation System) và cơ sở dữ liệu đồ thị (Graph Database).
- Phân tích yêu cầu, thiết kế kiến trúc và mô hình dữ liệu cho hệ thống gợi ý du lịch thông minh tại thành phố Huế.
- Xây dựng cơ sở dữ liệu đồ thị, ứng dụng Neo4j để lưu trữ, tổ chức dữ liệu các địa điểm du lịch và lịch sử tương tác của người dùng.
- Cài đặt và tích hợp các thuật toán lõi của hệ thống: thuật toán lọc cộng tác (Collaborative Filtering), lọc theo nội dung (Content-Based Filtering), thuật toán lai (Hybrid Recommendation) và PageRank.
- Xây dựng tính năng lập lộ trình tự động bằng thuật toán Nearest Neighbor.
- Phát triển ứng dụng web, tích hợp các mô hình đã cài đặt, tiến hành kiểm thử và đánh giá hiệu năng của hệ thống và thuật toán.

## 4. Đối tượng nghiên cứu

- Các thuật toán gợi ý: PageRank, Collaborative Filtering, Content-Based Filtering và phương pháp lai (Hybrid).
- Cơ sở dữ liệu đồ thị Neo4j và thư viện Neo4j Graph Data Science (GDS).
- Đặc điểm và thông tin của các địa điểm du lịch tiêu biểu tại thành phố Huế và vùng phụ cận.
- Hành vi tương tác của người dùng (user interactions) đối với các địa điểm du lịch trong hệ thống.

## 5. Phương hướng nghiên cứu

### 5.1. Phương pháp nghiên cứu lý thuyết

- Nghiên cứu tài liệu, sách chuyên khảo và các bài báo khoa học về hệ thống gợi ý, Graph Database và các thuật toán liên quan [4]–[12].
- Phân tích, so sánh ưu nhược điểm của các phương pháp gợi ý để lựa chọn hướng tiếp cận phù hợp.
- Tham khảo tài liệu kỹ thuật chính thức của Neo4j [15], [16] và Flask [17].

### 5.2. Phương pháp thu thập dữ liệu

- Thu thập thông tin địa điểm du lịch từ các nguồn: Website Sở Du lịch Thừa Thiên Huế, Google Maps, TripAdvisor.
- Tổng hợp, chuẩn hóa dữ liệu (tên, tọa độ, mô tả, hình ảnh, danh mục) vào file Excel.
- Import dữ liệu vào Neo4j Graph Database thông qua script tự động.

### 5.3. Phương pháp phân tích và thiết kế

- Phân tích yêu cầu hệ thống (Use Case Diagram).
- Thiết kế kiến trúc hệ thống theo mô hình phân lớp (Layered Architecture).
- Thiết kế lược đồ cơ sở dữ liệu đồ thị (Graph Schema).
- Thiết kế giao diện (Wireframe) và luồng thuật toán (Flowchart).

### 5.4. Phương pháp triển khai và đánh giá

- Sử dụng phương pháp phát triển phần mềm Agile, triển khai từng module độc lập.
- Kiểm thử đơn vị (Unit Testing) cho các module chính.
- Đánh giá hiệu năng hệ thống qua thời gian phản hồi API.
- Đánh giá chấp nhận người dùng (User Acceptance Testing) thông qua khảo sát thực tế.

## 6. Phạm vi đề tài

- **Phạm vi không gian:** Các địa điểm du lịch thuộc địa bàn thành phố Huế và vùng phụ cận (bao gồm lăng tẩm, bãi biển, làng nghề truyền thống...).
- **Phạm vi thời gian:** Thực hiện từ tháng 10/2025 đến tháng 02/2026.
- Việc xây dựng hệ thống tập trung vào gợi ý địa điểm tham quan và lập lộ trình, **không bao gồm** các tính năng giao dịch như đặt phòng khách sạn, vé máy bay hay thanh toán trực tuyến.

## 7. Ý nghĩa khoa học và thực tiễn

### 7.1. Ý nghĩa khoa học

- Đề xuất mô hình **Hybrid Recommendation trên Graph Database** phù hợp cho bài toán gợi ý du lịch, kết hợp 3 thuật toán: Weighted PageRank, Collaborative Filtering (Jaccard Similarity) và Content-Based Filtering.
- Đề xuất giải pháp **PageRank Diversity Pool** giải quyết vấn đề bẫy bong bóng lọc (Filter Bubble) trong hệ thống gợi ý.
- Đóng góp mô hình triển khai Recommendation System trên nền tảng Neo4j Graph Data Science, có thể tái sử dụng cho các bài toán tương tự.

### 7.2. Ý nghĩa thực tiễn

- Hỗ trợ du khách lập kế hoạch du lịch Huế hiệu quả, tiết kiệm thời gian lựa chọn địa điểm và di chuyển.
- Tối ưu hóa trải nghiệm du lịch với lộ trình đi lại hợp lý, xen kẽ tham quan và ẩm thực.
- Cung cấp nền tảng mã nguồn mở có thể mở rộng và áp dụng cho các địa phương du lịch khác trên toàn quốc.

## 8. Bố cục khóa luận

Ngoài phần Mở đầu, Kết luận và Tài liệu tham khảo, khóa luận được trình bày trong 4 chương và 2 phụ lục:

**Chương 1 — Cơ sở Lý thuyết:** Tổng quan tình hình nghiên cứu trong và ngoài nước. Trình bày lý thuyết về Hệ thống Gợi ý và các phương pháp (Content-Based, Collaborative Filtering, Hybrid). Giới thiệu Graph Database, Neo4j, Cypher Query Language. Phân tích các thuật toán: Weighted PageRank, Collaborative Filtering (Jaccard Similarity), Nearest Neighbor. Trình bày các công nghệ nền tảng (Flask, Leaflet.js, OpenStreetMap).

**Chương 2 — Phân tích và Thiết kế Hệ thống:** Phân tích yêu cầu chức năng và phi chức năng. Biểu đồ Use Case. Thiết kế kiến trúc hệ thống 3 tầng (Presentation – Business – Data). Thiết kế lược đồ cơ sở dữ liệu đồ thị (Graph Schema). Thiết kế RESTful API. Wireframe giao diện. Flowchart thuật toán Hybrid Recommendation và AI Planner.

**Chương 3 — Triển khai Hệ thống:** Môi trường và công cụ phát triển. Cấu trúc tổ chức mã nguồn. Triển khai cơ sở dữ liệu đồ thị Neo4j. Triển khai chi tiết các thuật toán gợi ý lai (Weighted PageRank, Collaborative Filtering với Node Similarity, Content-Based Filtering, Adaptive Hybrid Weighting, Explainable AI). Triển khai ứng dụng web (Flask Blueprints, Leaflet.js). Triển khai module AI Planner (Nearest Neighbor).

**Chương 4 — Kết quả và Đánh giá:** Kết quả triển khai giao diện. Kết quả thử nghiệm từng thuật toán (PageRank, Collaborative Filtering, Content-Based, Hybrid, Diversity Pool). Kết quả AI Planner. Đánh giá hiệu năng hệ thống. Kết quả kiểm thử đơn vị (Unit Tests). So sánh với các hệ thống tương tự. Đánh giá chấp nhận người dùng (User Acceptance Testing).

**Phụ lục A — Hướng dẫn Cài đặt và Triển khai:** Chi tiết các bước cài đặt môi trường, cấu hình Neo4j, nạp dữ liệu và khởi chạy ứng dụng.

**Phụ lục B — Hướng dẫn Sử dụng:** Hướng dẫn chi tiết các chức năng dành cho người dùng và quản trị viên.
