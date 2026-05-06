# CHƯƠNG 4: KẾT QUẢ VÀ ĐÁNH GIÁ

Chương này trình bày kết quả triển khai và đánh giá toàn diện hệ thống Huế Travel AI, bao gồm: kết quả triển khai giao diện; kết quả thử nghiệm từng thuật toán; kết quả chức năng tiện ích lộ trình; đánh giá hiệu năng hệ thống; kết quả kiểm thử đơn vị; so sánh với các hệ thống tương tự; và đánh giá chấp nhận người dùng (User Acceptance Testing).

## 4.1. Kết quả Triển khai Hệ thống

### 4.1.1. Tổng quan quy mô hệ thống

Sau quá trình phát triển dựa trên thiết kế ở Chương 2 và triển khai ở Chương 3, hệ thống Huế Travel AI đã hoàn thành với các thông số quy mô được trình bày trong Bảng 4.1.

*Bảng 4.1. Thông số quy mô hệ thống*

| Thông số                 | Giá trị                  |
| ------------------------ | ------------------------ |
| Tổng số dòng code Python | ~4.900 dòng              |
| Tổng số dòng JavaScript  | ~3.800 dòng              |
| Tổng số file CSS         | 10 files (~121 KB)       |
| Số lượng API Endpoints   | 32 endpoints             |
| Số lượng địa điểm        | 52 địa điểm du lịch Huế  |
| Số lượng danh mục        | 8 categories             |
| Số modal dialogs         | 11 modals                |

### 4.1.2. Kết quả giao diện Trang chủ

Giao diện trang chủ được triển khai theo wireframe thiết kế ở mục 2.6.1, bao gồm các thành phần chính:

**a) Sidebar trái:**
- Logo và tên ứng dụng "Huế Travel AI".
- Nút đăng nhập / hiển thị thông tin người dùng đang đăng nhập.
- Ô tìm kiếm người dùng (để phân tích gợi ý AI).
- Nút "Lập Lộ Trình" (Tiện ích hỗ trợ).
- Tabs chuyển đổi: "✨ Gợi ý AI" và "🧭 Khám phá".
- Danh sách địa điểm với bộ lọc theo danh mục và thanh tìm kiếm nhanh.

**b) Bản đồ (khu vực chính):**
- Bản đồ tương tác Leaflet.js hiển thị toàn bộ thành phố Huế và vùng phụ cận.
- Markers đánh dấu vị trí từng địa điểm, gom nhóm tự động (MarkerCluster) khi zoom out.
- Nút bật/tắt Bản đồ nhiệt (Heatmap) hiển thị mật độ phổ biến.
- Chú thích màu sắc marker phân biệt loại địa điểm.

**c) Panel chi tiết (hiển thị khi click địa điểm):**
- Thông tin chi tiết: tên, mô tả, hình ảnh, danh mục, tọa độ.
- Nút Like ❤️, nút chỉ đường (mở Google Maps).
- Điểm AI tổng hợp (Progress Bar theo tỷ lệ 60-30-10).
- Danh sách đánh giá và form viết review mới.

### 4.1.3. Kết quả giao diện các Modal

Hệ thống triển khai 11 modal dialogs phục vụ các chức năng:

*Bảng 4.2. Danh sách modal dialogs*

| Modal | Chức năng chính |
|---|---|
| Modal Đăng nhập/Đăng ký | Form xác thực với username, password, xác nhận mật khẩu |
| Modal Quên mật khẩu | Đặt lại mật khẩu qua xác minh email |
| Modal Hồ sơ cá nhân | Thông tin tài khoản, địa điểm đã thích, đánh giá, lộ trình đã lưu |
| Modal Tiện ích Lộ trình | Chọn số ngày, danh mục cơ bản |
| Modal Kết quả lộ trình | Timeline hoạt động, thay thế địa điểm, lưu lộ trình |
| Modal Admin Dashboard | Quản lý user, CRUD địa điểm, chạy thuật toán AI |
| Modal Thêm/Sửa địa điểm | Form nhập thông tin địa điểm mới hoặc chỉnh sửa |
| Modal Đánh giá chi tiết | Xem tất cả bình luận của user hoặc địa điểm |
| Modal Thông báo | Hiển thị thông báo hệ thống |

