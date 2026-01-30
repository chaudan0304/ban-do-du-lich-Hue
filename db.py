import os
import datetime
import pandas as pd
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
# HÀM ĐỒNG BỘ DỮ LIỆU TỪ NEO4J SANG EXCEL
# --------------------------------------------------------------------------------------
def sync_locations_to_excel(excel_path="data.xlsx"):
    """
    Đồng bộ dữ liệu Locations từ Neo4j vào file Excel.
    Giữ nguyên các sheet Users và Likes.
    """
    try:
        # 1. Lấy tất cả locations từ Neo4j
        query = """
        MATCH (l:Location)
        OPTIONAL MATCH (l)-[:LOCATED_IN]->(c:City)
        OPTIONAL MATCH (l)-[:HAS_CATEGORY]->(cat:Category)
        RETURN l.id AS id, l.name AS name, l.desc AS description,
               c.name AS city, cat.name AS category,
               l.lat AS lat, l.lng AS lng, l.image AS image
        ORDER BY l.name
        """
        locations = run_query(query)

        if not locations:
            print("⚠️ Không có dữ liệu locations để đồng bộ")
            return False

        # 2. Đọc các sheet hiện có (Users, Likes)
        existing_sheets = {}
        try:
            xl = pd.ExcelFile(excel_path)
            for sheet in xl.sheet_names:
                if sheet != "Locations":
                    existing_sheets[sheet] = pd.read_excel(excel_path, sheet_name=sheet)
        except FileNotFoundError:
            print(f"📝 File {excel_path} chưa tồn tại, sẽ tạo mới")

        # 3. Tạo DataFrame từ locations
        df_locations = pd.DataFrame(locations)

        # 4. Ghi vào Excel với openpyxl engine
        with pd.ExcelWriter(excel_path, engine="openpyxl", mode="w") as writer:
            # Ghi sheet Locations trước
            df_locations.to_excel(writer, sheet_name="Locations", index=False)

            # Ghi lại các sheet khác (Users, Likes)
            for sheet_name, df in existing_sheets.items():
                df.to_excel(writer, sheet_name=sheet_name, index=False)

        print(f"✅ Đã đồng bộ {len(locations)} địa điểm vào {excel_path}")
        return True

    except Exception as e:
        print(f"❌ Lỗi đồng bộ Excel: {e}")
        return False


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

    if existing == "CONSTRAINT_VIOLATION":  # Double check
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


def get_user_info(username):
    """Lấy thông tin chi tiết người dùng"""
    query = """
    MATCH (u:User {name: $name})
    RETURN u.name as username, 
           u.fullname as fullname, 
           u.email as email, 
           u.role as role, 
           toString(u.created_at) as created_at
    """
    result = run_query(query, {"name": username})
    return result[0] if result else None


def update_user_info(username, fullname, email, new_password=None):
    """Cập nhật thông tin người dùng"""
    params = {"name": username, "fullname": fullname, "email": email}

    query = """
    MATCH (u:User {name: $name})
    SET u.fullname = $fullname,
        u.email = $email
    """

    if new_password:
        hashed_pw = generate_password_hash(new_password)
        query += ", u.password = $password"
        params["password"] = hashed_pw

    query += " RETURN u"

    try:
        run_query(query, params)
        return True, "Cập nhật thành công"
    except Exception as e:
        return False, str(e)


