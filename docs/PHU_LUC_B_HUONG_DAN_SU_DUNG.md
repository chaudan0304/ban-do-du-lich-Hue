# PHỤ LỤC B: HƯỚNG DẪN SỬ DỤNG

## B.1. Giao diện Tổng quan

Khi truy cập hệ thống, người dùng sẽ thấy giao diện chính gồm 2 phần:

- **Thanh bên trái (Sidebar):** Chứa các chức năng tương tác — đăng nhập, tìm kiếm, lọc địa điểm, gợi ý AI, lập lộ trình.
- **Bản đồ (phần chính):** Hiển thị bản đồ tương tác Leaflet.js với markers đánh dấu các địa điểm du lịch.

---

## B.2. Chức năng Người dùng

### B.2.1. Đăng ký và Đăng nhập

1. Nhấn nút **Đăng nhập** trên sidebar.
2. Trong modal hiện ra, chọn tab **Đăng ký** nếu chưa có tài khoản.
3. Điền username, password, xác nhận password và email.
4. Nhấn **Đăng ký** → Hệ thống tạo tài khoản và tự động đăng nhập.

### B.2.2. Xem và Lọc Địa điểm

1. Mặc định, sidebar hiển thị tất cả 52 địa điểm sắp xếp theo điểm AI.
2. Sử dụng các **tab danh mục** (Tất cả, Di tích, Ẩm thực, Tâm linh...) để lọc.
3. Sử dụng **thanh tìm kiếm** để tìm nhanh theo tên.
4. Nhấn vào card địa điểm → bản đồ zoom vào vị trí và hiển thị popup.

### B.2.3. Xem Chi tiết Địa điểm

1. Nhấn vào tên hoặc marker trên bản đồ.
2. Panel chi tiết bên phải hiển thị:
   - Hình ảnh, tên, mô tả, danh mục.
   - **Thanh điểm AI** (Progress Bar) theo tỷ lệ 60-30-10.
   - Nút **❤️ Thích** và **🗺️ Chỉ đường** (mở Google Maps).
   - Danh sách đánh giá từ người dùng khác.
   - Địa điểm tương tự (cùng danh mục).

### B.2.4. Thích (Like) Địa điểm

1. Đăng nhập vào hệ thống.
2. Nhấn nút **❤️** trên panel chi tiết hoặc card địa điểm.
3. Nhấn lần nữa để bỏ thích (toggle).
4. Các địa điểm đã thích sẽ ảnh hưởng đến gợi ý AI.

### B.2.5. Viết Đánh giá

1. Đăng nhập vào hệ thống.
2. Mở panel chi tiết địa điểm.
3. Chọn số sao (1–5 ⭐).
4. Viết bình luận (tùy chọn).
5. Nhấn **Gửi đánh giá**.
6. Hệ thống tự động phân tích cảm xúc (😊 Tích cực / 😐 Trung lập / 😔 Tiêu cực) và chủ đề bình luận.

### B.2.6. Xem Gợi ý AI

1. Đăng nhập vào hệ thống.
2. Nhấn tab **✨ Gợi ý AI** trên sidebar.
3. Hệ thống hiển thị Top 12 địa điểm gợi ý kèm:
   - **Lý do gợi ý** bằng ngôn ngữ tự nhiên (ví dụ: "3 người có sở thích giống bạn đã thích nơi này").
   - **Biểu đồ phân tích** thể hiện tỷ lệ đóng góp từng thành phần (Collaborative, Content-Based, PageRank).
   - **Danh sách users tương đồng** (nếu có).

4. Nhấn vào card gợi ý để xem chi tiết trên bản đồ.

*Lưu ý:* Gợi ý sẽ chính xác hơn khi bạn thích và đánh giá nhiều địa điểm hơn.

### B.2.7. Tiện ích Sắp xếp Lộ trình

