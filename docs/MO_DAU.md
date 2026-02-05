# MỞ ĐẦU

## 1. Lý do Chọn Đề tài

Trong bối cảnh ngành du lịch Việt Nam đang phục hồi mạnh mẽ sau đại dịch COVID-19, Thừa Thiên Huế là một trong những điểm đến hấp dẫn nhất miền Trung với hệ thống di sản văn hóa thế giới phong phú. Theo thống kê của Sở Du lịch tỉnh Thừa Thiên Huế, năm 2024 tỉnh đón hơn 4 triệu lượt khách, tăng 25% so với năm trước.

Tuy nhiên, du khách thường gặp khó khăn trong việc:

- **Lựa chọn địa điểm:** Với hàng trăm di tích, đền chùa, địa điểm ẩm thực, du khách không biết nên đi đâu phù hợp với sở thích.
- **Lập lộ trình:** Khó tối ưu hóa quãng đường di chuyển giữa các địa điểm.
- **Cá nhân hóa:** Các nền tảng du lịch hiện tại chưa gợi ý dựa trên hành vi và sở thích cá nhân.

**Hệ thống gợi ý (Recommendation System)** là giải pháp hiệu quả cho bài toán này. Đặc biệt, **Graph Database** với khả năng mô hình hóa quan hệ phức tạp giữa người dùng, địa điểm và danh mục, kết hợp với các thuật toán như **PageRank** và **Collaborative Filtering**, có thể đưa ra những gợi ý cá nhân hóa chính xác.

Xuất phát từ những lý do trên, tôi đã chọn đề tài:

> **"XÂY DỰNG HỆ THỐNG GỢI Ý DU LỊCH THÔNG MINH CHO THÀNH PHỐ HUẾ SỬ DỤNG GRAPH DATABASE VÀ THUẬT TOÁN HYBRID RECOMMENDATION"**

---

## 2. Mục tiêu Đề tài

### 2.1. Mục tiêu Tổng quát

Xây dựng một hệ thống web gợi ý du lịch thông minh cho thành phố Huế, sử dụng công nghệ Graph Database và các thuật toán Machine Learning để đưa ra gợi ý cá nhân hóa cho du khách.

### 2.2. Mục tiêu Cụ thể

1. **Xây dựng cơ sở dữ liệu đồ thị (Graph Database):**
   - Mô hình hóa quan hệ giữa người dùng, địa điểm du lịch và danh mục
   - Sử dụng Neo4j để lưu trữ và truy vấn hiệu quả

2. **Triển khai thuật toán Hybrid Recommendation:**
   - Weighted PageRank để đánh giá độ phổ biến địa điểm
   - Collaborative Filtering để gợi ý dựa trên người dùng tương tự
   - Content-Based Filtering để gợi ý theo nội dung

3. **Xây dựng tính năng AI Planner:**
   - Tự động lập lộ trình du lịch theo số ngày
   - Tối ưu hóa quãng đường di chuyển bằng thuật toán Nearest Neighbor

4. **Phát triển giao diện web hiện đại:**
   - Bản đồ tương tác với Leaflet.js
   - Hệ thống đánh giá và bình luận
   - Bản đồ nhiệt (Heatmap) hiển thị độ phổ biến

---

## 3. Đối tượng và Phạm vi Nghiên cứu

### 3.1. Đối tượng Nghiên cứu

- Các thuật toán gợi ý: PageRank, Collaborative Filtering, Content-Based Filtering
- Cơ sở dữ liệu đồ thị Neo4j và Neo4j Graph Data Science
- Các địa điểm du lịch tại thành phố Huế

### 3.2. Phạm vi Nghiên cứu

- **Phạm vi không gian:** Các địa điểm du lịch thuộc địa bàn thành phố Huế và vùng phụ cận (Lăng tẩm, bãi biển...)
- **Phạm vi thời gian:** Thực hiện từ tháng 10/2025 đến tháng 02/2026
- **Phạm vi nội dung:**
  - Xây dựng hệ thống gợi ý du lịch
  - Triển khai thuật toán AI
  - Không bao gồm đặt phòng khách sạn, vé máy bay

---

## 4. Phương pháp Nghiên cứu

### 4.1. Phương pháp Thu thập Dữ liệu

- Thu thập thông tin địa điểm từ các nguồn: Website du lịch Huế, Google Maps, TripAdvisor
- Tổng hợp và chuẩn hóa dữ liệu vào file Excel
- Import vào Neo4j Graph Database

### 4.2. Phương pháp Phân tích và Thiết kế

- Phân tích yêu cầu hệ thống (Use Case Diagram)
- Thiết kế kiến trúc hệ thống (Architecture Diagram)
- Thiết kế cơ sở dữ liệu đồ thị (Graph Schema)

### 4.3. Phương pháp Triển khai

- Sử dụng phương pháp phát triển Agile
- Triển khai từng module độc lập
- Test và đánh giá liên tục

---

## 5. Ý nghĩa Khoa học và Thực tiễn

### 5.1. Ý nghĩa Khoa học

- Áp dụng Graph Database vào bài toán gợi ý du lịch
- Kết hợp nhiều thuật toán (Hybrid) để tăng độ chính xác gợi ý
- Đóng góp mô hình triển khai Recommendation System trên Neo4j

### 5.2. Ý nghĩa Thực tiễn

- Hỗ trợ du khách lập kế hoạch du lịch Huế hiệu quả
- Giảm thời gian tìm kiếm và lựa chọn địa điểm
- Tối ưu hóa trải nghiệm du lịch với lộ trình hợp lý
- Có thể mở rộng cho các địa phương du lịch khác

---

## 6. Bố cục Khóa luận

Khóa luận được trình bày trong 4 chương:

**Mở đầu:** Giới thiệu lý do chọn đề tài, mục tiêu, phạm vi và phương pháp nghiên cứu.

**Chương 1 - Cơ sở Lý thuyết:** Trình bày các khái niệm về Graph Database, Neo4j, các thuật toán Recommendation System (PageRank, Collaborative Filtering, Content-Based Filtering).

**Chương 2 - Phân tích và Thiết kế Hệ thống:** Phân tích yêu cầu, thiết kế kiến trúc, mô hình dữ liệu và giao diện hệ thống.

**Chương 3 - Triển khai và Cài đặt:** Chi tiết quá trình triển khai backend, frontend, các thuật toán AI và hướng dẫn cài đặt.

**Chương 4 - Kết quả và Đánh giá:** Trình bày kết quả thử nghiệm thuật toán, đánh giá hiệu năng và phản hồi người dùng.

**Kết luận:** Tổng kết kết quả đạt được, hạn chế và hướng phát triển.