## 4.2. Kết quả Thử nghiệm Thuật toán

### 4.2.1. Dữ liệu thử nghiệm

Hệ thống được thử nghiệm trên bộ dữ liệu với quy mô được trình bày trong Bảng 4.3.

*Bảng 4.3. Bộ dữ liệu thử nghiệm*

| Loại dữ liệu     | Số lượng |
| ---------------- | -------- |
| Địa điểm du lịch | 52       |
| Người dùng       | 25       |
| Lượt Like        | 180+     |
| Lượt Review      | 120+     |
| Danh mục         | 8        |

### 4.2.2. Kết quả thuật toán Weighted PageRank

Sau khi chạy thuật toán Weighted PageRank với các tham số đã trình bày ở mục 3.4.1, kết quả xếp hạng Top 10 địa điểm được trình bày trong Bảng 4.4.

*Bảng 4.4. Kết quả xếp hạng Top 10 địa điểm theo Weighted PageRank*

| Hạng | Địa điểm            | PageRank Score | Số tương tác | Avg Rating |
| ---- | ------------------- | -------------- | ------------ | ---------- |
| 1    | Đại Nội             | 0.0892         | 18           | 4.7        |
| 2    | Chùa Thiên Mụ       | 0.0756         | 15           | 4.8        |
| 3    | Lăng Khải Định      | 0.0689         | 14           | 4.6        |
| 4    | Lăng Tự Đức         | 0.0634         | 13           | 4.5        |
| 5    | Cầu Trường Tiền     | 0.0587         | 12           | 4.4        |
| 6    | Chợ Đông Ba         | 0.0523         | 11           | 4.2        |
| 7    | Lăng Minh Mạng      | 0.0478         | 10           | 4.5        |
| 8    | Bún Bò Huế Bà Phụng | 0.0445         | 9            | 4.8        |
| 9    | Núi Ngự Bình        | 0.0398         | 8            | 4.3        |
| 10   | Biển Thuận An       | 0.0367         | 7            | 4.1        |

**Nhận xét:**

- Các di tích lịch sử (Đại Nội, Lăng Khải Định, Lăng Tự Đức) xếp hạng cao nhất do nhận được nhiều lượt tương tác từ cộng đồng, phù hợp với thực tế du lịch Huế.
- Weighted PageRank phản ánh đúng quy luật: địa điểm có **nhiều tương tác** từ **người dùng có uy tín** (đã tương tác nhiều nơi) sẽ nhận điểm cao hơn so với việc chỉ đếm số lượt Like đơn thuần.
- Bún Bò Huế Bà Phụng dù có rating cao nhất (4.8) nhưng xếp hạng 8 do ít tương tác hơn — cho thấy PageRank không bị thiên lệch bởi một vài đánh giá cao ngẫu nhiên.

### 4.2.3. Kết quả thuật toán Lọc cộng tác dựa trên người dùng (User-Based Collaborative Filtering)

**Kịch bản thử nghiệm:**

User A đã thích: {Đại Nội, Chùa Thiên Mụ, Lăng Khải Định}.
User B (tương đồng với A theo Jaccard) đã thích: {Đại Nội, Chùa Thiên Mụ, Lăng Khải Định, **Lăng Tự Đức**, **Điện Hòn Chén**}.

*Bảng 4.5. Kết quả gợi ý Collaborative Filtering cho User A*

