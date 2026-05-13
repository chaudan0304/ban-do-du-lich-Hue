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

3. **Tiện ích bổ trợ sắp xếp lộ trình:**
   - Hỗ trợ người dùng phân bổ danh sách địa điểm đã được gợi ý thành lộ trình 1–5 ngày.
   - Ứng dụng nguyên tắc Láng giềng gần nhất (Nearest Neighbor) để giảm thiểu quãng đường di chuyển vòng vèo.
   - Hỗ trợ 2 chế độ: từ gợi ý hệ thống và từ danh sách đã thích.

4. **Ứng dụng web hoàn chỉnh:**
   - Giao diện hiện đại với bản đồ tương tác Leaflet.js, Heatmap, 11 modal dialogs.
   - Giao diện Giải thích AI (Explainable AI) minh bạch hóa quyết định gợi ý.
   - Kiến trúc modular: 4 Flask Blueprints, 7 module Data Access Layer, 10 file CSS, 9 file JS.
   - Bảo mật: mã hóa mật khẩu, parameterized queries, Flask-Login session.



## 2. Đóng góp của Khóa luận

### 2.1. Đóng góp khoa học

1. **Đề xuất mô hình Hybrid Recommendation trên Graph Database** phù hợp cho bài toán gợi ý du lịch, với pipeline 4 bước (Collaborative Filtering + Content-Based + PageRank Diversity Pool + Scoring), có thể tái sử dụng cho các bài toán gợi ý tương tự.

2. **Kết hợp Weighted PageRank song song** trên 2 đồ thị (User–Location để đo phổ biến, Location–Location để đo kết nối) — mang lại góc nhìn đa chiều hơn so với chỉ dùng 1 đồ thị PageRank đơn lẻ.

3. **Đề xuất giải pháp PageRank Diversity Pool** giải quyết vấn đề Filter Bubble trong hệ thống gợi ý — một cải tiến thiết thực có thể áp dụng cho nhiều miền ứng dụng.

4. **Triển khai và đánh giá Neo4j Graph Data Science** cho hệ thống gợi ý du lịch thực tế, đóng góp kinh nghiệm triển khai cho cộng đồng.

### 2.2. Đóng góp thực tiễn

1. **Xây dựng thành công ứng dụng thực tế "Huế Travel AI":** Cung cấp một nền tảng web hoàn chỉnh, có giao diện bản đồ trực quan (GIS) và tiện ích hỗ trợ sắp xếp lộ trình thông minh. Ứng dụng đã sẵn sàng để triển khai phục vụ khách du lịch thực tế khi đến với Thừa Thiên Huế, giúp giải quyết khó khăn trong việc tra cứu điểm đến và lên kế hoạch di chuyển tối ưu.

2. **Cung cấp công cụ Explainable AI (XAI) minh bạch hóa quyết định:** Tích hợp giao diện giải thích chi tiết lý do gợi ý (được hệ thống AI cá nhân hóa dựa trên lịch sử tương tác), giúp tăng tính thuyết phục và độ tin cậy của ứng dụng thay vì chỉ đưa ra kết quả "hộp đen" (black-box) như các hệ thống truyền thống.

3. **Mã nguồn mở và khả năng tái sử dụng:** Toàn bộ mã nguồn của hệ thống được thiết kế và công khai theo chuẩn mã nguồn mở, đi kèm cấu trúc phần mềm rõ ràng và tài liệu hướng dẫn cài đặt chi tiết. Điều này giúp cộng đồng lập trình viên, các nhà nghiên cứu và sinh viên có thể dễ dàng tham khảo, học tập hoặc tùy biến triển khai cho các tỉnh thành khác.

4. **Tạo nền tảng thu thập và phân tích hành vi du lịch:** Với cơ sở dữ liệu đồ thị linh hoạt, hệ thống đóng vai trò như một bộ thu thập dữ liệu (data collection hub) ghi nhận lại sở thích, mức độ hài lòng và tương tác của du khách. Đây là nguồn dữ liệu quý giá (insights) có khả năng hỗ trợ các cơ quan quản lý ban ngành địa phương trong việc hoạch định chiến lược phát triển du lịch.

