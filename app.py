# File: app.py
from flask import Flask, jsonify, render_template, request, redirect, url_for
from flask_login import (
    LoginManager,
    UserMixin,
    login_user,
    login_required,
    logout_user,
    current_user,
)
from dotenv import load_dotenv
import os
import atexit
import setup_algo

from db import (
    run_query,
    close_driver,
    register_user,
    verify_user,
    get_all_users,
    delete_user_by_name,
    toggle_like_location,
    add_review,
    get_location_reviews,
    delete_review,
    sync_locations_to_excel,
    get_user_info,
    update_user_info,
)
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ======================================================
# LOAD ENV & APP CONFIG
# ======================================================
# Đọc file .env ở thư mục gốc
load_dotenv()

secret = os.getenv("FLASK_SECRET_KEY")
if not secret:
    raise RuntimeError("FLASK_SECRET_KEY chưa được cấu hình!")

# Khởi tạo ứng dụng Flask
app = Flask(__name__)
app.config["JSON_AS_ASCII"] = False
app.secret_key = secret

# ======================================================
# FLASK LOGIN CONFIG
# ======================================================
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = "index"


# Custom unauthorized handler để trả về JSON cho API requests
@login_manager.unauthorized_handler
def unauthorized_callback():
    # Kiểm tra xem request có phải là API call không
    if request.path.startswith("/api/"):
        return jsonify({"error": "Unauthorized - Vui lòng đăng nhập"}), 401
    # Nếu không phải API, redirect về trang login như bình thường
    return redirect(url_for("index"))


# Đóng driver Neo4j khi ứng dụng kết thúc
atexit.register(close_driver)


class User(UserMixin):
    def __init__(self, id, role=None):
        self.id = id
        self.role = role


# Hàm tải user từ session
@login_manager.user_loader
def load_user(user_id):
    return User(user_id)


# --- ROUTE API ---
@app.route("/api/register", methods=["POST"])
def api_register():
    data = request.get_json()
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()

    # Kiểm tra thông tin đăng ký
    if not username or not password:
        return jsonify({"error": "Vui lòng nhập đầy đủ tài khoản và mật khẩu"}), 400

    # Kiểm tra độ dài tài khoản, mật khẩu
    if len(username) < 3:
        return jsonify({"error": "Tên tài khoản phải có ít nhất 3 ký tự"}), 400

    if len(password) < 3:
        return jsonify({"error": "Mật khẩu phải có ít nhất 3 ký tự"}), 400

    # Đăng ký tài khoản
    success, message = register_user(username, password)
    if success:
        return jsonify({"success": True, "message": message}), 201
    else:
        return jsonify({"success": False, "error": message}), 400


# API: Đăng nhập
@app.route("/api/login", methods=["POST"])
def api_login():
    data = request.json
    username = data.get("username")
    password = data.get("password")

    # verify_user trả về tuple: (success, role, message)
    success, role, message = verify_user(username, password)

    if success:
        user = User(id=username, role=role)
        login_user(user)
        # Trả về role cho frontend biết
        return (
            jsonify(
                {
                    "message": "Đăng nhập thành công!",
                    "username": username,
                    "role": role,
                }
            ),
            200,
        )
    else:
        return jsonify({"error": message}), 401


# API: Đăng xuất
@app.route("/api/logout", methods=["POST"])
@login_required
def api_logout():
    logout_user()
    return jsonify({"message": "Đã đăng xuất"}), 200


# API: Lấy thông tin người dùng hiện tại
@app.route("/api/current_user", methods=["GET"])
def get_current_user():
    if current_user.is_authenticated:
        return jsonify({"is_logged_in": True, "username": current_user.id})
    else:
        return jsonify({"is_logged_in": False})