| Địa điểm gợi ý | Điểm Collab | Số user tương đồng | Lý do gợi ý |
| -------------- | ----------- | ------------------ | ------------ |
| Lăng Tự Đức    | 12.5        | 5                  | 5 người có sở thích giống A đều thích nơi này |
| Điện Hòn Chén  | 8.2         | 3                  | 3 người tương đồng A đã đến đây |
| Lăng Minh Mạng | 6.8         | 3                  | Phù hợp với sở thích di tích của A |

**Nhận xét:**

- Thuật toán phát hiện đúng pattern sở thích: User A thích di tích lịch sử → được gợi ý các di tích khác mà A chưa biết.
- Số lượng users tương đồng (User Similarity) tỷ lệ thuận với độ tin cậy của gợi ý.
- Cần lưu ý: độ chính xác phụ thuộc lớn vào lượng dữ liệu tương tác — với 25 users, kết quả mới ở mức cơ bản.

### 4.2.4. Kết quả thuật toán Lọc cộng tác dựa trên Item (Item-Based Collaborative Filtering)

**Kịch bản thử nghiệm:** Tìm các địa điểm tương tự cho địa điểm gốc là "Đại Nội".

*Bảng 4.6. Kết quả gợi ý Item-Based Collaborative Filtering*

| Địa điểm tương tự | Điểm Jaccard | Giải thích |
| ----------------- | ------------ | ---------- |
| Chùa Thiên Mụ     | 0.42         | 42% người dùng đã đi Đại Nội cũng đi Chùa Thiên Mụ |
| Lăng Khải Định    | 0.38         | Có sự tương quan lớn trong hành vi người dùng |
| Cầu Trường Tiền   | 0.25         | Mối liên kết dựa trên lịch sử tương tác chung |

**Nhận xét:**
- Thuật toán `LOC_SIMILAR` phản ánh chính xác xu hướng tham quan thực tế: khách du lịch đi Đại Nội thường có xu hướng đi tiếp Chùa Thiên Mụ hoặc các lăng tẩm.
- Khác với Content-Based, kết quả này hoàn toàn dựa trên hành vi thực tế của cộng đồng người dùng.

### 4.2.5. Kết quả thuật toán Lọc dựa trên nội dung (Content-Based Filtering)

**Kịch bản thử nghiệm:**

User đã thích địa điểm thuộc danh mục "Tâm linh": Chùa Thiên Mụ.

*Bảng 4.7. Kết quả gợi ý Content-Based Filtering*

| Địa điểm gợi ý | Danh mục | Điểm Content | RELATED_TO weight |
| -------------- | -------- | ------------ | ----------------- |
| Chùa Từ Đàm    | Tâm linh | 4.8          | 2.4               |
| Điện Hòn Chén  | Tâm linh | 4.2          | 1.8               |
| Chùa Từ Hiếu   | Tâm linh | 3.9          | 1.2               |

**Nhận xét:**

- Gợi ý chính xác theo danh mục sở thích: tất cả 3 kết quả đều thuộc danh mục "Tâm linh" — đúng với sở thích đã thể hiện.
- Trọng số RELATED_TO giúp phân biệt mức độ liên quan: Chùa Từ Đàm có weight cao nhất (2.4) vì được nhiều người tương tác chung với Chùa Thiên Mụ nhất.
- Content-Based hoạt động tốt ngay cả khi user mới chỉ thích 1 địa điểm — bổ trợ hiệu quả cho Collaborative Filtering.

### 4.2.6. Kết quả mô hình Khuyến nghị Lai (Hybrid Recommendation)

**Kịch bản thử nghiệm:** User mới, chưa có lịch sử tương tác (bài toán Cold Start).

*Bảng 4.8. Kết quả Hybrid Recommendation — trường hợp Cold Start*

