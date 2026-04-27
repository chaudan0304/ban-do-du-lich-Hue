# KẾT LUẬN

## 1. Tổng kết Kết quả

Khóa luận đã hoàn thành mục tiêu xây dựng **Hệ thống Gợi ý Du lịch Thông minh cho Thành phố Huế sử dụng Graph Database và Thuật toán Hybrid Recommendation**. Các kết quả chính đạt được bao gồm:

### 1.1. Về mặt lý thuyết

- Nghiên cứu và tổng hợp có hệ thống kiến thức về **cơ sở dữ liệu đồ thị (Graph Database)** và ứng dụng trong bài toán hệ thống gợi ý du lịch.
- Phân tích đầy đủ 3 phương pháp xây dựng hệ thống gợi ý: Content-Based Filtering, Collaborative Filtering và Hybrid Approach — cùng ưu nhược điểm và điều kiện áp dụng.
- Đề xuất mô hình kết hợp **Weighted PageRank + Collaborative Filtering (Jaccard) + Content-Based Filtering** trên nền tảng Neo4j, giải quyết đồng thời bài toán Cold Start và Filter Bubble.

### 1.2. Về mặt thực tiễn

Hệ thống **Huế Travel AI** đã được xây dựng hoàn chỉnh và hoạt động ổn định:

1. **Cơ sở dữ liệu đồ thị Neo4j:**
   - Mô hình hóa 52 địa điểm du lịch Huế thuộc 8 danh mục.
   - 25 người dùng thử nghiệm với 180+ lượt Like và 120+ lượt Review.
   - Lược đồ đồ thị gồm 5 loại node và 9 loại relationship (bao gồm SIMILAR_TO và LOC_SIMILAR do thuật toán tạo ra).

2. **Thuật toán Hybrid Recommendation (pipeline 4 bước):**
   - **Weighted PageRank** trên 2 đồ thị riêng biệt (User–Location và Location–Location) đánh giá chính xác độ phổ biến và độ kết nối.
   - **Collaborative Filtering** với Node Similarity (Jaccard Index) gợi ý dựa trên người dùng tương đồng.
   - **Content-Based Filtering** gợi ý theo danh mục sở thích.
   - **Chiến lược trọng số thích ứng (60-30-10)** giải quyết Cold Start.
   - **PageRank Diversity Pool** (Bước 2.5) giải quyết Filter Bubble — tăng kết quả từ 3 lên 15 địa điểm đa dạng.
   - **Explainable AI** giải thích lý do từng gợi ý.

3. **AI Itinerary Planner:**
   - Tự động lập lộ trình 1–5 ngày với phân bổ tham quan/ẩm thực xen kẽ.
   - Thuật toán Nearest Neighbor tối ưu quãng đường di chuyển (giảm 47%).
   - Hỗ trợ 2 chế độ: AI gợi ý mới và Từ danh sách đã thích.

4. **Ứng dụng web hoàn chỉnh:**
   - Giao diện hiện đại với bản đồ tương tác Leaflet.js, Heatmap, 11 modal dialogs.
   - Tích hợp Chatbot trợ lý ảo thông minh sử dụng kiến trúc RAG Text2Cypher (Google Gemini).
   - 32 API endpoints hoạt động ổn định (phản hồi < 500ms).
   - Kiến trúc modular: 4 Flask Blueprints, 7 module Data Access Layer, 10 file CSS, 9 file JS.
   - Bảo mật: mã hóa PBKDF2-SHA256, parameterized queries, Flask-Login session.

### 1.3. Kết quả đánh giá

| Tiêu chí                       | Kết quả           |
| ------------------------------- | ----------------- |
| Unit Tests                      | 14/14 PASS (100%) |
| Thời gian phản hồi API          | < 500ms           |
| Thời gian chạy thuật toán       | ~7 giây           |
| Tối ưu quãng đường (vs Random)  | Giảm 47%          |
| Điểm đánh giá người dùng        | 4.2 / 5           |
| Tỷ lệ sẵn lòng sử dụng         | 90%               |

## 2. Đóng góp của Khóa luận

### 2.1. Đóng góp khoa học

1. **Đề xuất mô hình Hybrid Recommendation trên Graph Database** phù hợp cho bài toán gợi ý du lịch, với pipeline 4 bước (Collaborative Filtering + Content-Based + PageRank Diversity Pool + Scoring), có thể tái sử dụng cho các bài toán gợi ý tương tự.

2. **Kết hợp Weighted PageRank song song** trên 2 đồ thị (User–Location để đo phổ biến, Location–Location để đo kết nối) — mang lại góc nhìn đa chiều hơn so với chỉ dùng 1 đồ thị PageRank đơn lẻ.

3. **Đề xuất giải pháp PageRank Diversity Pool** giải quyết vấn đề Filter Bubble trong hệ thống gợi ý — một cải tiến thiết thực có thể áp dụng cho nhiều miền ứng dụng.

4. **Triển khai và đánh giá Neo4j Graph Data Science** cho hệ thống gợi ý du lịch thực tế, đóng góp kinh nghiệm triển khai cho cộng đồng.

### 2.2. Đóng góp thực tiễn

