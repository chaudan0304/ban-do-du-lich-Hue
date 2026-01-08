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


def close_driver():
    """Hàm đóng kết nối"""
    global driver
    if driver:
        driver.close()
        driver = None


def run_query(query, params=None):
    """Hàm chạy lệnh Cypher chung cho cả dự án"""
    driver = get_driver()
    if driver:
        with driver.session() as session:
            result = session.run(query, params or {})
            return [record.data() for record in result]
    return None


# === HÀM XỬ LÝ USER ===
def register_user(username, password):
    """Tạo node User mới với password đã mã hóa"""
    # 1. Kiểm tra user tồn tại chưa
    check_query = "MATCH (u:User {name: $name}) RETURN u"
    existing = run_query(check_query, {"name": username})

    if existing:
        return False, "Tên tài khoản đã tồn tại!"

    # 2. Mã hóa mật khẩu
    pw_hash = generate_password_hash(password)

    # 3. Tạo User mới
    create_query = """
    CREATE (u:User {name: $name, password: $pw_hash})
    RETURN u.name
    """
    run_query(create_query, {"name": username, "pw_hash": pw_hash})
    return True, "Đăng ký thành công!"


def verify_user(username, password):
    """Kiểm tra đăng nhập"""
    query = "MATCH (u:User {name: $name}) RETURN u.name AS name, u.password AS password"
    result = run_query(query, {"name": username})

    if not result:
        return None  # Không tìm thấy user

    user_data = result[0]
    # So sánh mật khẩu nhập vào với mật khẩu mã hóa trong DB
    if check_password_hash(user_data["password"], password):
        return user_data
    else:
        return None


# [File: db.py] - Thêm vào cuối file


def add_user_like(username, location_name):
    """
    Tạo mối quan hệ: (User)-[:LIKED]->(Location)
    """
    query = """
    MATCH (u:User {name: $u_name})
    MATCH (l:Location {name: $l_name})
    MERGE (u)-[:LIKED]->(l)
    RETURN l.name
    """
    try:
        # Sử dụng lại hàm run_query có sẵn
        result = run_query(query, {"u_name": username, "l_name": location_name})
        return True, f"Đã thích địa điểm: {location_name}"
    except Exception as e:
        return False, str(e)
