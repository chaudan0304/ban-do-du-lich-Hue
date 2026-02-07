# KẾT LUẬN

## 1. Kết quả Đạt được

Sau quá trình nghiên cứu và triển khai, khóa luận đã hoàn thành các mục tiêu đề ra:

### 1.1. Về Mặt Lý thuyết

- Nghiên cứu và tổng hợp kiến thức về **Graph Database** và ứng dụng trong hệ thống gợi ý.
- Tìm hiểu các thuật toán **Recommendation System**: PageRank, Collaborative Filtering, Content-Based Filtering và cách kết hợp Hybrid.
- Phân tích ưu nhược điểm của từng phương pháp và đề xuất giải pháp phù hợp cho bài toán du lịch.

### 1.2. Về Mặt Thực tiễn

**Hệ thống Huế Travel AI đã được xây dựng hoàn chỉnh với:**

1. **Cơ sở dữ liệu đồ thị Neo4j:**
   - Mô hình hóa 52 địa điểm du lịch Huế
   - 25+ người dùng thử nghiệm
   - 180+ lượt tương tác (Like, Review)
   - 8 danh mục địa điểm

2. **Thuật toán Hybrid Recommendation:**
   - Weighted PageRank đánh giá độ phổ biến với trọng số tương tác
   - Collaborative Filtering gợi ý dựa trên người dùng tương tự
   - Content-Based Filtering gợi ý theo nội dung/danh mục
   - Kết hợp 3 phương pháp với trọng số tối ưu
   - **Chiến lược Trọng số Thích nghi:** Đề xuất và áp dụng thành công mô hình trọng số động (60-30-10) giải quyết bài toán Cold Start, được kiểm chứng qua dữ liệu thực tế và cơ sở khoa học.

3. **AI Itinerary Planner:**
   - Tự động lập lộ trình 1-5 ngày
   - Thuật toán Nearest Neighbor tối ưu quãng đường (giảm 47%)
   - Phân bổ hợp lý các hoạt động trong ngày

4. **Giao diện web hiện đại:**
   - Bản đồ tương tác với Leaflet.js
   - Heatmap hiển thị độ phổ biến
   - Responsive design cho mobile và desktop
   - 18 API endpoints hoạt động ổn định

### 1.3. Kết quả Đánh giá

| Tiêu chí                  | Kết quả           |
| ------------------------- | ----------------- |
| Unit Tests                | 14/14 PASS (100%) |
| Thời gian phản hồi API    | < 500ms           |
| Thời gian chạy thuật toán | ~7 giây           |
| Điểm đánh giá người dùng  | 4.2/5             |
| Tỷ lệ muốn sử dụng        | 90%               |

---

## 2. Ưu điểm của Hệ thống

1. **Gợi ý cá nhân hóa:** Sử dụng Hybrid Recommendation kết hợp 3 phương pháp, đưa ra gợi ý chính xác theo sở thích của từng người dùng.

2. **Graph Database:** Neo4j xử lý quan hệ phức tạp hiệu quả, truy vấn nhanh qua nhiều bước nhảy (multi-hop).

3. **Tối ưu lộ trình:** Thuật toán Nearest Neighbor giảm đáng kể quãng đường di chuyển.

4. **Kiến trúc mở rộng:** Flask Blueprints và code modular dễ dàng thêm tính năng mới.

5. **Giao diện thân thiện:** Thiết kế hiện đại, dễ sử dụng cho mọi đối tượng.

6. **Open Source:** Toàn bộ mã nguồn có thể mở rộng và tùy chỉnh.

---

## 3. Hạn chế

1. **Dữ liệu hạn chế:** Số lượng địa điểm (52) và người dùng (25) còn ít, ảnh hưởng đến độ chính xác của Collaborative Filtering.

2. **Cold Start Problem:** Gợi ý cho người dùng mới chưa có lịch sử tương tác chưa tối ưu, chủ yếu dựa vào PageRank global.