1. Đăng nhập vào hệ thống.
2. Nhấn nút **Sắp xếp lộ trình** trên sidebar.
3. Trong modal tiện ích hiện ra:
   - Chọn **số ngày** bạn muốn phân bổ (1–5 ngày).
   - Chọn **danh mục** mong muốn.
   - Chọn **chế độ**:
     - *Từ gợi ý hệ thống:* Tiện ích tự lọc danh sách hệ thống đề xuất.
     - *Từ danh sách đã thích:* Ưu tiên các điểm bạn đã thả cảm xúc ❤️.
4. Nhấn **Tạo lộ trình**.
5. Hệ thống sẽ áp dụng phép tính đơn giản để ghép nối các địa điểm gần nhau trên bản đồ thành **timeline** với 4 buổi/ngày.
6. Nếu một điểm đến chưa vừa ý, người dùng có thể bấm **thay thế** bằng một điểm khác gần đó.
7. Nhấn **Lưu lộ trình** để xem lại sau.

### B.2.8. Quản lý Hồ sơ

1. Nhấn avatar/tên người dùng trên sidebar.
2. Modal hồ sơ hiển thị:
   - Thông tin cá nhân (có thể chỉnh sửa).
   - Danh sách địa điểm đã thích.
   - Danh sách đánh giá đã viết.
   - Các lộ trình đã lưu.

### B.2.9. Bản đồ Nhiệt (Heatmap)

1. Nhấn nút **🔥 Bản đồ nhiệt** ở góc dưới bản đồ.
2. Overlay nhiệt hiển thị mật độ phổ biến dựa trên điểm PageRank.
3. Vùng màu đỏ/vàng = địa điểm rất phổ biến.
4. Vùng màu xanh = ít phổ biến hơn.
5. Nhấn lại nút để tắt Heatmap.

---

## B.3. Chức năng Quản trị viên (Admin)

*Yêu cầu: Đăng nhập với tài khoản có vai trò Admin.*

### B.3.1. Truy cập Dashboard Admin

1. Đăng nhập với tài khoản Admin.
2. Nút **⚙️ Admin** xuất hiện trên sidebar.
3. Nhấn để mở Dashboard quản trị.

### B.3.2. Quản lý Người dùng

- Xem danh sách tất cả người dùng (username, vai trò, số lượt like, số đánh giá).
- Xem chi tiết hồ sơ và bình luận của từng user.
- Xóa tài khoản người dùng (kèm xóa tất cả dữ liệu liên quan).

### B.3.3. Quản lý Địa điểm (CRUD)

- **Thêm** địa điểm mới: Nhập tên, mô tả, tọa độ (lat, lng), hình ảnh, danh mục.
- **Sửa** thông tin địa điểm hiện có.
- **Xóa** địa điểm (kèm xóa tất cả tương tác liên quan).

### B.3.4. Chạy lại Thuật toán AI

1. Trong Dashboard Admin, nhấn nút **Chạy thuật toán AI**.
2. Hệ thống thực thi `setup_algo.py`, cập nhật lại:
   - Relationship INTERACTED, RELATED_TO, SIMILAR_TO, LOC_SIMILAR.
   - Điểm PageRank (User và Location graph).
   - Chuẩn hóa kết quả.
3. Thời gian chạy: ~7 giây.

*Lưu ý: Nên chạy lại thuật toán sau khi có nhiều tương tác mới để cập nhật điểm gợi ý.*

---

## B.4. Phím tắt và Mẹo Sử dụng

| Hành động | Mẹo |
|---|---|
| Tìm nhanh địa điểm | Nhập tên vào ô tìm kiếm trên sidebar |
| Zoom bản đồ | Cuộn chuột hoặc nhấn +/- |
| Xem tất cả markers | Nhấn nút "Fit All" (nếu có) hoặc zoom out |
| Nội dung gợi ý tốt hơn | Hãy Like và Review nhiều địa điểm |
| Chỉ đường nhanh | Nhấn nút 🗺️ trên panel chi tiết → mở Google Maps |