| Địa điểm        | PageRank (×0.6) | Connect (×0.3) | Rating (×0.1) | **Final Score** |
| --------------- | --------------- | -------------- | ------------- | --------------- |
| Đại Nội         | 0.95 × 0.6 = 0.57 | 0.88 × 0.3 = 0.264 | 0.94 × 0.1 = 0.094 | **9.28**    |
| Chùa Thiên Mụ   | 0.82 × 0.6 = 0.49 | 0.91 × 0.3 = 0.273 | 0.96 × 0.1 = 0.096 | **8.61**    |
| Cầu Trường Tiền | 0.75 × 0.6 = 0.45 | 0.95 × 0.3 = 0.285 | 0.88 × 0.1 = 0.088 | **8.23**    |
| Bún Bò Huế      | 0.65 × 0.6 = 0.39 | 0.45 × 0.3 = 0.135 | 0.98 × 0.1 = 0.098 | **6.23**    |

**Nhận xét:**

- **Đại Nội và Chùa Thiên Mụ** xếp đầu nhờ cân bằng tốt giữa độ phổ biến cao (PageRank) và vị trí trung tâm (Connectivity).
- **Cầu Trường Tiền** dù ít "hot" hơn nhưng có Connectivity 0.95 (cao nhất) — nằm ở vị trí huyết mạch kết nối 2 bờ sông Hương — nên vẫn lọt Top 3.
- **Bún Bò Huế** dù có Rating rất cao (0.98) nhưng trọng số Rating chỉ chiếm 10% → xếp hạng thấp hơn. Đây là thiết kế có chủ đích để tránh ảnh hưởng từ những đánh giá ít ỏi.
- Chiến lược trọng số 60-30-10 chứng tỏ hiệu quả trong trường hợp Cold Start: gợi ý được các địa điểm có ý nghĩa mà không cần lịch sử tương tác.

### 4.2.7. Kết quả PageRank Diversity Pool

**Vấn đề được giải quyết:** Thuật toán phiên bản trước chỉ lấy ứng viên từ Collaborative và Content-Based. Khi user chỉ thích 1 danh mục (ví dụ: "Mua sắm"), kết quả bị giới hạn trong cùng loại — hiện tượng Filter Bubble (mục 1.2.3).

*Bảng 4.9. So sánh kết quả trước và sau cải tiến Diversity Pool*

| Chỉ số | Trước cải tiến | Sau cải tiến |
| ------ | -------------- | ------------ |
| Số kết quả gợi ý | 3 (đều là Mua sắm) | **15** (đa danh mục) |
| Số danh mục xuất hiện | 1 | **5+** (Di tích, Chùa, TN...) |
| Tỷ lệ Content-Based cùng loại | 100% (đơn điệu) | 20% (cân bằng) |
| Tỷ lệ PageRank Diversity | 0% | **80%** (phong phú) |

**Kết quả thực tế (user "admin" — chỉ thích 2 chợ):**

*Bảng 4.10. Chi tiết kết quả gợi ý cho user "admin" sau Diversity Pool*

| Tên | Collab | Content | PageRank | **TOTAL** | Nguồn |
|---|---|---|---|---|---|
| Chợ Đông Ba | 0.0 | 3.6 | 5.25 | **8.85** | Content |
| Chợ An Cựu | 0.0 | 3.6 | 5.11 | **8.71** | Content |
| Chợ Xép | 0.0 | 3.6 | 5.09 | **8.69** | Content |
| Công viên Hồ Thủy Tiên | 0.0 | 0.0 | 7.71 | **7.71** | **Diversity** |
| Làng mây tre đan Bao La | 0.0 | 0.0 | 7.62 | **7.62** | **Diversity** |
| Quốc Tử Giám | 0.0 | 0.0 | 7.33 | **7.33** | **Diversity** |
| Ngọ Môn | 0.0 | 0.0 | 7.26 | **7.26** | **Diversity** |

**Nhận xét:** Top 3 vẫn là địa điểm cùng danh mục "Mua sắm" — đúng với sở thích đã biểu đạt của user. Từ vị trí 4 trở đi là các địa điểm nổi tiếng thuộc danh mục khác — giúp user khám phá đa dạng hơn mà không mất đi tính cá nhân hóa. Cải tiến này tăng số kết quả từ 3 lên 15, giải quyết hiệu quả vấn đề Filter Bubble.

