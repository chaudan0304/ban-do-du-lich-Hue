
import os
import datetime
from neo4j import GraphDatabase
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv

# Load biến môi trường
load_dotenv()

# Cấu hình Neo4j connection
URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
USER = os.getenv("NEO4J_USER", "neo4j")
PASSWORD = os.getenv("NEO4J_PASS", "12345678")

_driver = None

def get_driver():
    global _driver
    if _driver is None:
        try:
            _driver = GraphDatabase.driver(URI, auth=(USER, PASSWORD))
            _driver.verify_connectivity()
            print("✅ Kết nối Neo4j thành công!")
        except Exception as e:
            print(f"❌ Lỗi kết nối Neo4j: {e}")
            _driver = None
    return _driver

def close_driver():
    global _driver
    if _driver:
        _driver.close()
        _driver = None

# --------------------------------------------------------------------------------------
# HÀM CHUNG THỰC THI QUERY
# --------------------------------------------------------------------------------------
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

# --------------------------------------------------------------------------------------
# CÁC HÀM XỬ LÝ USER (ĐĂNG KÝ, ĐĂNG NHẬP)
# --------------------------------------------------------------------------------------
def register_user(username, password):
    """Đăng ký tài khoản mới (lưu hash password)"""
    # 1. Kiểm tra user đã tồn tại chưa
    check_query = "MATCH (u:User {name: $name}) RETURN u"
    existing = run_query(check_query, {"name": username})
    
    if existing:
        return False, "Tài khoản đã tồn tại"
    
    if existing == "CONSTRAINT_VIOLATION": # Double check
        return False, "Tài khoản đã tồn tại"

    # 2. Hash mật khẩu và lưu
    hashed_pw = generate_password_hash(password)
    create_query = """
    CREATE (u:User {name: $name, password: $password, role: 'user', created_at: datetime()})
    RETURN u
    """
    result = run_query(create_query, {"name": username, "password": hashed_pw})
    
    if result:
        return True, "Đăng ký thành công"
    return False, "Lỗi khi tạo tài khoản"

def verify_user(username, password):
    """Xác thực đăng nhập"""
    query = "MATCH (u:User {name: $name}) RETURN u"
    result = run_query(query, {"name": username})
    
    if not result:
        return False, None, "Tài khoản không tồn tại"
    
    user_data = result[0]['u']
    stored_hash = user_data.get('password')
    
    # Nếu user cũ chưa có pass (hoặc import từ file), có thể check text thường (tùy chọn)
    if not stored_hash:
        return False, None, "Tài khoản lỗi (chưa có mật khẩu)"

    if check_password_hash(stored_hash, password):
        return True, user_data.get('role', 'user'), "Đăng nhập thành công"
    else:
        return False, None, "Sai mật khẩu"

# --------------------------------------------------------------------------------------
# CÁC HÀM QUẢN TRỊ (ADMIN)
# --------------------------------------------------------------------------------------
def get_all_users():
    """Lấy danh sách tất cả user (trừ admin nếu muốn lọc)"""
    query = """
    MATCH (u:User) 
    OPTIONAL MATCH (u)-[r:LIKED]->()
    RETURN u.name as name, u.role as role, count(r) as liked_count
    ORDER BY u.created_at DESC
    """
    return run_query(query)

def delete_user_by_name(username):
    """Xóa user khỏi hệ thống"""
    query = "MATCH (u:User {name: $name}) DETACH DELETE u"
    run_query(query, {"name": username})
    return True

# --------------------------------------------------------------------------------------
# CÁC HÀM LIÊN QUAN ĐẾN ĐỊA ĐIỂM & TƯƠNG TÁC
# --------------------------------------------------------------------------------------
def toggle_like_location(username, location_name):
    """
    Like/Unlike một địa điểm.
    Trả về (is_liked, message)
    """
    # 1. Kiểm tra trạng thái hiện tại
    check_query = """
    MATCH (u:User {name: $u_name})-[r:LIKED]->(l:Location {name: $l_name})
    RETURN r
    """
    existing = run_query(check_query, {"u_name": username, "l_name": location_name})

    if existing:
        # Đã like -> Xóa (Unlike)
        delete_query = """
        MATCH (u:User {name: $u_name})-[r:LIKED]->(l:Location {name: $l_name})
        DELETE r
        """
        run_query(delete_query, {"u_name": username, "l_name": location_name})
        return False, "Đã bỏ thích"
    else:
        # Chưa like -> Tạo quan hệ LIKED
        create_query = """
        MATCH (u:User {name: $u_name}), (l:Location {name: $l_name})
        MERGE (u)-[r:LIKED]->(l)
        SET r.timestamp = datetime()
        """
        run_query(create_query, {"u_name": username, "l_name": location_name})
        return True, "Đã thích địa điểm"

# --- Hàm xử lý Review ---
def add_review(username, location_name, rating, comment):
    """
    Thêm hoặc cập nhật đánh giá của user
    """
    query = """
    MATCH (u:User {name: $u_name})
    MATCH (l:Location {name: $l_name})
    MERGE (u)-[r:REVIEWED]->(l)
    SET r.rating = $rating, 
        r.comment = $comment, 
        r.timestamp = datetime()
    """
    # Sau khi add review, tính toán lại rating trung bình cho location
    recalc_query = """
    MATCH (l:Location {name: $l_name})<-[r:REVIEWED]-(:User)
    WITH l, avg(r.rating) AS avgRating, count(r) AS totalReviews
    SET l.rating = avgRating, l.reviewCount = totalReviews
    RETURN avgRating, totalReviews
    """
    
    try:
        run_query(query, {
            "u_name": username, 
            "l_name": location_name, 
            "rating": float(rating), 
            "comment": comment
        })
        stats = run_query(recalc_query, {"l_name": location_name})
        return True, stats[0] if stats else None
    except Exception as e:
        return False, str(e)


def get_location_reviews(location_name):
    """
    Lấy danh sách review của địa điểm
    """
    query = """
    MATCH (u:User)-[r:REVIEWED]->(l:Location {name: $l_name})
    RETURN u.name AS user, 
           r.rating AS rating, 
           r.comment AS comment, 
           toString(r.timestamp) AS time
    ORDER BY r.timestamp DESC
    """
    return run_query(query, {"l_name": location_name})


def delete_review(username, location_name):
    """
    Xóa đánh giá của user đối với một địa điểm
    """
    query = """
    MATCH (u:User {name: $u_name})-[r:REVIEWED]->(l:Location {name: $l_name})
    DELETE r
    """
    # Tính toán lại rating sau khi xóa
    recalc_query = """
    MATCH (l:Location {name: $l_name})
    OPTIONAL MATCH (l)<-[r:REVIEWED]-(:User)
    WITH l, avg(r.rating) AS avgRating, count(r) AS totalReviews
    SET l.rating = CASE WHEN totalReviews > 0 THEN avgRating ELSE 0 END, 
        l.reviewCount = totalReviews
    RETURN avgRating, totalReviews
    """
    
    try:
        run_query(query, {"u_name": username, "l_name": location_name})
        stats = run_query(recalc_query, {"l_name": location_name})
        return True, stats[0] if stats else {"avgRating": 0, "totalReviews": 0}
    except Exception as e:
        return False, str(e)