# --- API: Lấy/Cập nhật thông tin cá nhân ---
@app.route("/api/profile", methods=["GET", "POST"])
@login_required
def api_profile_handler():
    # GET: Lấy thông tin
    if request.method == "GET":
        info = get_user_info(current_user.id)
        if info:
            return jsonify(info)
        return jsonify({"error": "Không tìm thấy thông tin"}), 404

    # POST: Cập nhật
    if request.method == "POST":
        data = request.json
        fullname = data.get("fullname", "").strip()
        email = data.get("email", "").strip()
        password = data.get("password", "").strip()

        success, msg = update_user_info(
            current_user.id, fullname, email, password if password else None
        )
        if success:
            return jsonify({"success": True, "message": msg})
        else:
            return jsonify({"success": False, "error": msg}), 400


# --- 5. API ADMIN: QUẢN LÝ NGƯỜI DÙNG ---
@app.route("/api/admin/users", methods=["GET"])
@login_required
def api_get_users():
    if current_user.id != "admin":
        return jsonify({"error": "Không có quyền truy cập"}), 403

    try:
        users = get_all_users()
        logger.info(f"📋 Get all users result: {users}")
        # Lọc bỏ admin khỏi danh sách (optional)
        filtered_users = [u for u in (users or []) if u.get("name") != "admin"]
        return jsonify(filtered_users)
    except Exception as e:
        logger.error(f"Error getting users: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/admin/users/<username>", methods=["DELETE"])
@login_required
def api_delete_user(username):
    if current_user.id != "admin":
        return jsonify({"error": "Không có quyền truy cập"}), 403

    delete_user_by_name(username)
    return jsonify({"message": f"Đã xóa user {username}"}), 200


@app.route("/api/admin/user_comments/<username>", methods=["GET"])
@login_required
def api_get_user_comments(username):
    if current_user.id != "admin":
        return jsonify({"error": "Không có quyền truy cập"}), 403

    query = """
    MATCH (u:User {name: $name})-[r:REVIEWED]->(l:Location)
    RETURN l.name AS location, r.rating AS rating, r.comment AS comment, toString(r.timestamp) AS time
    ORDER BY r.timestamp DESC
    """
    results = run_query(query, {"name": username})
    return jsonify(results if results else [])


@app.route("/api/admin/user_profile/<username>", methods=["GET"])
@login_required
def api_get_user_profile(username):
    if current_user.id != "admin":
        return jsonify({"error": "Không có quyền truy cập"}), 403

    # 1. Get User Info & Stats
    user_query = """
    MATCH (u:User {name: $name})
    OPTIONAL MATCH (u)-[r:LIKED]->()
    OPTIONAL MATCH (u)-[rev:REVIEWED]->()
    RETURN u.name as name, u.fullname as fullname, u.email as email, u.role as role, toString(u.created_at) as created_at,
           count(DISTINCT r) as liked_count, count(DISTINCT rev) as comment_count
    """
    user_data = run_query(user_query, {"name": username})

    if not user_data:
        return jsonify({"error": "User not found"}), 404

    profile = user_data[0]

    # 2. Get Reviews List
    reviews_query = """
    MATCH (u:User {name: $name})-[r:REVIEWED]->(l:Location)
    RETURN l.name AS location, r.rating AS rating, r.comment AS comment, toString(r.timestamp) AS time
    ORDER BY r.timestamp DESC
    """
    reviews = run_query(reviews_query, {"name": username})
    profile["reviews"] = reviews if reviews else []

    # 3. Get Liked Locations
    liked_query = """
    MATCH (u:User {name: $name})-[r:LIKED]->(l:Location)
    RETURN l.name AS name, l.image AS image, l.category AS category, l.lat AS lat, l.lng AS lng
    ORDER BY r.timestamp DESC
    """
    liked_locs = run_query(liked_query, {"name": username})
    profile["liked_locations"] = liked_locs if liked_locs else []

    return jsonify(profile)


@app.route("/api/like", methods=["POST"])
@login_required  # Chỉ user đăng nhập mới được like
def api_toggle_like():
    data = request.json
    location_name = data.get("location_name")

    if not location_name:
        return jsonify({"error": "Thiếu tên địa điểm"}), 400

    # current_user.id chính là usernam
    is_liked, msg = toggle_like_location(current_user.id, location_name)

    return jsonify({"liked": is_liked, "message": msg}), 200