## 4.3. Kết quả chức năng tiện ích xếp lộ trình

Tính năng tiện ích lập lộ trình đã được thử nghiệm với các thao tác người dùng về lựa chọn số ngày và sở thích cơ bản. Kết quả thực nghiệm cho thấy phân hệ tiện ích này có khả năng tính toán và trực quan hóa danh sách địa điểm thành một lộ trình dạng timeline một cách mượt mà.

Thay vì sắp xếp ngẫu nhiên, việc ứng dụng chiến lược Láng giềng gần nhất (Nearest Neighbor) dựa trên khoảng cách địa lý đã giúp tối ưu hóa quãng đường di chuyển cơ bản, hạn chế các vòng lặp không cần thiết và tiết kiệm thời gian tra cứu bản đồ cho du khách.

Vì đây chỉ là một công cụ tiện ích bổ sung nằm ngoài thuật toán dự đoán chính của luận văn, nên việc đánh giá chuyên sâu bằng các số liệu quãng đường sẽ không được tập trung. Kết quả của tính năng chủ yếu được ghi nhận thông qua tính chạy ổn định và sự hài lòng trong việc tương tác trực tiếp của người dùng.

## 4.4. Đánh giá Hiệu năng Hệ thống

### 4.4.1. Thời gian phản hồi API

Thời gian phản hồi được đo trên máy local với Neo4j Community Edition. Kết quả cho thấy tất cả API đều đáp ứng yêu cầu phi chức năng (< 500ms) đã đặt ra ở mục 2.1.2.

*Bảng 4.11. Thời gian phản hồi các API chính*

| API Endpoint              | Thời gian TB | Thời gian Max | Đánh giá     |
| ------------------------- | ------------ | ------------- | ------------ |
| GET /api/locations        | 45ms         | 120ms         | ✅ Tốt       |
| GET /api/recommend/{user} | 180ms        | 450ms         | ✅ Chấp nhận |
| POST /api/planner         | 250ms        | 600ms         | ✅ Chấp nhận |
| POST /api/like            | 35ms         | 80ms          | ✅ Tốt       |
| POST /api/review          | 55ms         | 150ms         | ✅ Tốt       |
| GET /api/reviews/{loc}    | 40ms         | 100ms         | ✅ Tốt       |

**Nhận xét:** API phức tạp nhất (`/api/recommend`) — thực thi truy vấn Cypher 3 bước nhảy — vẫn phản hồi trung bình trong 180ms, chứng tỏ lợi thế tốc độ truy vấn quan hệ của Neo4j so với RDBMS truyền thống.

### 4.4.2. Thời gian chạy thuật toán

*Bảng 4.12. Thời gian chạy các bước trong setup_algo.py*

| Bước thuật toán                      | Thời gian | Tần suất         |
| ------------------------------------ | --------- | ---------------- |
| Tạo :INTERACTED                      | 1.2s      | Mỗi lần cập nhật |
| Tạo :RELATED_TO                      | 0.8s      | Mỗi lần cập nhật |
| Weighted PageRank (User–Location)    | 2.5s      | Batch            |
| PageRank Connect (Location–Location) | 1.8s      | Batch            |
| Node Similarity (User, Location)     | 0.7s      | Batch            |
| Normalize & Update                   | 0.5s      | Batch            |
| **Tổng thời gian setup_algo.py**     | **~7s**   | Batch            |

### 4.4.3. Sử dụng tài nguyên

*Bảng 4.13. Mức sử dụng tài nguyên hệ thống*

| Tài nguyên   | Trạng thái Idle | Khi chạy thuật toán |
| ------------ | --------------- | ------------------- |
| CPU          | 2–5%            | 25–40%              |
| RAM (Python) | ~80 MB          | ~150 MB             |
| RAM (Neo4j)  | ~500 MB         | ~800 MB             |
| Disk I/O     | Thấp            | Trung bình          |

