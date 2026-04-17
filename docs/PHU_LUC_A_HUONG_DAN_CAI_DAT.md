# PHỤ LỤC A: HƯỚNG DẪN CÀI ĐẶT VÀ TRIỂN KHAI

## A.1. Yêu cầu Hệ thống

### A.1.1. Phần mềm cần thiết

| Phần mềm | Phiên bản yêu cầu | Mục đích |
|---|---|---|
| Python | ≥ 3.9 | Ngôn ngữ lập trình backend |
| Neo4j Community Edition | ≥ 5.11 | Hệ quản trị CSDL đồ thị |
| Neo4j GDS Plugin | ≥ 2.24 | Thư viện thuật toán đồ thị |
| Git | Bất kỳ | Quản lý mã nguồn |
| Trình duyệt web | Chrome/Firefox/Edge | Truy cập ứng dụng |

### A.1.2. Phần cứng tối thiểu

| Thành phần | Yêu cầu tối thiểu | Khuyến nghị |
|---|---|---|
| CPU | 2 nhân | 4 nhân |
| RAM | 4 GB | 8 GB |
| Ổ cứng | 2 GB trống | 5 GB trống |
| Hệ điều hành | Windows 10 / Ubuntu 20.04 | Windows 11 / Ubuntu 22.04 |

---

## A.2. Cài đặt Neo4j

### A.2.1. Tải và cài đặt Neo4j

**Bước 1:** Truy cập trang chủ Neo4j: https://neo4j.com/download/

**Bước 2:** Tải Neo4j Desktop hoặc Neo4j Community Edition.

**Bước 3:** Cài đặt theo hướng dẫn của hệ điều hành.

**Bước 4:** Khởi động Neo4j và tạo database mới với mật khẩu tùy chọn.

### A.2.2. Cài đặt Neo4j GDS Plugin

**Bước 1:** Tải plugin GDS từ: https://neo4j.com/download-center/#graph-data-science

**Bước 2:** Sao chép file `.jar` vào thư mục `plugins/` của Neo4j:

- **Windows:** `C:\Users\<username>\.Neo4jDesktop\relate-data\dbmss\<dbms-id>\plugins\`
- **Linux:** `/var/lib/neo4j/plugins/`

**Bước 3:** Thêm dòng sau vào file `neo4j.conf`:

```
dbms.security.procedures.unrestricted=gds.*
dbms.security.procedures.allowlist=gds.*
```

**Bước 4:** Khởi động lại Neo4j.

**Bước 5:** Xác minh GDS đã cài đặt thành công bằng truy vấn Cypher:

```cypher
CALL gds.version()
```

---

## A.3. Cài đặt Ứng dụng

### A.3.1. Clone mã nguồn

```bash
git clone https://github.com/chaudan0304/ban-do-du-lich-Hue.git
cd ban-do-du-lich-Hue
```

### A.3.2. Tạo môi trường ảo Python

```bash
# Windows
python -m venv .venv
.venv\Scripts\activate

# Linux/MacOS
python3 -m venv .venv
source .venv/bin/activate
```

### A.3.3. Cài đặt các thư viện phụ thuộc

```bash
pip install -r requirements.txt
```

Danh sách thư viện trong `requirements.txt`:

```
Flask>=2.0.0
Flask-Login>=0.6.0
neo4j>=5.0.0
pandas>=1.3.0
python-dotenv>=0.19.0
openpyxl>=3.0.0
werkzeug>=2.0.0
```

### A.3.4. Cấu hình biến môi trường

**Bước 1:** Sao chép file mẫu:

```bash
cp .env.example .env
```

**Bước 2:** Chỉnh sửa file `.env` với thông tin kết nối thực tế:

```env
# Kết nối Neo4j Database
NEO4J_URI=bolt://127.0.0.1:7687
NEO4J_USER=neo4j
NEO4J_PASS=your_neo4j_password_here

# Flask Secret Key (tạo bằng lệnh: python -c "import secrets; print(secrets.token_hex(32))")
FLASK_SECRET_KEY=your_secret_key_here
```

---

## A.4. Nạp Dữ liệu Ban đầu

### A.4.1. Import dữ liệu địa điểm

```bash
python scripts/import_data.py
```

Script này sẽ đọc file `data/data.xlsx` và tạo các node `:Location`, `:Category`, `:City` cùng các relationship tương ứng trong Neo4j.

### A.4.2. Tạo dữ liệu mẫu (tùy chọn)

```bash
python scripts/generate_users.py
```

Script này sẽ tạo một số user mẫu với các tương tác (Like, Review) để thử nghiệm thuật toán gợi ý.

### A.4.3. Chạy thuật toán AI

```bash
python setup_algo.py
```

Script này thực hiện:
1. Tạo relationship `:INTERACTED` (tổng hợp từ LIKED + REVIEWED).
2. Tạo relationship `:RELATED_TO` (liên kết giữa các địa điểm).
3. Chạy Weighted PageRank trên 2 đồ thị.
4. Chạy Node Similarity (Jaccard) cho User và Location.
5. Chuẩn hóa kết quả.

Thời gian chạy ước tính: ~7 giây.

---

## A.5. Khởi chạy Ứng dụng

### A.5.1. Chạy ở chế độ phát triển

```bash
python app.py
```

Ứng dụng sẽ khởi chạy tại: **http://127.0.0.1:5000**

### A.5.2. Truy cập ứng dụng

Mở trình duyệt web và truy cập: `http://127.0.0.1:5000`

### A.5.3. Tài khoản mặc định

| Vai trò | Username | Password |
|---|---|---|
| Admin | admin | admin123 |

*Lưu ý: Nên đổi mật khẩu admin ngay sau lần đăng nhập đầu tiên.*

---

## A.6. Khắc phục Sự cố Thường gặp

| Lỗi | Nguyên nhân | Giải pháp |
|---|---|---|
| `Connection refused` | Neo4j chưa khởi động | Khởi động Neo4j trước khi chạy app |
| `Authentication required` | Sai mật khẩu Neo4j | Kiểm tra lại thông tin trong `.env` |
| `ModuleNotFoundError` | Chưa cài thư viện | Chạy `pip install -r requirements.txt` |
| `GDS not found` | Chưa cài plugin GDS | Cài đặt GDS theo mục A.2.2 |
| `Port 5000 already in use` | Cổng bị chiếm | Dừng ứng dụng khác hoặc đổi port |