3. **Thiếu GPS real-time:** Chưa tích hợp định vị GPS để gợi ý địa điểm gần vị trí hiện tại.

4. **Chưa có mobile app:** Hệ thống hoạt động trên web browser, chưa có ứng dụng native cho iOS/Android.

5. **Sentiment Analysis đơn giản:** Phân tích cảm xúc trong đánh giá còn cơ bản, chưa sử dụng NLP nâng cao.

---

## 4. Hướng Phát triển

### 4.1. Ngắn hạn (3-6 tháng)

1. **Mở rộng dữ liệu:**
   - Thu thập thêm địa điểm (mục tiêu 200+)
   - Thu hút người dùng thực tế
   - Tích hợp dữ liệu từ Google Places API

2. **Cải thiện Cold Start:**
   - Hỏi sở thích khi đăng ký
   - Sử dụng demographic-based filtering
   - Knowledge-based recommendation

3. **Bảo mật nâng cao:**
   - Rate Limiting chống brute force
   - CSRF Protection
   - API authentication (JWT)

### 4.2. Trung hạn (6-12 tháng)

1. **Mobile Application:**
   - Phát triển ứng dụng React Native
   - GPS real-time và thông báo location-based
   - Offline mode

2. **NLP nâng cao:**
   - Sentiment Analysis với PhoBERT
   - Trích xuất keywords từ reviews
   - Chatbot hỗ trợ du khách

3. **Tích hợp dịch vụ:**
   - Đặt vé tham quan
   - Booking khách sạn (Agoda, Booking.com)
   - Gọi taxi (Grab, GoViet)

### 4.3. Dài hạn (1-2 năm)

1. **Mở rộng địa lý:**
   - Hỗ trợ các tỉnh thành khác (Đà Nẵng, Hội An, Nha Trang...)
   - Hệ thống multi-tenant

2. **Machine Learning nâng cao:**
   - Deep Learning Recommendation (Matrix Factorization)
   - Graph Neural Networks (GNN)
   - Reinforcement Learning cho dynamic recommendations

3. **B2B Platform:**
   - API cho các đối tác du lịch
   - Dashboard phân tích cho cơ quan quản lý
   - Monetization qua quảng cáo địa điểm

---

## 5. Đóng góp của Khóa luận

### 5.1. Đóng góp Khoa học

1. Đề xuất mô hình **Hybrid Recommendation** trên **Graph Database** phù hợp cho bài toán du lịch.

2. Kết hợp **Weighted PageRank** với trọng số tương tác (Like + Rating) để đánh giá độ phổ biến chính xác hơn.

3. Triển khai **Neo4j Graph Data Science** cho hệ thống gợi ý thực tế.

### 5.2. Đóng góp Thực tiễn

1. Hệ thống **Huế Travel AI** hoàn chỉnh, có thể triển khai thực tế.

2. **Mã nguồn mở** trên GitHub, cộng đồng có thể sử dụng và phát triển.

3. **Tài liệu hướng dẫn** cài đặt và sử dụng chi tiết.

---

## 6. Lời Kết

Khóa luận đã hoàn thành mục tiêu xây dựng **Hệ thống Gợi ý Du lịch Thông minh cho Thành phố Huế** sử dụng Graph Database và Hybrid Recommendation.

Hệ thống không chỉ giải quyết bài toán "Đi đâu, chơi gì?" tại Huế mà còn mở ra hướng phát triển ứng dụng công nghệ AI và Graph Database vào lĩnh vực du lịch Việt Nam.

Với nền tảng đã xây dựng, hệ thống có tiềm năng mở rộng thành một nền tảng du lịch thông minh quy mô lớn, đóng góp vào sự phát triển của ngành du lịch Thừa Thiên Huế nói riêng và Việt Nam nói chung.

---

**Huế, tháng 02 năm 2026**

**Sinh viên thực hiện**

_Châu Đàn_