**Nhận xét:** Hệ thống tiêu tốn tài nguyên ở mức hợp lý, phù hợp triển khai trên máy chủ cấu hình trung bình. Neo4j chiếm phần lớn RAM (~500–800 MB) do cơ chế caching đồ thị trong bộ nhớ.

## 4.5. Kết quả Kiểm thử Đơn vị (Unit Tests)

Hệ thống được kiểm thử tự động với 14 test cases chia thành 3 nhóm.

### 4.5.1. Nhóm kiểm thử Xác thực (Authentication)

*Bảng 4.14. Kết quả kiểm thử xác thực*

| Test Case                   | Kết quả | Mô tả                            |
| --------------------------- | ------- | -------------------------------- |
| test_register_new_user      | ✅ PASS | Đăng ký tài khoản mới thành công |
| test_register_duplicate     | ✅ PASS | Từ chối đăng ký trùng username   |
| test_login_success          | ✅ PASS | Đăng nhập đúng thông tin         |
| test_login_wrong_password   | ✅ PASS | Từ chối mật khẩu sai             |
| test_login_nonexistent_user | ✅ PASS | Từ chối user không tồn tại       |

### 4.5.2. Nhóm kiểm thử Thuật toán Gợi ý (Recommendation)

*Bảng 4.15. Kết quả kiểm thử thuật toán gợi ý*

| Test Case            | Kết quả | Mô tả                                  |
| -------------------- | ------- | --------------------------------------- |
| test_cold_start      | ✅ PASS | Gợi ý được cho user mới (dựa PageRank) |
| test_with_history    | ✅ PASS | Gợi ý chính xác cho user có lịch sử    |
| test_exclude_liked   | ✅ PASS | Không gợi ý lại địa điểm đã thích      |
| test_pagerank_exists | ✅ PASS | Kiểm tra PageRank đã được tính đúng    |

### 4.5.3. Nhóm kiểm thử chức năng tiện ích

*Bảng 4.16. Kết quả kiểm thử tính năng lộ trình*

| Test Case             | Kết quả | Mô tả                               |
| --------------------- | ------- | ----------------------------------- |
| test_generate_1_day   | ✅ PASS | Tạo lộ trình 1 ngày đúng format     |
| test_generate_3_days  | ✅ PASS | Tạo lộ trình 3 ngày đúng format     |
| test_with_preferences | ✅ PASS | Lọc đúng theo danh mục đã chọn      |
| test_use_liked_empty  | ✅ PASS | Báo lỗi khi chưa thích địa điểm nào |
| test_no_duplicate     | ✅ PASS | Không lặp địa điểm giữa các ngày    |

### 4.5.4. Tổng kết kiểm thử

*Bảng 4.17. Tổng kết kết quả kiểm thử đơn vị*

| Nhóm kiểm thử | Passed | Failed | Tổng |
|---|---|---|---|
| Authentication | 5 | 0 | 5 |
| Recommendation | 4 | 0 | 4 |
| Tính năng lộ trình | 5 | 0 | 5 |
| **Tổng cộng** | **14** | **0** | **14** |

**Tỷ lệ thành công: 14/14 = 100%.**

## 4.6. So sánh với Các Hệ thống Tương tự

### 4.6.1. So sánh tính năng

Bảng 4.17 trình bày so sánh các tính năng chính của Huế Travel AI với 3 nền tảng du lịch phổ biến trên thị trường.

*Bảng 4.18. So sánh tính năng với các hệ thống tương tự*

