import os
from dotenv import load_dotenv
from neo4j import GraphDatabase
from werkzeug.security import generate_password_hash, check_password_hash

# Đọc file .env ở thư mục gốc
load_dotenv()

# Lấy giá trị từ .env (Neo4j connection)
URI = os.getenv("NEO4J_URI")
USER = os.getenv("NEO4J_USER")
PASS = os.getenv("NEO4J_PASS")

if not all([URI, USER, PASS]):
    raise ValueError(
        "❌ Thiếu biến môi trường trong file .env! Kiểm tra NEO4J_URI, NEO4J_USER, NEO4J_PASS"
    )

AUTH = (USER, PASS)
driver = None


# === KẾT NỐI NEO4J ===
def get_driver():
    """Hàm lấy driver kết nối (Singleton)"""
    global driver
    if driver is None:
        try:
            driver = GraphDatabase.driver(URI, auth=AUTH)
            driver.verify_connectivity()
            print("✅ (db.py) Đã kết nối Neo4j thành công!")
        except Exception as e:
            print(f"❌ (db.py) Lỗi kết nối: {e}")
            driver = None
    return driver


# Hàm đóng kết nối
def close_driver():
    """Hàm đóng kết nối"""
    global driver
    if driver:
        driver.close()
        driver = None


# === HÀM CHẠY TRUY VẤN CHUNG ===
def run_query(query, params=None):
    """Hàm chạy lệnh Cypher chung, bắt lỗi và trả về kết quả an toàn"""
    driver = get_driver()
    if not driver:
        return None

    try:
        with driver.session() as session:
            result = session.run(query, params or {})
            records = [record.data() for record in result]
            return records
    except Exception as e:
        error_str = str(e).lower()
        print(f"❌ LỖI NEO4J: {e}")

        # Phát hiện lỗi constraint (tên trùng)
        if "constraint" in error_str or "already exists" in error_str:
            return "CONSTRAINT_VIOLATION"
        return None


# === HÀM XỬ LÝ USER ===
def register_user(username, password):
    """Tạo node User mới với password đã mã hóa"""
    # 1. Kiểm tra user tồn tại (đã ổn)
    check_query = "MATCH (u:User {name: $name}) RETURN u"
    existing = run_query(check_query, {"name": username})

    if existing and existing != "CONSTRAINT_VIOLATION":
        return False, "Tên tài khoản đã tồn tại!"

    # 2. Mã hóa mật khẩu
    pw_hash = generate_password_hash(password)

    # 3. Tạo User mới + kiểm tra kết quả thực sự
    create_query = """
    CREATE (u:User {name: $name, password: $pw_hash, role: 'user'})
    RETURN u.name AS name
    """

    result = run_query(create_query, {"name": username, "pw_hash": pw_hash})

    if result == "CONSTRAINT_VIOLATION":
        return False, "Tên tài khoản đã tồn tại!"

    if result is None or len(result) == 0:
        return False, "Đăng ký thất bại! Có thể do lỗi hệ thống hoặc tên đã tồn tại."

    return True, "Đăng ký thành công!"


# Hàm xác minh đăng nhập
def verify_user(username, password):
    """Kiểm tra đăng nhập và trả về thông tin user kèm quyền hạn"""
    # Lấy thêm thuộc tính 'role'
    query = "MATCH (u:User {name: $name}) RETURN u.name AS name, u.password AS password, u.role AS role"
    result = run_query(query, {"name": username})

    if not result:
        return None

    user_data = result[0]
    if check_password_hash(user_data["password"], password):
        # Nếu không có role (user cũ), mặc định là 'user'
        if not user_data.get("role"):
            user_data["role"] = "user"
        return user_data
    else:
        return None


# --- Hàm cho Admin ---
def get_all_users():
    """Lấy danh sách tất cả user (trừ admin)"""
    query = """
    MATCH (u:User)
    WHERE u.role IS NULL OR u.role <> 'admin'
    RETURN DISTINCT u.name AS name,
       size([(u)-[:LIKED]->(l) | l]) AS liked_count
    ORDER BY name ASC
    """
    return run_query(query)


# Hàm xóa user theo tên
def delete_user_by_name(username):
    """Xóa user và các mối quan hệ của họ"""
    query = "MATCH (u:User {name: $name}) DETACH DELETE u"
    run_query(query, {"name": username})
    return True


# --- Hàm xử lý Like/Unlike địa điểm ---
def toggle_like_location(username, location_name):
    """
    Nếu chưa thích -> Tạo quan hệ [:LIKED]
    Nếu đã thích -> Xóa quan hệ [:LIKED]
    Trả về: Trạng thái mới (True = Đang thích, False = Đã bỏ thích)
    """
    # 1. Kiểm tra quan hệ hiện tại
    check_query = """
    MATCH (u:User {name: $u_name})-[r:LIKED]->(l:Location {name: $l_name})
    RETURN r
    """
    exists = run_query(check_query, {"u_name": username, "l_name": location_name})

    if exists:
        # Đã thích -> Xóa (Unlike)
        delete_query = """
        MATCH (u:User {name: $u_name})-[r:LIKED]->(l:Location {name: $l_name})
        DELETE r
        """
        run_query(delete_query, {"u_name": username, "l_name": location_name})
        return False, "Đã bỏ thích"
    else:
        # Chưa thích -> Tạo (Like)
        create_query = """
        MATCH (u:User {name: $u_name}), (l:Location {name: $l_name})
        MERGE (u)-[:LIKED]->(l)
        """
        run_query(create_query, {"u_name": username, "l_name": location_name})
        return True, "Đã thêm vào danh sách yêu thích!"
