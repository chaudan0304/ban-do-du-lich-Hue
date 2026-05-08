Dưới đây là bản tổng hợp nội dung Báo cáo Khóa luận Tốt nghiệp của bạn dưới định dạng Markdown:

BÁO CÁO BẢO VỆ KHÓA LUẬN TỐT NGHIỆP 

**ĐỀ TÀI: XÂY DỰNG WEBSITE KHÁM PHÁ ĐỊA ĐIỂM DU LỊCH SỬ DỤNG CƠ SỞ DỮ LIỆU ĐỒ THỊ VÀ HỆ KHUYẾN NGHỊ** 

* 
**Sinh viên thực hiện:** Nguyễn Văn Châu Đàn 


* **Giảng viên hướng dẫn:** ThS. Nguyễn Lê Trung Thành 


* 
**Đơn vị:** Khoa Tin học, Trường Đại học Sư phạm - Đại học Huế 


* 
**Thời gian:** Thành phố Huế, Tháng 5 Năm 2026 



---

I. LÝ DO CHỌN ĐỀ TÀI 

* 
**Tiềm năng:** Du lịch có tiềm năng phát triển rất lớn.


* 
**Thực trạng:** Du khách gặp nhiều khó khăn thực tế trong việc tìm kiếm và lên kế hoạch.


* 
**Hạn chế:** Các nền tảng du lịch hiện có vẫn còn nhiều hạn chế nhất định.


* 
**Kết luận:** Từ thực tiễn trên, đề tài "Xây dựng website khám phá địa điểm du lịch sử dụng cơ sở dữ liệu đồ thị và hệ khuyến nghị" đã được lựa chọn để nghiên cứu và phát triển.



## II. 

MỤC TIÊU, NỘI DUNG VÀ Ý NGHĨA CỦA ĐỀ TÀI 

### 2.1. 

Mục tiêu nghiên cứu 

* Xây dựng được một cơ sở dữ liệu đồ thị.


* Cài đặt và tích hợp thành công thuật toán Hybrid Recommendation.


* Phát triển ứng dụng Web bao gồm bản đồ tương tác và hệ thống khuyến nghị.


* Tích hợp thêm các tính năng tiện ích khác cho hệ thống.



### 2.2. 

Nội dung nghiên cứu 

* 
**Nội dung 1: Xây dựng cơ sở dữ liệu đồ thị** 


* Lưu trữ dữ liệu dưới dạng Node (đỉnh) và Relationship (cạnh).


* Mang lại ưu điểm vượt trội so với CSDL quan hệ: truy vấn các mối quan hệ phức tạp nhanh hơn và trực quan hơn.


* Rất phù hợp với bài toán gợi ý.




* 
**Nội dung 2: Hệ khuyến nghị và thuật toán đồ thị** 


* 
*Phương pháp chính:* Content-Based Filtering (gợi ý dựa trên đặc trưng nội dung) , Collaborative Filtering (gợi ý dựa trên hành vi người dùng tương tự) , và Hybrid (kết hợp cả hai phương pháp trên nhằm khắc phục hạn chế của từng phương pháp riêng lẻ).


* 
*Thuật toán đồ thị sử dụng:* PageRank (đánh giá mức độ quan trọng của node dựa trên cấu trúc liên kết) và Độ tương đồng Jaccard (đo lường độ tương đồng giữa hai tập hợp, dùng cho CF).




* 
**Nội dung 3: Các công nghệ sử dụng** 


* 
**Neo4j:** Hệ quản trị CSDL đồ thị kết hợp cùng thư viện Graph Data Science (GDS).


* 
**Flask (Python):** Dùng cho backend để xây dựng RESTful API.


* 
**Leaflet.js:** Dùng để hiển thị bản đồ tương tác trực tiếp trên trình duyệt.


* 
**HTML/CSS/JS:** Dùng để xây dựng frontend, giao diện người dùng.





### 2.3. 

Ý nghĩa của đề tài 

* 
**Ý nghĩa khoa học:** 


* Đề xuất thành công mô hình “Hybrid Recommendation trên Graph Database” thông qua việc kết hợp 3 thuật toán.


* Đưa ra giải pháp PageRank Diversity Pool nhằm giải quyết hiện tượng bẫy bong bóng lọc (Filter Bubble).


* Mô hình này có khả năng tái sử dụng cho các bài toán gợi ý tương tự khác.




* 
**Ý nghĩa thực tiễn:** 


* Hỗ trợ du khách lập kế hoạch du lịch một cách hiệu quả và tiết kiệm thời gian.


* Cung cấp tính năng gợi ý cá nhân hóa và hỗ trợ lập lộ trình.


* Đóng vai trò là nền tảng mã nguồn mở, dễ dàng mở rộng để áp dụng cho các địa phương khác.





## III. 

ĐỐI TƯỢNG VÀ PHƯƠNG PHÁP NGHIÊN CỨU 

### 3.1. 

Đối tượng nghiên cứu 

* Các thuật toán khuyến nghị bao gồm: PageRank, Collaborative Filtering, Content Based Filtering và các phương pháp kết hợp thuật toán.


* Cơ sở dữ liệu đồ thị Neo4j cùng thư viện Neo4j Graph Data Science (GDS).


* Các đặc điểm, thông tin của những địa điểm du lịch tiêu biểu tại thành phố Huế và khu vực phụ cận.


* Hành vi tương tác của người dùng đối với các địa điểm du lịch lưu trong hệ thống.



### 3.2. 

Phương pháp nghiên cứu 

* 
**Nghiên cứu lý thuyết:** Tìm hiểu tài liệu, các bài báo khoa học liên quan đến Recommendation System và Graph Database.


* 
**Thu thập dữ liệu:** Lấy dữ liệu từ Sở Du lịch Huế, nền tảng Google Maps và TripAdvisor.


* 
**Phân tích & thiết kế:** Xây dựng Use Case, thiết kế kiến trúc phân lớp, Graph Schema và các lược đồ liên quan.



## IV. 

KẾT QUẢ NGHIÊN CỨU 

* Xây dựng thành công giao diện Hệ thống gợi ý du lịch "Huế Travel", bao gồm danh sách các địa điểm đã thích, gợi ý cá nhân hóa và tích hợp bản đồ nhiệt trực quan.



V. KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN 

### 5.1. 

Kết luận 

* Đã xây dựng thành công Hệ thống gợi ý du lịch mang tên "Huế Travel".


* Kết hợp thành công các thuật toán PageRank, CF và CBF.


* Tạo ra một ứng dụng web hoàn chỉnh tích hợp bản đồ Leaflet.js, Explainable AI, tính năng lập lộ trình và Dashboard quản trị.



### 5.2. 

Hạn chế 

* Quy mô dữ liệu hiện tại của hệ thống còn nhỏ.


* Hệ thống chưa được tích hợp GPS real-time để có thể đưa ra gợi ý dựa theo vị trí hiện tại của người dùng.


* Hệ thống hiện tại chưa có phiên bản ứng dụng di động native trên iOS/Android.



### 5.3. 

Hướng phát triển 

* Tiến hành mở rộng quy mô dữ liệu cho hệ thống.


* Tích hợp thêm tính năng GPS real-time để cải thiện việc gợi ý theo vị trí hiện tại.


* Tiếp tục nghiên cứu và nâng cấp các thuật toán khuyến nghị.