def verify_user(username, password):
    """Xác thực đăng nhập"""
    query = "MATCH (u:User {name: $name}) RETURN u"
    result = run_query(query, {"name": username})

    if not result:
        return False, None, "Tài khoản không tồn tại"

    user_data = result[0]["u"]
    stored_hash = user_data.get("password")

    # Nếu user cũ chưa có pass (hoặc import từ file), có thể check text thường (tùy chọn)
    if not stored_hash:
        return False, None, "Tài khoản lỗi (chưa có mật khẩu)"

    if check_password_hash(stored_hash, password):
        return True, user_data.get("role", "user"), "Đăng nhập thành công"
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
    OPTIONAL MATCH (u)-[rev:REVIEWED]->()
    WITH u.name as name, u.role as role, u.created_at as created_at, count(DISTINCT r) as liked_count, count(DISTINCT rev) as comment_count
    RETURN name, role, liked_count, comment_count
    ORDER BY coalesce(created_at, datetime()) DESC
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
    Tự động cập nhật :INTERACTED để thuật toán gợi ý real-time.
    """
    # 1. Kiểm tra trạng thái hiện tại
    check_query = """
    MATCH (u:User {name: $u_name})-[r:LIKED]->(l:Location {name: $l_name})
    RETURN r
    """
    existing = run_query(check_query, {"u_name": username, "l_name": location_name})

    if existing:
        # Đã like -> Xóa (Unlike) và cập nhật :INTERACTED
        unlike_query = """
        MATCH (u:User {name: $u_name})-[r:LIKED]->(l:Location {name: $l_name})
        DELETE r
        WITH u, l
        // Kiểm tra xem còn REVIEWED không
        OPTIONAL MATCH (u)-[rev:REVIEWED]->(l)
        WITH u, l, rev
        // Nếu còn REVIEWED, cập nhật weight; nếu không, xóa INTERACTED
        FOREACH (_ IN CASE WHEN rev IS NOT NULL THEN [1] ELSE [] END |
            MERGE (u)-[i:INTERACTED]->(l)
            SET i.weight = rev.rating,
                i.liked_score = 0,
                i.review_score = rev.rating
        )
        FOREACH (_ IN CASE WHEN rev IS NULL THEN [1] ELSE [] END |
            MERGE (u)-[i:INTERACTED]->(l)
            DELETE i
        )
        """
        run_query(unlike_query, {"u_name": username, "l_name": location_name})
        return False, "Đã bỏ thích"
    else:
        # Chưa like -> Tạo quan hệ LIKED và cập nhật :INTERACTED
        like_query = """
        MATCH (u:User {name: $u_name}), (l:Location {name: $l_name})
        MERGE (u)-[r:LIKED]->(l)
        SET r.timestamp = datetime()
        WITH u, l
        // Lấy rating từ REVIEWED nếu có
        OPTIONAL MATCH (u)-[rev:REVIEWED]->(l)
        WITH u, l, coalesce(rev.rating, 0) AS review_score
        // Cập nhật :INTERACTED với weight = 1 (liked) + review_score
        MERGE (u)-[i:INTERACTED]->(l)
        SET i.weight = 1 + review_score,
            i.liked_score = 1,
            i.review_score = review_score,
            i.created_at = datetime()
        """
        run_query(like_query, {"u_name": username, "l_name": location_name})
        return True, "Đã thích địa điểm"


# --- Hàm xử lý Review ---
def add_review(username, location_name, rating, comment):
    """
    Thêm hoặc cập nhật đánh giá của user.
    Tự động LIKE địa điểm (lưu) khi đánh giá.
    Tự động cập nhật :INTERACTED để thuật toán gợi ý real-time.
    """
    # Query tạo/cập nhật REVIEWED, tự động LIKED, và đồng bộ INTERACTED
    query = """
    MATCH (u:User {name: $u_name})
    MATCH (l:Location {name: $l_name})
    // Tạo REVIEWED
    MERGE (u)-[r:REVIEWED]->(l)
    SET r.rating = $rating, 
        r.comment = $comment, 
        r.timestamp = datetime()
    WITH u, l, $rating AS review_score
    // Tự động LIKE địa điểm khi đánh giá (lưu vào danh sách yêu thích)
    MERGE (u)-[like:LIKED]->(l)
    ON CREATE SET like.timestamp = datetime(), like.auto_from_review = true
    WITH u, l, review_score
    // Cập nhật :INTERACTED với weight = 1 (liked) + review_score
    MERGE (u)-[i:INTERACTED]->(l)
    SET i.weight = 1 + review_score,
        i.liked_score = 1,
        i.review_score = review_score,
        i.created_at = datetime()
    """
    # Sau khi add review, tính toán lại rating trung bình cho location
    recalc_query = """
    MATCH (l:Location {name: $l_name})<-[r:REVIEWED]-(:User)
    WITH l, avg(r.rating) AS avgRating, count(r) AS totalReviews
    SET l.rating = avgRating, l.reviewCount = totalReviews
    RETURN avgRating, totalReviews
    """

    try:
        run_query(
            query,
            {
                "u_name": username,
                "l_name": location_name,
                "rating": float(rating),
                "comment": comment,
            },
        )
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
    Xóa đánh giá của user đối với một địa điểm.
    Tự động cập nhật :INTERACTED để thuật toán gợi ý real-time.
    """
    # Query xóa REVIEWED và đồng bộ INTERACTED
    query = """
    MATCH (u:User {name: $u_name})-[r:REVIEWED]->(l:Location {name: $l_name})
    DELETE r
    WITH u, l
    // Kiểm tra xem còn LIKED không
    OPTIONAL MATCH (u)-[like:LIKED]->(l)
    WITH u, l, like
    // Nếu còn LIKED, cập nhật weight = 1; nếu không, xóa INTERACTED
    FOREACH (_ IN CASE WHEN like IS NOT NULL THEN [1] ELSE [] END |
        MERGE (u)-[i:INTERACTED]->(l)
        SET i.weight = 1,
            i.liked_score = 1,
            i.review_score = 0
    )
    FOREACH (_ IN CASE WHEN like IS NULL THEN [1] ELSE [] END |
        MERGE (u)-[i:INTERACTED]->(l)
        DELETE i
    )
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
