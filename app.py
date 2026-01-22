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
            id: randomUUID(), name: $name, desc: $desc, rating: $rating,
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
                "rating": float(data.get("rating", 5.0)),
                "lat": float(data.get("lat")),
                "lng": float(data.get("lng")),
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
            l.rating = $rating, 
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
                "lat": data.get("lat", 0),
                "lng": data.get("lng", 0),
                "category": data.get("category"),
                "desc": data.get("description"),
                "image": data.get("image"),
                "rating": float(data.get("rating", 0)),
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
    MATCH (l)-[:HAS_CATEGORY]->(cat:Category)
    """
    if category_filter and category_filter != "All":
        query += f" WHERE cat.name = '{category_filter}' "

    query += """
    RETURN l.name AS name, l.desc AS description, 
           l.rating AS rating, l.lat AS lat, l.lng AS lng,
           l.image AS image, cat.name AS category
    """

    try:
        data = run_query(query)
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
    # Chiến thuật: Tìm người tương đồng (Collaborative Filtering) + PageRank
    cypher_query = """
    MATCH (me:User {name: $name})-[:LIKED]->(my_place:Location)
    MATCH (other:User)-[:LIKED]->(my_place)
    WHERE other.name <> $name
    
    MATCH (other)-[:LIKED]->(suggestion:Location)
    WHERE NOT (me)-[:LIKED]->(suggestion)
    
    OPTIONAL MATCH (suggestion)-[:HAS_CATEGORY]->(cat:Category)
    
    RETURN suggestion.name AS name, 
           suggestion.desc AS description, 
           suggestion.rating AS rating,
           suggestion.lat AS lat,      
           suggestion.lng AS lng,
           
           coalesce(suggestion.pagerankScore, 0.15) AS pr_pop,
           coalesce(suggestion.pagerankConnect, 0.15) AS pr_conn,
           
           suggestion.image AS image, 
           cat.name AS category,
           count(other) AS common_users
           
    ORDER BY common_users DESC, (pr_pop + pr_conn) DESC 
    LIMIT 6
    """

    results = run_query(cypher_query, {"name": user_name})

    # Fallback: Nếu user mới (Cold Start), gợi ý theo PageRank thuần túy
    if not results:
        fallback_query = """
        MATCH (l:Location) 
        OPTIONAL MATCH (l)-[:HAS_CATEGORY]->(cat:Category)
        
        RETURN l.name AS name, l.desc AS description, l.rating AS rating, 
               l.lat AS lat, l.lng AS lng, 
               
               coalesce(l.pagerankScore, 0.15) AS pr_pop,
               coalesce(l.pagerankConnect, 0.15) AS pr_conn,
               
               l.image as image,
               cat.name as category,
               0 as common_users
        
        ORDER BY (pr_pop + pr_conn) DESC
        LIMIT 6
        """
        results = run_query(fallback_query)

    # Đảm bảo results không phải là None trước khi xử lý
    if results:
        for item in results:
            # Cộng gộp điểm để hiển thị ra ngoài (nếu cần)
            item["pr"] = item.get("pr_pop", 0) + item.get("pr_conn", 0)
    else:
        results = []  # Trả về danh sách rỗng nếu lỗi để không sập app

    return jsonify(results)


if __name__ == "__main__":
    logging.info("🚀 Server đang chạy tại: http://127.0.0.1:5000")
    app.run(port=5000, debug=True)