# --- API REVIEW ---
@app.route("/api/review", methods=["POST"])
@login_required
def api_add_review():
    data = request.json
    loc_name = data.get("location_name")
    rating = data.get("rating")
    comment = data.get("comment", "")

    if not loc_name or not rating:
        return jsonify({"error": "Thiếu thông tin rating hoặc địa điểm"}), 400

    success, result = add_review(current_user.id, loc_name, rating, comment)
    if success:
        return (
            jsonify(
                {"success": True, "message": "Đánh giá thành công!", "stats": result}
            ),
            200,
        )
    else:
        return jsonify({"success": False, "error": result}), 500


@app.route("/api/reviews/<location_name>", methods=["GET"])
def api_get_reviews(location_name):
    reviews = get_location_reviews(location_name)
    return jsonify(reviews if reviews else [])


@app.route("/api/review", methods=["DELETE"])
@login_required
def api_delete_review():
    data = request.json
    loc_name = data.get("location_name")

    if not loc_name:
        return jsonify({"error": "Thiếu tên địa điểm"}), 400

    success, result = delete_review(current_user.id, loc_name)
    if success:
        return (
            jsonify({"success": True, "message": "Đã xóa đánh giá!", "stats": result}),
            200,
        )
    else:
        return jsonify({"success": False, "error": result}), 500


# ==========================================================
# 5. API ADMIN: QUẢN TRỊ HỆ THỐNG & CRUD ĐỊA ĐIỂM
# ==========================================================
# --- API LẤY THỐNG KÊ ---
@app.route("/api/admin/stats", methods=["GET"])
@login_required
def get_admin_stats():
    if not current_user.is_authenticated or current_user.id != "admin":
        return jsonify({"error": "Không có quyền"}), 403

    query = """
    CALL () { MATCH (u:User) RETURN count(u) as user_count }
    CALL () { MATCH (l:Location) RETURN count(l) as location_count }
    CALL () { MATCH ()-[r:LIKED]->() RETURN count(r) as like_count }
    CALL () { MATCH ()-[r:RELATED_TO]->() RETURN count(r) as link_count }
    RETURN user_count, location_count, like_count, link_count
    """
    try:
        result = run_query(query)
        return jsonify(result[0] if result else {})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# --- API CHẠY LẠI THUẬT TOÁN (TRIGGER AI) ---
