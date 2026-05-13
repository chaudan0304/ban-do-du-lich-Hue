# BÀI THUYẾT TRÌNH BÁO CÁO KHÓA LUẬN TỐT NGHIỆP

> **Đề tài:** Xây dựng Website khám phá địa điểm du lịch sử dụng Cơ sở dữ liệu đồ thị và Hệ khuyến nghị
>
> **Sinh viên:** Nguyễn Văn Châu Đàn
>
> **GVHD:** ThS. Nguyễn Lê Trung Thành

---

## 🎤 SLIDE MỞ ĐẦU — GIỚI THIỆU

Kính thưa Hội đồng, kính thưa Thầy/Cô!

Em tên là Nguyễn Văn Châu Đàn, sinh viên Khoa Tin học, Trường Đại học Sư phạm — Đại học Huế. Hôm nay em xin được trình bày khóa luận tốt nghiệp với đề tài:

**"Xây dựng Website khám phá địa điểm du lịch sử dụng Cơ sở dữ liệu đồ thị và Hệ khuyến nghị"**

Khóa luận được thực hiện dưới sự hướng dẫn của Thầy — Thạc sĩ Nguyễn Lê Trung Thành.

---

## 🎤 PHẦN I — LÝ DO CHỌN ĐỀ TÀI

Thưa Hội đồng, lý do em chọn đề tài này xuất phát từ 4 vấn đề chính:

**Thứ nhất**, về tiềm năng du lịch. Thành phố Huế là di sản văn hóa thế giới với tiềm năng du lịch rất lớn, thu hút hàng triệu lượt khách mỗi năm. Điều này đặt ra nhu cầu cấp thiết về một công cụ hỗ trợ du lịch thông minh.

**Thứ hai**, về thực trạng. Du khách khi đến Huế thường gặp khó khăn trong việc lựa chọn địa điểm giữa hàng trăm di tích, quán ăn, và lên kế hoạch di chuyển hợp lý, dẫn đến tình trạng di chuyển lòng vòng, lãng phí thời gian.

**Thứ ba**, các nền tảng du lịch hiện có như Google Maps hay TripAdvisor vẫn còn nhiều hạn chế. Chúng chủ yếu đưa ra gợi ý chung, chưa thực sự cá nhân hóa theo sở thích của từng người dùng.

**Thứ tư**, từ thực tiễn trên, đề tài "Xây dựng website khám phá địa điểm du lịch sử dụng cơ sở dữ liệu đồ thị và hệ khuyến nghị" đã được lựa chọn để nghiên cứu và phát triển, nhằm giải quyết những vấn đề đã nêu.

---

## 🎤 PHẦN II — MỤC TIÊU, NỘI DUNG VÀ Ý NGHĨA ĐỀ TÀI

### 2.1. Mục tiêu nghiên cứu

Khóa luận đặt ra 4 mục tiêu chính:

- **Một là**, xây dựng được một cơ sở dữ liệu đồ thị trên nền tảng Neo4j để mô hình hóa mối quan hệ giữa Người dùng, Địa điểm và Danh mục du lịch.

- **Hai là**, cài đặt và tích hợp thành công thuật toán Hybrid Recommendation, bao gồm Weighted PageRank, Collaborative Filtering sử dụng Jaccard Similarity, Content-Based Filtering, và chiến lược trọng số thích ứng.

- **Ba là**, phát triển một ứng dụng web hoàn chỉnh bao gồm bản đồ tương tác và hệ thống khuyến nghị địa điểm.

- **Bốn là**, tích hợp thêm các tính năng tiện ích bổ trợ như lập lộ trình tham quan, hệ thống đánh giá bình luận và dashboard quản trị.

### 2.2. Nội dung nghiên cứu

Nội dung nghiên cứu của khóa luận được chia thành 3 phần chính:

**Nội dung 1: Xây dựng cơ sở dữ liệu đồ thị.**

