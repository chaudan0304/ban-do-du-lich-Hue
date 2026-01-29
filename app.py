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

    user_data = verify_user(username, password)

    if user_data:
        user = User(id=user_data["name"], role=user_data["role"])
        login_user(user)
        # Trả về role cho frontend biết
        return (
            jsonify(
                {
                    "message": "Đăng nhập thành công!",
                    "username": username,
                    "role": user_data["role"],
                }
            ),
            200,
        )
    else:
        return jsonify({"error": "Sai tài khoản hoặc mật khẩu"}), 401


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


# --- 5. API ADMIN: QUẢN LÝ NGƯỜI DÙNG ---
@app.route("/api/admin/users", methods=["GET"])
@login_required
def api_get_users():
    if current_user.id != "admin":
        return jsonify({"error": "Không có quyền truy cập"}), 403

    users = get_all_users()
    return jsonify(users)


@app.route("/api/admin/users/<username>", methods=["DELETE"])
@login_required
def api_delete_user(username):
    if current_user.id != "admin":
        return jsonify({"error": "Không có quyền truy cập"}), 403

    delete_user_by_name(username)
    return jsonify({"message": f"Đã xóa user {username}"}), 200


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
        return jsonify({"success": True, "message": "Đánh giá thành công!", "stats": result}), 200
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
        return jsonify({"success": True, "message": "Đã xóa đánh giá!", "stats": result}), 200
    else:
        return jsonify({"success": False, "error": result}), 500