@app.route("/api/admin/run-algo", methods=["POST"])
@login_required
def run_algo_trigger():
    if not current_user.is_authenticated or current_user.id != "admin":
        return jsonify({"error": "Không có quyền"}), 403

    try:
        setup_algo.run_hybrid_algo()
        return jsonify({"status": "success", "message": "Đã cập nhật điểm PageRank!"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# --- API THÊM ĐỊA ĐIỂM MỚI (CREATE) ---
@app.route("/api/admin/location/add", methods=["POST"])
@login_required
def add_location():
    if not current_user.is_authenticated or current_user.id != "admin":
        return jsonify({"error": "Không có quyền"}), 403

    data = request.json
    try:
        query = """
        MERGE (c:City {name: "Huế"})
        MERGE (cat:Category {name: $category})
        CREATE (l:Location {
            id: randomUUID(), name: $name, desc: $desc,
            image: $image, lat: $lat, lng: $lng,
            pagerankScore: 0.15, pagerankConnect: 0.15
        })
        MERGE (l)-[:LOCATED_IN]->(c)
        MERGE (l)-[:HAS_CATEGORY]->(cat)
        """
        run_query(
            query,
            {
                "name": data.get("name"),
                "category": data.get("category"),
                "desc": data.get("description", ""),
                "image": data.get("image", ""),
                "lat": safe_float(data.get("lat")),
                "lng": safe_float(data.get("lng")),
            },
        )
        # Đồng bộ vào file Excel
        sync_locations_to_excel()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# --- API SỬA ĐỊA ĐIỂM (UPDATE) ---
@app.route("/api/admin/location/update", methods=["PUT"])
@login_required
def update_location():
    if not current_user.is_authenticated or current_user.id != "admin":
        return jsonify({"error": "Không có quyền"}), 403

    data = request.json
    try:
        query = """
        MATCH (l:Location {name: $old_name})
        SET l.name = $name, 
            l.desc = $desc,
            l.lat = $lat, 
            l.lng = $lng,
            l.image = $image
        WITH l
        OPTIONAL MATCH (l)-[r:HAS_CATEGORY]->(:Category) DELETE r
        WITH l
        MERGE (c:Category {name: $category})
        MERGE (l)-[:HAS_CATEGORY]->(c)
        """
        run_query(
            query,
            {
                "old_name": data.get("old_name"),
                "name": data.get("name"),
                "lat": safe_float(data.get("lat", 0)),
                "lng": safe_float(data.get("lng", 0)),
                "category": data.get("category"),
                "desc": data.get("description"),
                "image": data.get("image"),
            },
        )
        # Đồng bộ vào file Excel
        sync_locations_to_excel()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# --- API XÓA ĐỊA ĐIỂM (DELETE) ---
@app.route("/api/admin/location/delete", methods=["DELETE"])
@login_required
def delete_location():
    if not current_user.is_authenticated or current_user.id != "admin":
        return jsonify({"error": "Không có quyền"}), 403

    try:
        query = "MATCH (l:Location {name: $name}) DETACH DELETE l"
        run_query(query, {"name": request.json.get("name")})
        # Đồng bộ vào file Excel
        sync_locations_to_excel()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# --- 1. ROUTE GIAO DIỆN CHÍNH ---
@app.route("/")
def index():
    return render_template("index.html")


# --- 2. API: LẤY DANH SÁCH ĐỊA ĐIỂM (CÓ LỌC) ---
@app.route("/api/locations", methods=["GET"])
def get_locations():
    category_filter = request.args.get("category")

    query = """
    MATCH (l:Location)
    OPTIONAL MATCH (l)-[:HAS_CATEGORY]->(cat:Category)
    """

    params = {}  # Tạo dictionary chứa tham số
    if category_filter and category_filter != "All":
        # Sử dụng toLower để so sánh không phân biệt hoa thường
        query += " WHERE toLower(cat.name) = toLower($cat_name) "
        params["cat_name"] = category_filter

    query += """
    RETURN l.name AS name,
           l.desc AS description,
           l.lat AS lat, l.lng AS lng,
           l.image AS image, 
           cat.name AS category,
           coalesce(l.pagerankNorm, 0) AS score
    ORDER BY category, score DESC           
    """

    try:
        data = run_query(query, params)
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# --- 3. API: LẤY LỊCH SỬ NGƯỜI DÙNG (MỚI) ---
@app.route("/api/history/<user_name>", methods=["GET"])
def get_user_history(user_name):
    query = """
    MATCH (u:User {name: $name})-[:LIKED]->(l:Location)
    RETURN l.name AS name, 
           l.image AS image, 
           l.lat AS lat, 
           l.lng AS lng
    LIMIT 10
    """
    try:
        results = run_query(query, {"name": user_name})
        return jsonify(results)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# --- 4. API: GỢI Ý THÔNG MINH (CORE AI) - V2.0 với Interaction Weighting ---
@app.route("/api/recommend/<user_name>", methods=["GET"])
def recommend(user_name):
    """
    CHIẾN THUẬT: HYBRID RECOMMENDATION V2.0 với 3 thành phần chính:

    1. PERSONALIZED RATING (x5): Ưu tiên CỰC CAO cho địa điểm mà user đã đánh giá cao
       → Nếu user đã review 5 sao một địa điểm, địa điểm đó được boost mạnh
       → Giúp "nhắc nhở" user về những nơi họ yêu thích

    2. COLLABORATIVE FILTERING (x3): "Người giống bạn cũng thích chỗ này"
       → Dựa trên quan hệ :INTERACTED (kết hợp LIKED + REVIEWED)
       → weight từ :INTERACTED phản ánh mức độ tương tác (1-6 điểm)

    3. GLOBAL PAGERANK (x10): Độ nổi tiếng toàn hệ thống
       → pagerankScore đã được tính từ Weighted PageRank với :INTERACTED
       → Phản ánh cả số lượng tương tác VÀ chất lượng đánh giá

    GIẢI QUYẾT VẤN ĐỀ: "Người dùng vừa LIKE vừa đánh giá 5 sao"
    → Tổng weight = 1 (LIKED) + 5 (5 sao) = 6 điểm → Ảnh hưởng mạnh nhất đến PageRank
    → Personalized Rating sẽ boost thêm x5 cho chính user đó
    → Kết quả: Địa điểm được yêu thích nhất sẽ xuất hiện đầu tiên
    """

    cypher_query = """
    MATCH (me:User {name: $name})
    
    // ============================================================
    // BƯỚC 1: COLLABORATIVE FILTERING (Người tương đồng cũng thích)
    // ============================================================
    // Tìm user có hành vi tương tự (cùng INTERACTED với các địa điểm giống nhau)
    OPTIONAL MATCH (me)-[:INTERACTED]->(:Location)<-[other_int:INTERACTED]-(other:User)
    WHERE other <> me
    
    // Tìm địa điểm mà những user tương đồng đã tương tác, nhưng user hiện tại CHƯA
    OPTIONAL MATCH (other)-[their_int:INTERACTED]->(l_collab:Location)
    WHERE NOT (me)-[:INTERACTED]->(l_collab) AND NOT (me)-[:LIKED]->(l_collab)
    
    // Tính điểm collab: số user tương đồng * trọng số tương tác trung bình của họ
    WITH me, l_collab, 
         count(DISTINCT other) AS num_similar_users,
         avg(their_int.weight) AS avg_weight
    WITH me, 
         collect({
             loc: l_collab, 
             score: num_similar_users * coalesce(avg_weight, 1),
             type: 'collab',
             common_users: num_similar_users
         }) AS collab_list

    // ============================================================
    // BƯỚC 2: CONTENT-BASED FILTERING (Cùng danh mục/liên kết)
    // ============================================================
    OPTIONAL MATCH (me)-[:INTERACTED]->(liked_loc:Location)
    OPTIONAL MATCH (liked_loc)-[:HAS_CATEGORY]->(cat:Category)<-[:HAS_CATEGORY]-(l_content:Location)
    WHERE NOT (me)-[:INTERACTED]->(l_content) AND NOT (me)-[:LIKED]->(l_content)
    
    // Cộng thêm điểm từ RELATED_TO (co-occurrence graph)
    OPTIONAL MATCH (liked_loc)-[r:RELATED_TO]-(l_content)
    
    WITH me, collab_list, l_content, 
         sum(1 + coalesce(r.weight, 0)) AS score_content
    WITH me, collab_list,
         collect({loc: l_content, score: score_content, type: 'content'}) AS content_list

    // ============================================================
    // BƯỚC 3: GỘP CANDIDATES VÀ TÍNH ĐIỂM CUỐI CÙNG
    // ============================================================
    // CHỈ GỘP collab_list và content_list (không bao gồm địa điểm đã thích)
    WITH me, collab_list + content_list AS all_candidates
    
    UNWIND all_candidates AS c
    WITH me, c.loc AS l, c.score AS s, c.type AS t, 
         CASE WHEN c.common_users IS NOT NULL THEN c.common_users ELSE 0 END AS common
    WHERE l IS NOT NULL
    AND NOT (me)-[:INTERACTED]->(l) AND NOT (me)-[:LIKED]->(l)
    
    // Tổng hợp điểm từ các nguồn khác nhau cho cùng một địa điểm
    WITH me, l,
         sum(CASE WHEN t = 'collab' THEN s ELSE 0 END) AS score_collab_raw,
         sum(CASE WHEN t = 'content' THEN s ELSE 0 END) AS score_content_raw,
         max(common) AS common_users

    // Lấy thông tin category
    OPTIONAL MATCH (l)-[:HAS_CATEGORY]->(cat:Category)
    
    // Lấy rating trung bình của địa điểm
    OPTIONAL MATCH ()-[all_reviews:REVIEWED]->(l)
    WITH me, l, cat, score_collab_raw, score_content_raw, common_users,
         avg(all_reviews.rating) AS avg_rating,
         count(all_reviews) AS review_count

    // ============================================================
    // CÔNG THỨC ĐIỂM CUỐI CÙNG (Final Score Formula)
    // ============================================================
    // Collaborative: x3 (quan trọng - social proof)
    // Content: x1 (bổ trợ - similarity)
    // PageRank: x10 (global popularity, thường < 1 nên nhân 10)
    
    WITH l, cat, common_users, avg_rating, review_count,
         score_collab_raw * 3.0 AS final_collab,
         score_content_raw * 1.0 AS final_content,
         coalesce(l.pagerankNorm, 0) * 10.0 AS final_pagerank
    
    WITH l, cat, common_users, avg_rating, review_count,
         final_collab, final_content, final_pagerank,
         (final_collab + final_content + final_pagerank) AS final_score

    RETURN l.name AS name, 
           l.desc AS description, 
           coalesce(avg_rating, l.rating, 0) AS rating,
           l.lat AS lat,      
           l.lng AS lng,
           l.image AS image, 
           cat.name AS category,
           coalesce(l.pagerankNorm, 0) AS score,
           review_count AS reviewCount,
           
           // Điểm cuối cùng
           final_score,
           common_users,
           
           // Chi tiết điểm từng thành phần (để giải thích gợi ý)
           0 AS score_personal,
           final_collab AS score_collab,
           final_content AS score_content,
           final_pagerank AS score_pagerank
           
    ORDER BY final_score DESC
    LIMIT 12
    """
    try:
        results = run_query(cypher_query, {"name": user_name})

        # Fallback cho người dùng mới (Cold Start) dựa trên PageRank
        # Nhưng vẫn loại bỏ địa điểm user đã tương tác
        if not results:
            fallback_query = """
            // Lấy danh sách địa điểm user đã tương tác
            OPTIONAL MATCH (me:User {name: $name})-[:LIKED|INTERACTED]->(liked:Location)
            WITH collect(liked) AS liked_locations
            
            // Lấy tất cả địa điểm, loại trừ những cái đã tương tác
            MATCH (l:Location)
            WHERE NOT l IN liked_locations
            
            OPTIONAL MATCH (l)-[:HAS_CATEGORY]->(cat:Category)
            OPTIONAL MATCH ()-[r:REVIEWED]->(l)
            WITH l, cat, avg(r.rating) AS avg_rating, count(r) AS review_count
            RETURN l.name AS name, l.desc AS description, 
                   coalesce(avg_rating, l.rating, 0) AS rating, 
                   l.lat AS lat, l.lng AS lng, l.image as image, cat.name as category,
                   coalesce(l.pagerankNorm, 0) AS score,
                   review_count AS reviewCount,
                   coalesce(l.pagerankNorm, 0) * 10.0 AS final_score,
                   0 as common_users,
                   0 as score_personal,
                   0 as score_collab,
                   0 as score_content,
                   coalesce(l.pagerankNorm, 0) * 10.0 AS score_pagerank
            ORDER BY l.pagerankNorm DESC
            LIMIT 12
            """
            results = run_query(fallback_query, {"name": user_name})

        # Xử lý thêm thông tin giải thích cho mỗi kết quả
        processed_results = []
        for loc in results or []:
            # Lấy điểm số từ 4 thành phần
            s_personal = loc.get("score_personal", 0) or 0
            s_collab = loc.get("score_collab", 0) or 0
            s_content = loc.get("score_content", 0) or 0
            s_pagerank = loc.get("score_pagerank", 0) or 0
            common_users = loc.get("common_users", 0) or 0

            # Tính tổng và tỷ lệ phần trăm
            total = s_personal + s_collab + s_content + s_pagerank
            if total > 0:
                pct_personal = (s_personal / total) * 100
                pct_collab = (s_collab / total) * 100
                pct_content = (s_content / total) * 100
                pct_pagerank = (s_pagerank / total) * 100
            else:
                pct_personal = pct_collab = pct_content = pct_pagerank = 0

            # Xác định lý do chính (theo thứ tự ưu tiên)
            # Lưu ý: Không còn personal vì không gợi ý địa điểm đã tương tác
            reason = ""
            reason_icon = "🤖"
            reason_type = "default"

            if (
                s_collab > 0.5 and common_users >= 1
            ):  # Có trọng số collab đáng kể & ít nhất 1 người giống
                # Collaborative Filtering: Social Proof
                reason = f"{int(common_users)} người có sở thích giống bạn đã thích địa điểm này"
                reason_icon = "👥"
                reason_type = "collab"
            elif s_content > 0.1:
                # Content-based: Similarity
                reason = f"Gợi ý vì bạn thích các địa điểm {loc.get('category', '')}"
                reason_icon = "🎯"
                reason_type = "content"
            elif s_pagerank > 0:
                # PageRank: Global popularity (Fallback)
                pr_score = (loc.get("score", 0) or 0) * 100
                reason = f"Địa điểm nổi tiếng với điểm phổ biến {pr_score:.1f}/100"
                reason_icon = "🏆"
                reason_type = "pagerank"
            else:
                reason = "Được gợi ý bởi hệ thống AI"
                reason_icon = "🤖"
                reason_type = "default"

            # Tạo chi tiết phân tích (cho tooltip hoặc panel chi tiết)
            reason_details = {
                "personal": {
                    "score": round(s_personal, 2),
                    "percent": round(pct_personal, 1),
                    "label": "Personalized Rating",
                    "desc": "Đánh giá cá nhân của bạn",
                },
                "collab": {
                    "score": round(s_collab, 2),
                    "percent": round(pct_collab, 1),
                    "label": "Collaborative Filtering",
                    "desc": f"{int(common_users)} người dùng tương đồng",
                },
                "content": {
                    "score": round(s_content, 2),
                    "percent": round(pct_content, 1),
                    "label": "Content-based",
                    "desc": "Tương tự địa điểm đã thích",
                },
                "pagerank": {
                    "score": round(s_pagerank, 2),
                    "percent": round(pct_pagerank, 1),
                    "label": "PageRank",
                    "desc": "Độ nổi tiếng toàn hệ thống",
                },
            }

            # Thêm các trường mới vào kết quả
            loc["reason"] = reason
            loc["reason_icon"] = reason_icon
            loc["reason_type"] = reason_type
            loc["reason_details"] = reason_details

            processed_results.append(loc)

        return jsonify(processed_results)
    except Exception as e:
        print(f"❌ Lỗi Recommend: {e}")
        return jsonify({"error": str(e)}), 500


# --- API: LẤY ĐỊA ĐIỂM CÙNG DANH MỤC ---
@app.route("/api/similar/<location_name>", methods=["GET"])
def get_similar_locations(location_name):
    """
    Lấy các địa điểm cùng danh mục với địa điểm được chọn.
    Trả về tối đa 6 địa điểm, sắp xếp theo điểm PageRank.
    """
    query = """
    // Tìm địa điểm hiện tại và danh mục của nó
    MATCH (current:Location {name: $name})-[:HAS_CATEGORY]->(cat:Category)
    
    // Tìm các địa điểm khác cùng danh mục
    MATCH (similar:Location)-[:HAS_CATEGORY]->(cat)
    WHERE similar.name <> $name
    
    // Trả về thông tin các địa điểm tương tự
    RETURN similar.name AS name,
           similar.desc AS description,
           similar.lat AS lat,
           similar.lng AS lng,
           similar.image AS image,
           similar.rating AS rating,
           cat.name AS category,
           coalesce(similar.pagerankNorm, 0) AS score
    ORDER BY score DESC
    LIMIT 6
    """
    try:
        results = run_query(query, {"name": location_name})
        return jsonify(results if results else [])
    except Exception as e:
        print(f"❌ Lỗi get_similar_locations: {e}")
        return jsonify({"error": str(e)}), 500


# 5. Hàm phụ trợ chuyển đổi an toàn sang float
def safe_float(value, default=0.0):
    try:
        return float(value)
    except (ValueError, TypeError):
        return default


# ==========================================================
if __name__ == "__main__":
    logging.info("🚀 Server đang chạy tại: http://127.0.0.1:5000")
    app.run(port=5000, debug=True)
