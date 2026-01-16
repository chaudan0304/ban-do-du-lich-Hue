# 🏛️ Hue Travel AI - Hệ thống Gợi ý Du lịch thông minh

> **Đề tài Khóa luận:** Xây dựng website khám phá địa điểm du lịch sử dụng Graph Database và Hệ khuyến nghị lai (Hybrid Recommendation System).

## 📌 Trạng thái dự án (Current Status)

**Cập nhật lần cuối:** 14/01/2026

### ✅ 1. Các tính năng đã hoàn thiện

- [x] **Cơ sở dữ liệu đồ thị (Neo4j):**
  - Xây dựng Schema: `User`, `Location`, `Category`, `City`.
  - Quan hệ: `(:User)-[:LIKED]->(:Location)`, `(:Location)-[:RELATED_TO]->(:Location)`.
  - Tối ưu hiệu suất: Đã tạo Index và Constraint cho `id` và `name`.
- [x] **Thuật toán Gợi ý (Core AI):**

  - **Phương pháp:** Hybrid Recommendation (Gợi ý lai).
  - **Chiến lược:** Xếp hạng phân tầng (Tiered Sorting):
    1.  **Tầng 1 (Collaborative Filtering):** Ưu tiên địa điểm được thích bởi những người có gu giống mình (`common_users`).
    2.  **Tầng 2 (Graph Centrality):** Nếu số lượng người tương đồng bằng nhau, sắp xếp theo tổng điểm sức mạnh (`PageRank Score`).
  - **Điểm số PageRank kép:**
    - `pr_pop` (Popularity): Độ phổ biến dựa trên lượt Vote của User.
    - `pr_conn` (Connectivity): Độ trung tâm dựa trên mạng lưới đồng xuất hiện (Co-occurrence).

- [x] **Xử lý dữ liệu (Data Pipeline):**

  - Tự động sinh dữ liệu chuẩn (`generate_excel.py`).
  - Nạp dữ liệu sạch vào Neo4j (`import_data.py`).
  - **QUAN TRỌNG:** Đã xử lý vấn đề "Typo" dữ liệu (Fix lỗi _Biển Thuận An_ vs _Bãi biển Thuận An_) -> Điểm số PageRank đã cân bằng chính xác.

- [x] **Giao diện người dùng (Frontend):**
  - Bản đồ tương tác LeafletJS (Marker, Popup).
  - Sidebar hiển thị danh sách địa điểm và Panel chi tiết.
  - **Responsive Mobile:** Đã fix lỗi hiển thị trên điện thoại (Chuyển sang chế độ Modal/Fixed Position thay vì Slide trượt).
