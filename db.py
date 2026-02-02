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
        print(f"[ERROR] NEO4J: {e}")

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
           coalesce(toString(u.created_at), toString(datetime())) as created_at
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
        return False, None, None, "Tài khoản không tồn tại"

    user_data = result[0]["u"]
    stored_hash = user_data.get("password")

    # Nếu user cũ chưa có pass (hoặc import từ file), có thể check text thường (tùy chọn)
    if not stored_hash:
        return False, None, None, "Tài khoản lỗi (chưa có mật khẩu)"

    if check_password_hash(stored_hash, password):
        return (
            True,
            user_data.get("role", "user"),
            user_data.get("fullname", ""),
            "Đăng nhập thành công",
        )
    else:
        return False, None, None, "Sai mật khẩu"


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


def verify_user_account(username, email):
    """Kiểm tra xem username và email có khớp không"""
    query = (
        "MATCH (u:User {name: $name}) WHERE toLower(u.email) = toLower($email) RETURN u"
    )
    result = run_query(query, {"name": username, "email": email})
    return True if result else False


def reset_user_password(username, email, new_password):
    """
    Đặt lại mật khẩu nếu username và email trùng khớp.
    """
    # 1. Kiểm tra khớp thông tin
    check_query = (
        "MATCH (u:User {name: $name}) WHERE toLower(u.email) = toLower($email) RETURN u"
    )
    user = run_query(check_query, {"name": username, "email": email})

    if not user:
        return False, "Thông tin tài khoản hoặc email không chính xác."

    # 2. Cập nhật mật khẩu mới
    new_hash = generate_password_hash(new_password)
    update_query = """
    MATCH (u:User {name: $name})
    SET u.password = $pass
    """
    run_query(update_query, {"name": username, "pass": new_hash})

    return True, "Đổi mật khẩu thành công! Hãy đăng nhập lại."


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
        MATCH (u:User {name: $u_name})
        MATCH (l:Location {name: $l_name})
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
def add_review(username, location_name, rating, comment, sentiment="Neutral"):
    """
    Thêm hoặc cập nhật đánh giá của user.
    Tự động LIKE địa điểm (lưu) khi đánh giá.
    Tự động cập nhật :INTERACTED để thuật toán gợi ý real-time.
    Cập nhật thêm sentiment (cảm xúc) từ bình luận.
    """
    # Query tạo/cập nhật REVIEWED, tự động LIKED, và đồng bộ INTERACTED
    query = """
    MATCH (u:User {name: $u_name})
    MATCH (l:Location {name: $l_name})
    // Tạo REVIEWED
    MERGE (u)-[r:REVIEWED]->(l)
    SET r.rating = $rating, 
        r.comment = $comment, 
        r.sentiment = $sentiment,
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
                "sentiment": sentiment,
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
           r.sentiment AS sentiment,
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


# --------------------------------------------------------------------------------------
# AI ITINERARY PLANNER (LẬP LỘ TRÌNH)
# --------------------------------------------------------------------------------------
def generate_itinerary(username, days=1, preferences=[], use_liked=False):
    """
    Tạo lộ trình du lịch thông minh.
    :param use_liked: Nếu True, chỉ chọn từ danh sách Đã thích.
    """
    print(
        f"DEBUG: Generating {days}-day itinerary. Prefs: {preferences}. Using Liked: {use_liked}"
    )

    # 1. Tìm ứng viên (Candidate Selection)
    # Lọc theo Category nếu có
    category_match = ""
    category_where = ""

    pref_list = str(preferences)
    if preferences and len(preferences) > 0:
        category_match = "MATCH (l)-[:HAS_CATEGORY]->(cat:Category)"
        category_where = f"AND cat.name IN {pref_list}"
    else:
        category_match = "OPTIONAL MATCH (l)-[:HAS_CATEGORY]->(cat:Category)"

    if use_liked:
        # --- CHẾ ĐỘ: LẤY TỪ DANH SÁCH ĐÃ THÍCH ---
        query = f"""
        MATCH (u:User {{name: $name}})-[:LIKED]->(l:Location)
        {category_match}
        WHERE 1=1
        {category_where}
        
        WITH l, cat
        // Vẫn lấy score để sắp xếp ưu tiên
        RETURN l.name as name, 
               cat.name as category, 
               l.lat as lat, 
               l.lng as lng, 
               l.image as image, 
               l.desc as description,
               coalesce(l.pagerankNorm, 0.1) as score
        ORDER BY score DESC
        """
    else:
        # --- CHẾ ĐỘ: GỢI Ý MỚI (AI RECOMMENDATION) ---
        query = f"""
        MATCH (u:User {{name: $name}})
        MATCH (l:Location)
        {category_match}
        // Chỉ lấy địa điểm CHƯA đi (chưa interacted/reviewed)
        WHERE NOT (u)-[:INTERACTED]->(l) AND NOT (u)-[:REVIEWED]->(l)
        {category_where}
        
        OPTIONAL MATCH (l)<-[i:INTERACTED]-(other:User)
        WITH l, cat, count(i) as popularity, coalesce(l.pagerankNorm, l.pagerankScore, 0.15) as pr
        
        // Scoring: PageRank + Popularity
        WITH l, cat, (pr * 0.5 + log(popularity + 1) * 0.3) as score
        ORDER BY score DESC
        LIMIT 50
        
        RETURN l.name as name, 
               cat.name as category, 
               l.lat as lat, 
               l.lng as lng, 
               l.image as image, 
               l.desc as description,
               score
        """

    try:
        print(f"DEBUG: Running Planner Query for user={{username}}...")

        candidates = run_query(query, {"name": username})
        print(f"DEBUG: Candidates found: {{len(candidates) if candidates else 0}}")

        if not candidates:
            # Fallback nếu không có đề xuất nào
            print("DEBUG: No candidates found, running fallback...")

            # Fix fallback query tương tự
            fallback_where = ""
            if preferences and len(preferences) > 0:
                fallback_where = f"WHERE cat.name IN {str(preferences)}"

            fallback_query = f"""
            MATCH (l:Location)
            OPTIONAL MATCH (l)-[:HAS_CATEGORY]->(cat:Category)
            {fallback_where}
            RETURN l.name as name, 
                   cat.name as category, 
                   l.lat as lat, 
                   l.lng as lng, 
                   l.image as image, 
                   l.desc as description, 
                   coalesce(l.rating, 0) as score
            ORDER BY score DESC LIMIT 30
            """
            candidates = run_query(fallback_query, {})
            print(
                f"DEBUG: Fallback candidates: {{len(candidates) if candidates else 0}}"
            )
        food_keywords = [
            "ẩm thực",
            "bún",
            "chè",
            "cơm",
            "bánh",
            "cafe",
            "cà phê",
            "quán",
            "nhà hàng",
            "chợ",
            "món",
            "ăn",
            "uống",
        ]

        pool_sightseeing = []
        pool_food = []

        for item in candidates:
            cat = item.get("category", "")
            if not cat:
                cat = ""
            cat_lower = cat.lower()

            # Check keyword (Case Insensitive)
            is_food = any(k in cat_lower for k in food_keywords)

            if is_food:
                pool_food.append(item)
            else:
                pool_sightseeing.append(item)

        # 3. Sắp xếp lộ trình (Thuật toán Nearest Neighbor - Greedy)
        # Helper: Tính bình phương khoảng cách (đủ để so sánh, không cần căn bậc 2)
        def dist_sq(loc1, loc2):
            try:
                lat1, lng1 = float(loc1.get("lat", 0)), float(loc1.get("lng", 0))
                lat2, lng2 = float(loc2.get("lat", 0)), float(loc2.get("lng", 0))
                return (lat1 - lat2) ** 2 + (lng1 - lng2) ** 2
            except:
                return float("inf")

        # Helper: Lấy địa điểm gần nhất từ pool so với vị trí hiện tại
        def pop_nearest(current_location, pool):
            if not pool:
                return None

            # Nếu chưa có vị trí (đầu ngày), lấy địa điểm điểm cao nhất (đầu list)
            if not current_location:
                return pool.pop(0)

            # Tìm địa điểm gần nhất trong pool
            nearest_idx = 0
            min_dist = float("inf")

            for i, loc in enumerate(pool):
                d = dist_sq(current_location, loc)
                if d < min_dist:
                    min_dist = d
                    nearest_idx = i

            return pool.pop(nearest_idx)

        print(
            f"DEBUG: Sightseeing pool: {len(pool_sightseeing)}, Food pool: {len(pool_food)}"
        )

        itinerary = []

        for day in range(1, days + 1):
            day_plan = {"day": day, "activities": []}

            # Biến lưu vị trí hiện tại để tìm điểm tiếp theo gần đó
            current_loc = None

            # SÁNG: Tham quan (Điểm Neo - Chọn nơi Hot nhất còn lại)
            loc = pop_nearest(None, pool_sightseeing)
            if loc:
                day_plan["activities"].append(
                    {"time": "Sáng", "type": "visit", "location": loc}
                )
                current_loc = loc

            # TRƯA: Ăn uống (Tìm quán gần địa điểm sáng nhất)
            loc = pop_nearest(current_loc, pool_food)
            # Nếu hết quán ăn thì thôi, hoặc fallback (logic cũ)
            if loc:
                day_plan["activities"].append(
                    {"time": "Trưa", "type": "food", "location": loc}
                )
                current_loc = loc

            # CHIỀU: Tham quan (Tìm nơi gần quán ăn trưa nhất)
            # Nếu trưa ko ăn, thì tìm gần địa điểm sáng
            loc = pop_nearest(current_loc, pool_sightseeing)
            if loc:
                day_plan["activities"].append(
                    {"time": "Chiều", "type": "visit", "location": loc}
                )
                current_loc = loc

            # TỐI: Ăn uống / Chill (Tìm nơi gần địa điểm chiều nhất)
            loc = pop_nearest(current_loc, pool_food)

            # Nếu hết đồ ăn, thử tìm chỗ đi dạo tối (pool sightseeing)
            if not loc:
                loc = pop_nearest(current_loc, pool_sightseeing)

            if loc:
                # Check type để gán label đúng
                act_type = "food"
                cat_lower = loc.get("category", "").lower()
                if not any(k in cat_lower for k in food_keywords):
                    act_type = "visit"

                day_plan["activities"].append(
                    {"time": "Tối", "type": act_type, "location": loc}
                )

            itinerary.append(day_plan)

        print("DEBUG: Itinerary generated successfully with Spatial Optimization")
        return itinerary

    except Exception as e:
        print(f"[ERROR] Generating itinerary: {e}")
        import traceback

        traceback.print_exc()
        return []


# --------------------------------------------------------------------------------------
# USER ACTIVITY HISTORY
# --------------------------------------------------------------------------------------
def get_user_reviews(username):
    """Lấy danh sách đánh giá của người dùng"""
    query = """
    MATCH (u:User {name: $username})-[r:REVIEWED]->(l:Location)
    OPTIONAL MATCH (l)-[:HAS_CATEGORY]->(c:Category)
    RETURN l.name as location, l.lat as lat, l.lng as lng, l.image as image, c.name as category,
           r.rating as rating, r.comment as comment, r.sentiment as sentiment, toString(r.timestamp) as timestamp
    ORDER BY r.timestamp DESC
    """
    return run_query(query, {"username": username})


def get_user_likes(username):
    """Lấy danh sách địa điểm người dùng đã thích"""
    query = """
    MATCH (u:User {name: $username})-[:LIKED]->(l:Location)
    OPTIONAL MATCH (l)-[:HAS_CATEGORY]->(c:Category)
    RETURN l.name as location, l.lat as lat, l.lng as lng, l.image as image, c.name as category
    ORDER BY l.name ASC
    """
    return run_query(query, {"username": username})


# --------------------------------------------------------------------------------------
# ITINERARY MANAGEMENT (LƯU LỘ TRÌNH)
# --------------------------------------------------------------------------------------
import json


def save_user_itinerary(username, itinerary_data):
    """Lưu lộ trình vào DB"""
    data_json = json.dumps(itinerary_data, ensure_ascii=False)
    # Lấy tiêu đề đại diện (VD: 3 ngày tham quan Huế)
    days_count = len(itinerary_data)
    title = f"Lịch trình {days_count} ngày tại Huế"

    query = """
    MATCH (u:User {name: $username})
    CREATE (i:Itinerary {
        id: randomUUID(),
        title: $title,
        data: $data,
        days: $days,
        created_at: datetime()
    })
    MERGE (u)-[:CREATED]->(i)
    RETURN i.id
    """
    try:
        run_query(
            query,
            {
                "username": username,
                "title": title,
                "data": data_json,
                "days": days_count,
            },
        )
        return True, "Lưu thành công!"
    except Exception as e:
        print(f"Error saving itinerary: {e}")
        return False, str(e)


def get_user_itineraries(username):
    """Lấy danh sách lộ trình của user"""
    query = """
    MATCH (u:User {name: $username})-[:CREATED]->(i:Itinerary)
    RETURN i.id as id, i.title as title, i.days as days, i.data as data, toString(i.created_at) as created_at
    ORDER BY i.created_at DESC
    """
    results = run_query(query, {"username": username})
    # Parse JSON string back to object
    for r in results:
        try:
            r["data"] = json.loads(r["data"])
        except:
            r["data"] = []
    return results


def delete_user_itinerary(username, itinerary_id):
    """Xóa lộ trình"""
    query = """
    MATCH (u:User {name: $username})-[:CREATED]->(i:Itinerary {id: $id})
    DETACH DELETE i
    """
    run_query(query, {"username": username, "id": itinerary_id})
    return True