Đầu tiên là xây dựng mô hình đồ thị. Hệ thống biểu diễn dữ liệu bằng các Node như User, Location, Category và các Relationship như LIKED, REVIEWED. Tiếp theo, hệ thống sử dụng Graph Data Science để phân tích và tạo ra các mối quan hệ ẩn phức tạp hơn, ví dụ như độ tương đồng giữa các người dùng (`SIMILAR_TO`) hoặc giữa các địa điểm (`LOC_SIMILAR`). Nhờ vậy, chúng ta có thể tối ưu hóa truy vấn bằng cách khai thác lợi thế của Neo4j để trích xuất các đồ thị con (sub-graph) phục vụ thuật toán khuyến nghị nhanh chóng hơn nhiều so với việc dùng lệnh JOIN phức tạp trong CSDL quan hệ truyền thống.

**Nội dung 2: Hệ khuyến nghị và thuật toán đồ thị.**

Thay vì chỉ dùng một thuật toán đơn lẻ, hệ thống áp dụng một pipeline Hybrid Recommendation. Cụ thể, hệ thống kết hợp Collaborative Filtering dựa trên độ tương đồng Jaccard giữa các người dùng, và Content-Based Filtering dựa trên danh mục địa điểm đã thích.

Đặc biệt, hệ thống sử dụng thuật toán PageRank của Neo4j để đánh giá độ nổi tiếng của địa điểm, từ đó tạo ra một "Diversity Pool" giúp gợi ý đa dạng hơn, giải quyết vấn đề bong bóng lọc (Filter Bubble). Cuối cùng, hệ thống tích hợp tính năng Explainable AI, giúp tính toán và hiển thị trực quan tỷ lệ đóng góp của từng thuật toán để giải thích cho người dùng hiểu tại sao một địa điểm lại được gợi ý.

**Nội dung 3: Các công nghệ sử dụng.**

Về mặt nền tảng công nghệ, cốt lõi lưu trữ và xử lý của hệ thống dựa trên hệ quản trị cơ sở dữ liệu đồ thị Neo4j cùng thư viện Graph Data Science. Ở phía backend, em sử dụng framework Flask của Python để phát triển hệ thống RESTful API bảo mật và xử lý logic ứng dụng. Phía frontend, giao diện được xây dựng bằng HTML, CSS, JavaScript kết hợp với thư viện Leaflet.js để hiển thị bản đồ tương tác, mang lại trải nghiệm khám phá trực quan và mượt mà cho du khách.

### 2.3. Ý nghĩa của đề tài

**Về ý nghĩa khoa học:**

- Đề tài đề xuất thành công mô hình Hybrid Recommendation trên Graph Database thông qua việc kết hợp 3 thuật toán.
- Đưa ra giải pháp PageRank Diversity Pool nhằm giải quyết hiện tượng bẫy bong bóng lọc — hay còn gọi là Filter Bubble — một vấn đề phổ biến trong các hệ thống gợi ý.
- Mô hình này có khả năng tái sử dụng cho các bài toán gợi ý tương tự khác.

**Về ý nghĩa thực tiễn:**

- Hỗ trợ du khách lập kế hoạch du lịch một cách hiệu quả và tiết kiệm thời gian.
- Cung cấp tính năng gợi ý cá nhân hóa kết hợp hỗ trợ lập lộ trình tham quan.
- Đóng vai trò là một nền tảng mã nguồn mở, dễ dàng mở rộng để áp dụng cho các địa phương khác ngoài Huế.

---

## 🎤 PHẦN III — ĐỐI TƯỢNG VÀ PHƯƠNG PHÁP NGHIÊN CỨU

### 3.1. Đối tượng nghiên cứu

Đối tượng nghiên cứu của khóa luận bao gồm:

- Các thuật toán khuyến nghị: PageRank, Collaborative Filtering, Content-Based Filtering và các phương pháp kết hợp thuật toán lai.
- Cơ sở dữ liệu đồ thị Neo4j cùng thư viện Neo4j Graph Data Science.
- Các đặc điểm và thông tin của những địa điểm du lịch tiêu biểu tại thành phố Huế và khu vực phụ cận.
- Hành vi tương tác của người dùng đối với các địa điểm du lịch trong hệ thống.

### 3.2. Phương pháp nghiên cứu

Khóa luận áp dụng 3 phương pháp nghiên cứu chính:

- **Nghiên cứu lý thuyết**: Tìm hiểu tài liệu và các bài báo khoa học liên quan đến Recommendation System và Graph Database để xây dựng nền tảng lý thuyết vững chắc.