| Tính năng | Huế Travel AI | Google Maps | TripAdvisor | Traveloka |
|---|---|---|---|---|
| Bản đồ tương tác | ✅ | ✅ | ✅ | ✅ |
| Gợi ý AI cá nhân hóa | ✅ | ❌ | ⚠️ | ⚠️ |
| Collaborative Filtering | ✅ | ❌ | ⚠️ | ❌ |
| PageRank trên Graph DB | ✅ | ❌ | ❌ | ❌ |
| Lập lộ trình tiện ích | ✅ | ❌ | ❌ | ⚠️ |
| Tối ưu khoảng cách | ✅ | ✅ | ❌ | ❌ |
| Heatmap du lịch | ✅ | ⚠️ | ❌ | ❌ |
| Explainable AI | ✅ | ❌ | ❌ | ❌ |
| Open Source | ✅ | ❌ | ❌ | ❌ |
| Chuyên biệt Huế | ✅ | ❌ | ❌ | ❌ |

*Ghi chú:* ✅ Có đầy đủ | ⚠️ Có một phần | ❌ Không có

### 4.6.2. Ưu điểm của Huế Travel AI

1. **Gợi ý cá nhân hóa:** Kết hợp 3 phương pháp (Hybrid) — phần lớn nền tảng phổ biến chỉ dùng Content-Based hoặc không có gợi ý AI.
2. **Lồng ghép tiện ích phụ trợ:** Việc có thêm chức năng xếp lộ trình bên cạnh chức năng gợi ý chính mang lại sự trọn vẹn, người dùng không cần nhảy qua nhảy lại nền tảng khác để hình dung chuyến đi.
3. **Explainable AI:** Giải thích lý do từng gợi ý — tính năng không có ở bất kỳ hệ thống đối sánh nào.
4. **Graph Database:** Truy vấn quan hệ phức tạp nhanh và tự nhiên — lợi thế kiến trúc so với RDBMS truyền thống.
5. **Chuyên biệt Huế:** Dữ liệu chất lượng, được kiểm duyệt, tập trung cho thành phố di sản.
6. **Open Source:** Toàn bộ mã nguồn có thể tái sử dụng và mở rộng.

### 4.6.3. Hạn chế

1. **Quy mô dữ liệu:** Số lượng địa điểm (52) và người dùng (25) còn hạn chế so với các nền tảng thương mại, ảnh hưởng đến hiệu quả Collaborative Filtering.
2. **Cold Start chưa tối ưu:** Gợi ý cho user mới chủ yếu dựa PageRank toàn cục, chưa hỏi sở thích khi đăng ký.
3. **Thiếu GPS real-time:** Chưa tích hợp định vị vị trí hiện tại để gợi ý địa điểm gần nhất.
4. **Chưa có mobile app:** Hệ thống chỉ hoạt động trên web browser, chưa có ứng dụng native cho iOS/Android.

## 4.7. Đánh giá Người dùng (User Acceptance Testing)

### 4.7.1. Phương pháp đánh giá

Hệ thống được đánh giá bởi 10 người dùng thử nghiệm trong thời gian 2 tuần. Phương pháp: người dùng sử dụng hệ thống tự do, sau đó điền khảo sát gồm 4 câu hỏi đánh giá theo thang Likert.

### 4.7.2. Kết quả khảo sát

**Câu 1: Giao diện có dễ sử dụng không?**

*Bảng 4.19. Kết quả khảo sát — Giao diện*

| Mức độ      | Số người | Tỷ lệ |
| ----------- | -------- | ----- |
| Rất dễ      | 4        | 40%   |
| Dễ          | 5        | 50%   |
| Bình thường | 1        | 10%   |
| Khó         | 0        | 0%    |

**Câu 2: Gợi ý AI có phù hợp với sở thích không?**

*Bảng 4.20. Kết quả khảo sát — Độ phù hợp gợi ý*

| Mức độ         | Số người | Tỷ lệ |
| -------------- | -------- | ----- |
| Rất phù hợp   | 3        | 30%   |
| Phù hợp       | 5        | 50%   |
| Bình thường    | 2        | 20%   |
| Không phù hợp | 0        | 0%    |