## 3. Hạn chế

Bên cạnh các kết quả đạt được, khóa luận vẫn tồn tại một số hạn chế cần được thừa nhận:

1. **Quy mô dữ liệu hạn chế:** Số lượng địa điểm (52) và người dùng (25) còn ít, ảnh hưởng đến hiệu quả Collaborative Filtering — thuật toán cần lượng dữ liệu lớn hơn để phát huy tối đa.

2. **Cold Start chưa tối ưu:** Gợi ý cho người dùng mới chủ yếu dựa vào PageRank toàn cục, chưa có cơ chế hỏi sở thích khi đăng ký (Onboarding Survey) hoặc sử dụng thông tin nhân khẩu học.

3. **Thiếu GPS real-time:** Hệ thống chưa tích hợp định vị vị trí hiện tại để gợi ý địa điểm gần nhất hoặc cảnh báo khi gần địa điểm đáng chú ý.

4. **Chưa có ứng dụng di động:** Hệ thống hoạt động trên web browser, chưa có ứng dụng native cho iOS/Android — hạn chế trải nghiệm người dùng khi di chuyển.

5. **Phân tích cảm xúc đơn giản:** Module Sentiment Analysis sử dụng phương pháp keyword-based, chưa áp dụng mô hình NLP nâng cao cho tiếng Việt.

## 4. Hướng Phát triển

Mặc dù hệ thống đã đáp ứng được các mục tiêu nghiên cứu đề ra, để hoàn thiện và nâng cao hiệu năng của mô hình khuyến nghị cũng như tính ứng dụng của đề tài, một số hướng phát triển tiếp theo được đề xuất như sau:

### 4.1. Cải thiện và Mở rộng Mô hình Khuyến nghị

1. **Nâng cấp phương pháp Lọc dựa trên nội dung (Content-Based Filtering):** Thay vì chỉ tính điểm thưởng dựa trên sự trùng khớp danh mục (Category) đơn giản, hệ thống có thể tích hợp **Vector Embeddings** (sử dụng các mô hình ngôn ngữ lớn) để biểu diễn mô tả địa điểm và đánh giá của người dùng thành các vector đa chiều. Việc tính toán độ tương đồng trên không gian vector sẽ mang lại kết quả gợi ý sâu sắc và chính xác hơn.
2. **Triển khai Học sâu trên đồ thị (Graph Neural Networks - GNN):** Mặc dù các thuật toán Graph Data Science (GDS) truyền thống như PageRank hay Node Similarity đã hoạt động hiệu quả, việc nghiên cứu áp dụng các mô hình học sâu như **GraphSAGE** hay **GCN** có thể giúp hệ thống tự động trích xuất các đặc trưng tiềm ẩn (latent features) phức tạp từ mạng lưới tương tác.
3. **Cải tiến cơ chế Khởi động lạnh (Cold Start):** Xây dựng quy trình thu thập sở thích ban đầu (Onboarding Survey) cho người dùng mới đăng ký, kết hợp với các kỹ thuật Demographic-based Filtering (lọc theo độ tuổi, giới tính) để khởi tạo không gian cá nhân hóa ngay từ lần truy cập đầu tiên thay vì chỉ phụ thuộc vào PageRank.

### 4.2. Nâng cấp Tiện ích Lập lộ trình và Phân tích Cảm xúc

1. **Tối ưu hóa bài toán lập lộ trình (Itinerary Optimization):** Nâng cấp thuật toán tham lam (Greedy) và khoảng cách Euclid hiện tại bằng các giải pháp định tuyến chuyên sâu kết hợp với các API bản đồ thực tế (ví dụ: Google Maps Distance Matrix hoặc OpenRouteService). Điều này giúp hệ thống xem xét cả tình trạng giao thông và đường đi thực tế để phân bổ lịch trình tối ưu nhất.
2. **Áp dụng NLP tiên tiến cho Sentiment Analysis:** Chuyển đổi từ phương pháp khớp từ khóa (Keyword-based) sang các mô hình xử lý ngôn ngữ tự nhiên tiên tiến dành riêng cho tiếng Việt (như **PhoBERT**). Mục tiêu hướng đến là phân tích cảm xúc dựa trên khía cạnh (Aspect-based Sentiment Analysis) để trích xuất điểm số hài lòng chi tiết, từ đó đưa kết quả này vào làm một tham số trọng lượng quan trọng trong pipeline khuyến nghị.