- **Thu thập dữ liệu**: Dữ liệu được thu thập từ website Sở Du lịch Thừa Thiên Huế, Google Maps và TripAdvisor, sau đó chuẩn hóa và import vào Neo4j thông qua script tự động.

- **Phân tích và thiết kế**: Xây dựng biểu đồ Use Case, thiết kế kiến trúc phân lớp 3 tầng, Graph Schema và các lược đồ luồng xử lý liên quan.

---

## 🎤 PHẦN IV — KẾT QUẢ NGHIÊN CỨU

Thưa Hội đồng, phần tiếp theo em xin trình bày các kết quả đạt được của khóa luận.

Hệ thống "Huế Travel" đã được xây dựng thành công với giao diện bản đồ tương tác, bao gồm danh sách các địa điểm đã thích, hệ thống gợi ý cá nhân hóa, và tính năng bản đồ nhiệt trực quan.

*(Tại đây, sinh viên DEMO trực tiếp hệ thống trên trình duyệt, trình bày các chức năng chính:)*

- **Bản đồ tương tác**: Hiển thị các địa điểm du lịch với marker phân biệt theo danh mục, hỗ trợ xem chi tiết khi click vào từng địa điểm.
- **Hệ thống gợi ý AI**: Tab "Gợi ý cá nhân hóa" hiển thị danh sách địa điểm được thuật toán Hybrid đề xuất riêng cho từng người dùng.
- **Hệ thống đánh giá – bình luận**: Người dùng có thể đánh giá sao từ 1 đến 5 và viết bình luận cho từng địa điểm.
- **Lập lộ trình thông minh**: Tính năng hỗ trợ sắp xếp lộ trình tham quan tối ưu quãng đường di chuyển.
- **Dashboard quản trị**: Cho phép quản trị viên quản lý địa điểm, người dùng và theo dõi thống kê hệ thống.

---

## 🎤 PHẦN V — KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN

### 5.1. Kết luận

Tóm lại, khóa luận đã đạt được các kết quả chính sau:

- Đã xây dựng thành công Hệ thống gợi ý du lịch mang tên "Huế Travel", đáp ứng đầy đủ các mục tiêu đề ra.
- Kết hợp thành công các thuật toán PageRank, Collaborative Filtering và Content-Based Filtering trong một pipeline Hybrid Recommendation hoàn chỉnh.
- Tạo ra một ứng dụng web hoàn chỉnh tích hợp bản đồ Leaflet.js, tính năng Explainable AI giải thích lý do gợi ý, tính năng lập lộ trình thông minh và Dashboard quản trị.

### 5.2. Hạn chế

Bên cạnh các kết quả đạt được, khóa luận vẫn tồn tại một số hạn chế:

- Quy mô dữ liệu hiện tại của hệ thống còn nhỏ, ảnh hưởng đến hiệu quả của thuật toán Collaborative Filtering.
- Hệ thống chưa được tích hợp GPS real-time để có thể đưa ra gợi ý dựa theo vị trí hiện tại của người dùng.
- Hệ thống hiện tại chưa có phiên bản ứng dụng di động native trên iOS và Android.

### 5.3. Hướng phát triển

Trong tương lai, em dự kiến phát triển đề tài theo các hướng sau:

- Tiến hành mở rộng quy mô dữ liệu, không chỉ giới hạn ở trung tâm thành phố Huế mà còn mở rộng ra các vùng lân cận.
- Tích hợp thêm tính năng GPS real-time để cải thiện việc gợi ý theo vị trí hiện tại của người dùng.
- Tiếp tục nghiên cứu và nâng cấp các thuật toán khuyến nghị, bao gồm việc áp dụng Vector Embeddings và Graph Neural Networks.

---

## 🎤 KẾT THÚC

Trên đây là toàn bộ nội dung báo cáo khóa luận tốt nghiệp của em. Em xin chân thành cảm ơn Hội đồng đã lắng nghe. Em rất mong nhận được những ý kiến đóng góp từ Quý Thầy Cô để khóa luận được hoàn thiện hơn.

Em xin trân trọng cảm ơn!