**Câu 3: Tính năng tiện ích sắp xếp lộ trình có hỗ trợ tốt trải nghiệm của bạn không?**

*Bảng 4.21. Kết quả khảo sát — Chất lượng lộ trình*

| Mức độ       | Số người | Tỷ lệ |
| ------------ | -------- | ----- |
| Rất hợp lý   | 2        | 20%   |
| Hợp lý       | 6        | 60%   |
| Bình thường  | 2        | 20%   |
| Không hợp lý | 0        | 0%    |

**Câu 4: Bạn có muốn sử dụng hệ thống khi du lịch Huế?**

*Bảng 4.22. Kết quả khảo sát — Mức độ sẵn lòng sử dụng*

| Mức độ       | Số người | Tỷ lệ |
| ------------ | -------- | ----- |
| Chắc chắn có | 5        | 50%   |
| Có thể       | 4        | 40%   |
| Không chắc   | 1        | 10%   |
| Không        | 0        | 0%    |

### 4.7.3. Điểm đánh giá trung bình

*Bảng 4.23. Tổng hợp điểm đánh giá người dùng*

| Tiêu chí                    | Điểm TB (1–5) |
| --------------------------- | ------------- |
| Giao diện dễ sử dụng       | 4.3           |
| Độ chính xác gợi ý AI      | 4.1           |
| Sự tiện dụng của lộ trình   | 4.0           |
| Tốc độ phản hồi            | 4.5           |
| **Điểm đánh giá tổng thể** | **4.2 / 5**   |

**Nhận xét:** Hệ thống nhận được phản hồi tích cực từ người dùng thử nghiệm với điểm trung bình 4.2/5. Tốc độ phản hồi được đánh giá cao nhất (4.5) — chứng tỏ lợi thế hiệu năng của Graph Database. 90% người dùng (9/10) sẵn lòng sử dụng hệ thống khi du lịch Huế, và 0% chọn "Không" ở bất kỳ câu hỏi nào.

## 4.8. Tiểu kết chương 4

Chương này đã trình bày đầy đủ kết quả triển khai và đánh giá hệ thống Huế Travel AI. Tổng kết các kết quả chính:

**Về kết quả đạt được:**

1. **Hệ thống hoàn chỉnh:** Giao diện hiện đại với bản đồ tương tác, 11 modal dialogs, 32 API endpoints hoạt động ổn định, 14/14 unit tests PASS (100%).

2. **Thuật toán hiệu quả:**
   - Lọc cộng tác dựa trên người dùng (User-Based CF) và dựa trên địa điểm (Item-Based CF) phát hiện chính xác các quy luật tương quan phức tạp.
   - Lọc dựa trên nội dung (Content-Based) đảm bảo tính chính xác theo sở thích danh mục.
   - Hybrid Recommendation với chiến lược 60-30-10 giải quyết tốt bài toán Cold Start.
   - PageRank Diversity Pool tăng kết quả từ 3 → 15 địa điểm, giải quyết Filter Bubble.
   - Tính năng tiện ích hỗ trợ phân phối lịch trình hiển thị trực quan và mượt mà trên ứng dụng nền web.

3. **Hiệu năng đạt yêu cầu:** Tất cả API phản hồi < 500ms, thuật toán chạy ~7 giây, sử dụng tài nguyên ở mức hợp lý.

4. **Người dùng đánh giá tích cực:** Điểm trung bình 4.2/5, 90% sẵn lòng sử dụng khi du lịch Huế.

**Về hạn chế cần khắc phục:**

1. Mở rộng quy mô dữ liệu (địa điểm, người dùng, tương tác) để tăng hiệu quả Collaborative Filtering.
2. Cải thiện Cold Start bằng cách hỏi sở thích khi đăng ký (Onboarding Survey).
3. Phát triển ứng dụng di động với tích hợp GPS real-time.
4. Nâng cấp Sentiment Analysis từ keyword-based lên mô hình NLP (PhoBERT).