### 4.3. Mở rộng Dữ liệu và Tích hợp Hệ thống

1. **Tăng cường quy mô dữ liệu (Scalability):** Mở rộng tập dữ liệu từ 52 địa điểm hiện tại lên quy mô hàng trăm địa điểm, không chỉ gói gọn trong trung tâm thành phố Huế mà còn lan rộng ra các huyện lân cận và các tỉnh thành khác nhằm kiểm chứng độ ổn định và khả năng tính toán của đồ thị với dữ liệu lớn (Big Data).
2. **Cập nhật dữ liệu thời gian thực (Real-time Data Streaming):** Xây dựng luồng xử lý tự động thu thập và đồng bộ các đánh giá, tương tác của người dùng từ các nền tảng du lịch lớn (TripAdvisor, Google Reviews) vào Neo4j, giúp mô hình luôn nắm bắt được xu hướng du lịch hiện thời của cộng đồng.

## 5. Lời kết

Khóa luận đã hoàn thành xuất sắc mục tiêu nghiên cứu và xây dựng thành công **Hệ thống Gợi ý Du lịch Thông minh cho Thành phố Huế**, ứng dụng sức mạnh của **Cơ sở dữ liệu đồ thị (Graph Database)** kết hợp cùng **Thuật toán Khuyến nghị Lai (Hybrid Recommendation)**. Đề tài không chỉ dừng lại ở việc thử nghiệm các mô hình thuật toán trên lý thuyết, mà đã hiện thực hóa thành một ứng dụng phần mềm hoàn chỉnh, có khả năng giải quyết trực tiếp và trực quan bài toán "Đi đâu, chơi gì?" — một rào cản phổ biến trong trải nghiệm của du khách.

Bằng việc tích hợp khéo léo giữa thuật toán **Weighted PageRank**, **Lọc cộng tác (Collaborative Filtering)** và **Lọc dựa trên nội dung (Content-Based Filtering)** thông qua một chiến lược trọng số thích ứng, hệ thống đã khắc phục hiệu quả những thách thức kinh điển của lĩnh vực hệ thống gợi ý như vấn đề "Khởi động lạnh" (Cold Start) hay "Bẫy bong bóng lọc" (Filter Bubble). Bên cạnh đó, việc cung cấp tính năng minh bạch hóa lý do gợi ý (Explainable AI) cùng tiện ích hỗ trợ phân bổ lộ trình đã thể hiện rõ sự giao thoa thành công giữa nghiên cứu kỹ thuật chuyên sâu và tư duy thiết kế lấy người dùng làm trung tâm (User-Centered Design).

Mặc dù vẫn còn những giới hạn nhất định về quy mô dữ liệu thử nghiệm, nhưng những kết quả đạt được đã chứng minh rõ ràng tính đúng đắn và tiềm năng to lớn của việc áp dụng Graph Database vào việc mô hình hóa các mối quan hệ du lịch phức tạp. Với kiến trúc hệ thống mở, nền tảng công nghệ hiện đại và định hướng phát triển thuật toán rõ ràng trong tương lai, mô hình **Huế Travel AI** hoàn toàn có cơ sở vững chắc để tiếp tục được mở rộng, tối ưu hóa và trở thành một mảnh ghép công nghệ hữu ích, đóng góp tích cực vào công cuộc chuyển đổi số của ngành du lịch tỉnh Thừa Thiên Huế nói riêng và Việt Nam nói chung.

**Huế, tháng 02 năm 2026**

**Sinh viên thực hiện**

*Châu Đàn*
