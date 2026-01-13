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
from db import run_query, close_driver, register_user, verify_user
import atexit
from db import get_all_users, delete_user_by_name
from db import toggle_like_location

app = Flask(__name__)
app.secret_key = "khoa_luan_bi_mat_123"  # Key để mã hóa session cookie

# --- CẤU HÌNH FLASK-LOGIN ---
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = "index"  # Chuyển hướng đến trang chính nếu chưa đăng nhập

# Đóng driver Neo4j khi ứng dụng kết thúc
atexit.register(close_driver)


class User(UserMixin):
    def __init__(self, id):
        self.id = id


# Hàm tải user từ session
@login_manager.user_loader
def load_user(user_id):
    return User(user_id)


# --- ROUTE API ---
@app.route("/api/register", methods=["POST"])
def api_register():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"error": "Thiếu thông tin"}), 400

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
        user = User(id=user_data["name"])
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

    # current_user.id chính là username (do setup ở User class)
    is_liked, msg = toggle_like_location(current_user.id, location_name)

    return jsonify({"liked": is_liked, "message": msg}), 200


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
# Gợi ý dựa trên PageRank + Collaborative Filtering
@app.route("/api/recommend/<user_name>", methods=["GET"])
def recommend(user_name):
    # Chiến thuật: Tìm người tương đồng (Collaborative Filtering) + PageRank
    cypher_query = """
    MATCH (me:User {name: $name})-[:LIKED]->(my_place:Location)
    MATCH (other:User)-[:LIKED]->(my_place)
    WHERE other.name <> $name
    
    MATCH (other)-[:LIKED]->(suggestion:Location)
    WHERE NOT (me)-[:LIKED]->(suggestion)
    
    RETURN suggestion.name AS name, 
           suggestion.desc AS description, 
           suggestion.rating AS rating,
           suggestion.lat AS lat,      
           suggestion.lng AS lng,
           suggestion.PageRankScore AS pr,
           suggestion.image AS image, 
           suggestion.category AS category,
           count(other) AS common_users
           
    ORDER BY common_users DESC, pr DESC 
    LIMIT 6
    """

    results = run_query(cypher_query, {"name": user_name})

    # Fallback: Nếu user mới (Cold Start), gợi ý theo PageRank thuần túy
    if not results:
        fallback_query = """
        MATCH (l:Location) 
        RETURN l.name AS name, l.desc AS description, l.rating AS rating, 
               l.lat AS lat, l.lng AS lng, l.PageRankScore as pr,
               l.image as image,
               l.category as category,
               0 as common_users
        ORDER BY l.PageRankScore DESC
        LIMIT 6
        """
        results = run_query(fallback_query)

    return jsonify(results)


if __name__ == "__main__":
    print("🚀 Server đang chạy tại: http://127.0.0.1:5000")
    app.run(port=5000, debug=True)