# ==========================================================
# 5. API ADMIN: QUẢN TRỊ HỆ THỐNG & CRUD ĐỊA ĐIỂM
# ==========================================================
# --- API LẤY THỐNG KÊ ---
@app.route("/api/admin/stats", methods=["GET"])
def get_admin_stats():
    if current_user.id != "admin":
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
def run_algo_trigger():
    if current_user.id != "admin":
        return jsonify({"error": "Không có quyền"}), 403

    try:
        setup_algo.run_hybrid_algo()
        return jsonify({"status": "success", "message": "Đã cập nhật điểm PageRank!"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# --- API THÊM ĐỊA ĐIỂM MỚI (CREATE) ---
@app.route("/api/admin/location/add", methods=["POST"])
def add_location():
    if current_user.id != "admin":
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
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# --- API SỬA ĐỊA ĐIỂM (UPDATE) ---
@app.route("/api/admin/location/update", methods=["PUT"])
def update_location():
    if current_user.id != "admin":
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
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# --- API XÓA ĐỊA ĐIỂM (DELETE) ---
@app.route("/api/admin/location/delete", methods=["DELETE"])
def delete_location():
    if current_user.id != "admin":
        return jsonify({"error": "Không có quyền"}), 403

    try:
        query = "MATCH (l:Location {name: $name}) DETACH DELETE l"
        run_query(query, {"name": request.json.get("name")})
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
        query += " WHERE cat.name = $cat_name "
        params["cat_name"] = category_filter

    query += """
    RETURN l.name AS name,
           l.desc AS description,
           l.lat AS lat, l.lng AS lng,
           l.image AS image, 
           cat.name AS category,
           coalesce(l.pagerankNorm, 0) AS score
    ORDER BY score DESC           
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


# --- 4. API: GỢI Ý THÔNG MINH (CORE AI) ---
@app.route("/api/recommend/<user_name>", methods=["GET"])
def recommend(user_name):
    # --- CHIẾN THUẬT: HYBRID RECOMMENDATION ---
    # Kết hợp 3 yếu tố:
    # 1. Collaborative Filtering: "Người giống bạn cũng thích chỗ này"
    # 2. Content-based Filtering: "Chỗ này giống chỗ bạn đã like (cùng danh mục/kết nối)"
    # 3. PageRank: "Chỗ này đang rất hot"

    cypher_query = """
    MATCH (me:User {name: $name})
    
    // Bước 1: Collaborative Filtering
    OPTIONAL MATCH (me)-[:LIKED]->(:Location)<-[:LIKED]-(other:User)-[:LIKED]->(l_collab:Location)
    WHERE NOT (me)-[:LIKED]->(l_collab)
    WITH me, l_collab, count(DISTINCT other) AS score_collab
    WITH me, collect({loc: l_collab, score: score_collab, type: 'collab'}) AS collab_list

    // Bước 2: Content-based Filtering
    // Tìm địa điểm user đã thích
    OPTIONAL MATCH (me)-[:LIKED]->(liked_loc:Location)
    
    // Tìm địa điểm khác cùng category với những địa điểm đã thích
    OPTIONAL MATCH (liked_loc)-[:HAS_CATEGORY]->(cat:Category)<-[:HAS_CATEGORY]-(l_content:Location)
    WHERE NOT (me)-[:LIKED]->(l_content)
    
    // Kiểm tra xem có liên kết RELATED_TO cũ không để cộng điểm ưu tiên
    OPTIONAL MATCH (liked_loc)-[r:RELATED_TO]-(l_content)
    
    // Tính điểm: 1 điểm cơ bản cho cùng danh mục + trọng số thuật toán (nếu có)
    WITH me, collab_list, l_content, sum(1 + coalesce(r.weight, 0)) AS score_content
    
    // Bước 3: Gom nhóm riêng biệt trước khi cộng mảng
    WITH me, collab_list, collect({loc: l_content, score: score_content, type: 'content'}) AS content_list
    WITH me, collab_list + content_list AS all_candidates

    // Bước 4: Xử lý Unwind và tính điểm tổng hợp
    UNWIND all_candidates AS c
    WITH c.loc AS l, c.score AS s, c.type AS t
    WHERE l IS NOT NULL
    
    WITH l,
         sum(CASE WHEN t = 'collab' THEN s ELSE 0 END) AS final_s_collab,
         sum(CASE WHEN t = 'content' THEN s ELSE 0 END) AS final_s_content

    OPTIONAL MATCH (l)-[:HAS_CATEGORY]->(cat:Category)

    RETURN l.name AS name, 
           l.desc AS description, 
           l.rating AS rating,
           l.lat AS lat,      
           l.lng AS lng,
           l.image AS image, 
           cat.name AS category,
           coalesce(l.pagerankNorm, 0.15) AS score,
           
           // CÔNG THỨC TÍNH ĐIỂM CUỐI CÙNG
           // Collab quan trọng nhất (x3)
           // Content (Realtime + Batch) quan trọng nhì (x1)
           // PageRank (Độ nổi tiếng) hỗ trợ thêm (x10 vì điểm PR thường rất nhỏ < 0.x)
           (final_s_collab * 3.0) + (final_s_content * 1.0) + (coalesce(l.pagerankNorm, 0) * 10.0) AS final_score,
           final_s_collab AS common_users,
           
           // THÔNG TIN GIẢI THÍCH GỢI Ý
           final_s_collab * 3.0 AS score_collab,
           final_s_content * 1.0 AS score_content,
           coalesce(l.pagerankNorm, 0) * 10.0 AS score_pagerank
           
    ORDER BY final_score DESC
    LIMIT 12
    """
    try:
        # Sử dụng hàm run_query từ db.py để thực thi
        results = run_query(cypher_query, {"name": user_name})

        # Fallback cho người dùng mới (Cold Start) dựa trên PageRank
        if not results:
            fallback_query = """
            MATCH (l:Location) 
            OPTIONAL MATCH (l)-[:HAS_CATEGORY]->(:Category)
            OPTIONAL MATCH (l)-[:HAS_CATEGORY]->(cat:Category)
            RETURN l.name AS name, l.desc AS description, l.rating AS rating, 
                   l.lat AS lat, l.lng AS lng, l.image as image, cat.name as category,
                   coalesce(l.pagerankNorm, 0) AS score,
                   coalesce(l.pagerankNorm, 0) AS final_score,
                   0 as common_users,
                   0 as score_collab,
                   0 as score_content,
                   coalesce(l.pagerankNorm, 0) * 10.0 AS score_pagerank
            ORDER BY l.pagerankNorm DESC
            LIMIT 12
            """
            results = run_query(fallback_query)

        # Xử lý thêm thông tin giải thích cho mỗi kết quả
        processed_results = []
        for loc in (results or []):
            # Lấy điểm số từ 3 thành phần
            s_collab = loc.get("score_collab", 0) or 0
            s_content = loc.get("score_content", 0) or 0
            s_pagerank = loc.get("score_pagerank", 0) or 0
            common_users = loc.get("common_users", 0) or 0
            
            # Tính tổng và tỷ lệ phần trăm
            total = s_collab + s_content + s_pagerank
            if total > 0:
                pct_collab = (s_collab / total) * 100
                pct_content = (s_content / total) * 100
                pct_pagerank = (s_pagerank / total) * 100
            else:
                pct_collab = pct_content = pct_pagerank = 0
            
            # Xác định lý do chính
            reason = ""
            reason_icon = "🤖"
            reason_type = "default"
            
            if s_collab > 0.5: # Có trọng số collab đáng kể
                # Collaborative Filtering là chính: Social Proof mạnh mẽ nhất
                reason = f"{int(common_users)} người có sở thích giống bạn đã thích địa điểm này"
                reason_icon = "👥"
                reason_type = "collab"
            elif s_content > 0.1: 
                # Content-based là chính: Ưu tiên hiển thị tính cá nhân hóa dù điểm PR cao hơn
                reason = f"Gợi ý vì bạn thích các địa điểm {loc.get('category', '')}"
                reason_icon = "🎯"
                reason_type = "content"
            elif s_pagerank > 0:
                # PageRank là chính (Fallback)
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
                "collab": {
                    "score": round(s_collab, 2),
                    "percent": round(pct_collab, 1),
                    "label": "Collaborative Filtering",
                    "desc": f"{int(common_users)} người dùng tương đồng"
                },
                "content": {
                    "score": round(s_content, 2),
                    "percent": round(pct_content, 1),
                    "label": "Content-based",
                    "desc": "Tương tự địa điểm đã thích"
                },
                "pagerank": {
                    "score": round(s_pagerank, 2),
                    "percent": round(pct_pagerank, 1),
                    "label": "PageRank",
                    "desc": "Độ nổi tiếng toàn hệ thống"
                }
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