1. Hệ thống **Huế Travel AI** hoàn chỉnh, có thể triển khai phục vụ du khách thực tế.
2. **Mã nguồn mở** trên GitHub ([github.com/chaudan0304/ban-do-du-lich-Hue](https://github.com/chaudan0304/ban-do-du-lich-Hue)), cộng đồng có thể sử dụng, học tập và phát triển.
3. Tài liệu khóa luận và hướng dẫn cài đặt chi tiết, phục vụ làm tài liệu tham khảo.

## 3. Hạn chế

Bên cạnh các kết quả đạt được, khóa luận vẫn tồn tại một số hạn chế cần được thừa nhận:

1. **Quy mô dữ liệu hạn chế:** Số lượng địa điểm (52) và người dùng (25) còn ít, ảnh hưởng đến hiệu quả Collaborative Filtering — thuật toán cần lượng dữ liệu lớn hơn để phát huy tối đa.

2. **Cold Start chưa tối ưu:** Gợi ý cho người dùng mới chủ yếu dựa vào PageRank toàn cục, chưa có cơ chế hỏi sở thích khi đăng ký (Onboarding Survey) hoặc sử dụng thông tin nhân khẩu học.

3. **Thiếu GPS real-time:** Hệ thống chưa tích hợp định vị vị trí hiện tại để gợi ý địa điểm gần nhất hoặc cảnh báo khi gần địa điểm đáng chú ý.

4. **Chưa có ứng dụng di động:** Hệ thống hoạt động trên web browser, chưa có ứng dụng native cho iOS/Android — hạn chế trải nghiệm người dùng khi di chuyển.

5. **Phân tích cảm xúc đơn giản:** Module Sentiment Analysis sử dụng phương pháp keyword-based, chưa áp dụng mô hình NLP nâng cao cho tiếng Việt.

## 4. Hướng Phát triển

### 4.1. Ngắn hạn (3–6 tháng)

1. **Mở rộng dữ liệu:**
   - Thu thập thêm địa điểm (mục tiêu 200+) từ Google Places API và cộng đồng người dùng.
   - Thu hút người dùng thực tế thông qua chiến dịch quảng bá.

2. **Cải thiện Cold Start:**
   - Hỏi sở thích khi đăng ký (Onboarding Survey) để khởi tạo vector sở thích ban đầu.
   - Sử dụng demographic-based filtering (giới tính, độ tuổi, quốc tịch).

3. **Tăng cường bảo mật:**
   - Rate Limiting chống tấn công brute force.
   - CSRF Protection cho các form submission.
   - API authentication bằng JWT (JSON Web Token).

### 4.2. Trung hạn (6–12 tháng)

1. **Ứng dụng di động:**
   - Phát triển ứng dụng cross-platform (React Native hoặc Flutter).
   - Tích hợp GPS real-time và thông báo location-based.
   - Hỗ trợ chế độ ngoại tuyến (offline mode).

2. **NLP nâng cao:**
   - Nâng cấp Sentiment Analysis sử dụng PhoBERT (mô hình NLP tiếng Việt).
   - Tự động trích xuất keywords và chủ đề từ bình luận.

3. **Tích hợp dịch vụ bên thứ ba:**
   - Đặt vé tham quan trực tuyến.
   - Liên kết đặt phòng khách sạn (Agoda, Booking.com).
   - Gọi xe di chuyển (Grab).

### 4.3. Dài hạn (1–2 năm)

1. **Mở rộng địa lý:**
   - Hỗ trợ các điểm đến du lịch khác: Đà Nẵng, Hội An, Nha Trang, Đà Lạt...
   - Thiết kế kiến trúc multi-tenant cho triển khai đa địa phương.

2. **Machine Learning nâng cao:**
   - Deep Learning Recommendation với Matrix Factorization hoặc Neural Collaborative Filtering.
   - Graph Neural Networks (GNN) khai thác sâu hơn cấu trúc đồ thị.
   - Reinforcement Learning cho dynamic recommendations (cập nhật gợi ý real-time).

3. **Nền tảng B2B:**
   - Cung cấp API cho đối tác du lịch (tour operator, khách sạn).
   - Dashboard phân tích xu hướng du lịch cho cơ quan quản lý.

## 5. Lời kết

Khóa luận đã hoàn thành mục tiêu đề ra: xây dựng thành công hệ thống gợi ý du lịch thông minh cho thành phố Huế trên nền tảng Graph Database và Hybrid Recommendation. Hệ thống không chỉ giải quyết bài toán thực tế "Đi đâu, chơi gì?" tại Huế mà còn đóng góp mô hình kỹ thuật có thể tái sử dụng cho các bài toán gợi ý tương tự.

Với nền tảng kiến trúc mở, mã nguồn mở và hướng phát triển rõ ràng, hệ thống Huế Travel AI có tiềm năng phát triển thành một nền tảng du lịch thông minh quy mô lớn, góp phần vào sự chuyển đổi số của ngành du lịch Thừa Thiên Huế nói riêng và Việt Nam nói chung.

**Huế, tháng 02 năm 2026**

**Sinh viên thực hiện**

*Châu Đàn*
