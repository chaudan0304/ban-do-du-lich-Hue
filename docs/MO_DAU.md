# PHẦN MỞ ĐẦU

## 1. Lý do chọn đề tài

1. **Tiềm năng du lịch lớn:** Thừa Thiên Huế sở hữu hệ thống di sản văn hóa thế giới phong phú, năm 2024 đón hơn 4 triệu lượt khách (tăng 25% so với năm trước) [2], tạo ra nhu cầu cấp thiết về công cụ hỗ trợ du lịch thông minh.

2. **Khó khăn thực tế của du khách:** Du khách — đặc biệt khách lần đầu — gặp nhiều trở ngại khi đến Huế: khó lựa chọn địa điểm phù hợp giữa hàng trăm di tích, đền chùa, quán ăn; đồng thời lúng túng trong việc sắp xếp lộ trình tối ưu, dẫn đến di chuyển lòng vòng, lãng phí thời gian và chi phí.

3. **Hạn chế của các nền tảng hiện có:** Các công cụ du lịch phổ biến (Google Maps, TripAdvisor) chỉ đưa ra gợi ý chung cho tất cả đối tượng, chưa thực sự cá nhân hóa dựa trên hành vi và sở thích riêng biệt của từng người dùng.

4. **Thiếu vắng ứng dụng công nghệ hiện đại trong gợi ý du lịch:** Hiện tại, tại Việt Nam chưa có nhiều hệ thống khai thác cơ sở dữ liệu đồ thị (Graph Database) và các thuật toán Hybrid Recommendation (PageRank, Collaborative Filtering, Content-Based Filtering) để xây dựng hệ thống gợi ý du lịch cá nhân hóa, mặc dù đây là hướng tiếp cận đã được chứng minh hiệu quả trong nhiều nghiên cứu quốc tế.

Xuất phát từ những lý do trên, tác giả đã chọn đề tài:

> **"XÂY DỰNG HỆ THỐNG GỢI Ý DU LỊCH THÔNG MINH CHO THÀNH PHỐ HUẾ SỬ DỤNG GRAPH DATABASE VÀ THUẬT TOÁN HYBRID RECOMMENDATION"**

## 2. Mục tiêu đề tài

- Xây dựng cơ sở dữ liệu đồ thị (Neo4j) mô hình hóa quan hệ giữa người dùng, địa điểm và danh mục du lịch tại Huế.
- Cài đặt và tích hợp thuật toán Hybrid Recommendation gồm: Weighted PageRank, User-Based Collaborative Filtering (Jaccard Similarity), Content-Based Filtering với chiến lược trọng số thích ứng (Adaptive Weighting).
- Phát triển ứng dụng web hiển thị bản đồ tương tác (Leaflet.js), tích hợp hệ thống gợi ý cá nhân hóa, đánh giá–bình luận và tính năng phụ trợ sắp xếp lộ trình (AI Planner).

## 3. Nội dung nghiên cứu

- Nghiên cứu cơ sở lý thuyết về Recommendation System, Graph Database và các thuật toán liên quan (PageRank, Collaborative Filtering, Content-Based Filtering).
- Phân tích yêu cầu, thiết kế kiến trúc 3 tầng, lược đồ Graph Schema và RESTful API.
- Xây dựng cơ sở dữ liệu đồ thị Neo4j, thu thập và chuẩn hóa dữ liệu địa điểm du lịch Huế.
- Cài đặt các thuật toán lõi: Weighted PageRank, Collaborative Filtering, Content-Based Filtering và mô hình kết hợp Adaptive Hybrid — đây là trọng tâm của khóa luận.
- Phát triển ứng dụng web thực nghiệm, tích hợp hệ thống gợi ý và bổ sung tính năng phụ trợ lập lộ trình.
- Kiểm thử và đánh giá hiệu năng hệ thống, tính chính xác và đa dạng của các thuật toán gợi ý.

## 4. Ý nghĩa đề tài

### 4.1. Ý nghĩa khoa học

- Đề xuất mô hình **Hybrid Recommendation trên Graph Database** kết hợp 3 thuật toán: Weighted PageRank, Collaborative Filtering và Content-Based Filtering — phù hợp cho bài toán gợi ý du lịch.
- Đề xuất giải pháp **PageRank Diversity Pool** giải quyết vấn đề bẫy bong bóng lọc (Filter Bubble) trong hệ thống gợi ý.
- Đóng góp mô hình triển khai Recommendation System trên Neo4j Graph Data Science, có thể tái sử dụng cho các bài toán tương tự.

### 4.2. Ý nghĩa thực tiễn

- Hỗ trợ du khách lập kế hoạch du lịch Huế hiệu quả, tiết kiệm thời gian lựa chọn địa điểm và di chuyển.
- Nâng cao trải nghiệm du lịch với gợi ý cá nhân hóa và lộ trình tối ưu.
- Cung cấp nền tảng mã nguồn mở có thể mở rộng, áp dụng cho các địa phương du lịch khác trên toàn quốc.

## 8. Bố cục khóa luận

Ngoài phần Mở đầu, Kết luận và Tài liệu tham khảo, khóa luận được trình bày trong 3 chương và 2 phụ lục:

**Chương 1 — Cơ sở Lý thuyết:** Tổng quan tình hình nghiên cứu. Trình bày lý thuyết về Hệ thống Gợi ý và các phương pháp (Content-Based, Collaborative Filtering, Hybrid). Giới thiệu Graph Database, Neo4j, thuật toán đồ thị. Phân tích các thuật toán lõi hệ thống: Weighted PageRank, Collaborative Filtering (Jaccard Similarity) và cơ sở lý thuyết tổng quan cho tính năng lập lộ trình bổ sung. Trình bày các công nghệ nền tảng.

**Chương 2 — Phân tích và Thiết kế Hệ thống:** Phân tích sơ bộ yêu cầu chức năng. Thiết kế kiến trúc hệ thống 3 tầng, lược đồ cơ sở dữ liệu đồ thị (Graph Schema) và RESTful API. Thiết kế giao diện và mô hình kết hợp các thuật toán Hybrid Recommendation.

**Chương 3 — Xây dựng Ứng dụng Web và Tích hợp Hệ Khuyến nghị:** Môi trường và công cụ phát triển. Triển khai cơ sở dữ liệu đồ thị Neo4j. Triển khai cấu trúc mã nguồn các thuật toán gợi ý trọng tâm (Weighted PageRank, Collaborative Filtering, Content-Based Filtering, Adaptive Hybrid). Triển khai ứng dụng web trực quan, bổ sung tính năng phụ trợ xếp lộ trình và demo giao diện website.

**Phụ lục A — Hướng dẫn Cài đặt và Triển khai:** Chi tiết các bước cài đặt môi trường, cấu hình Neo4j, nạp dữ liệu và khởi chạy ứng dụng.

**Phụ lục B — Hướng dẫn Sử dụng:** Hướng dẫn chi tiết các chức năng dành cho người dùng và quản trị viên.
