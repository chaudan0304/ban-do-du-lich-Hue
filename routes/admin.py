"""
=============================================================================
routes/admin.py - Route quản trị hệ thống (Admin Routes)
routes/admin.py - System administration routes (Admin Routes)
=============================================================================
Mô tả / Description:
    - Quản lý người dùng (xem danh sách, xem hồ sơ, xóa user).
      User management (list users, view profiles, delete users).
    - Quản lý địa điểm (CRUD: thêm, sửa, xóa).
      Location management (CRUD: create, update, delete).
    - Thống kê hệ thống (số user, location, like, link).
      System statistics (user, location, like, link counts).
    - Trigger chạy lại thuật toán AI (PageRank, Similarity).
      Trigger AI algorithm re-run (PageRank, Similarity).

Phụ thuộc / Dependencies:
    - Flask, Flask-Login
    - db (run_query, get_all_users, delete_user_by_name, sync_locations_to_excel)
    - utils (safe_float)
    - setup_algo (run_hybrid_algo)

Bảo mật / Security:
    - TẤT CẢ route đều kiểm tra is_admin trước khi xử lý.
      ALL routes check is_admin before processing.
    - Trả về 403 Forbidden nếu user không phải admin.
      Returns 403 Forbidden if user is not admin.
=============================================================================
"""

from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
from db import run_query, get_all_users, delete_user_by_name, sync_locations_to_excel
from utils import safe_float
import setup_algo
import logging

logger = logging.getLogger(__name__)

# Đăng ký Blueprint "admin" — xử lý quản trị
# Register "admin" Blueprint — handles administration
bp = Blueprint("admin", __name__)


# =============================================================
# API QUẢN LÝ NGƯỜI DÙNG (User Management)
# =============================================================


# --- Lấy danh sách user (GET /api/admin/users) ---
# --- Get user list (GET /api/admin/users) ---
# Trả về: name, role, liked_count, comment_count
# Tự động loại bỏ admin khỏi danh sách
# Auto-excludes admin from the list
@bp.route("/api/admin/users", methods=["GET"])
@login_required
def api_get_users():
    if not current_user.is_admin:
        return jsonify({"error": "Không có quyền truy cập"}), 403

    try:
        users = get_all_users()
        logger.debug(f"📋 Get all users result: {len(users or [])} users")
        # Lọc bỏ admin khỏi danh sách hiển thị
        # Filter out admin from display list
        filtered_users = [u for u in (users or []) if u.get("name") != "admin"]
        return jsonify(filtered_users)
    except Exception as e:
        logger.error(f"Error getting users: {e}")
        return jsonify({"error": str(e)}), 500


# --- Xóa user (DELETE /api/admin/users/<username>) ---
# --- Delete user (DELETE /api/admin/users/<username>) ---
# DETACH DELETE — xóa user và TẤT CẢ quan hệ liên quan
# DETACH DELETE — removes user and ALL connected relationships
@bp.route("/api/admin/users/<username>", methods=["DELETE"])
@login_required
def api_delete_user(username):
    if not current_user.is_admin:
        return jsonify({"error": "Không có quyền truy cập"}), 403

    delete_user_by_name(username)
    return jsonify({"message": f"Đã xóa user {username}"}), 200


# --- Xem đánh giá của user (GET /api/admin/user_comments/<username>) ---
# --- View user's reviews (GET /api/admin/user_comments/<username>) ---
@bp.route("/api/admin/user_comments/<username>", methods=["GET"])
@login_required
def api_get_user_comments(username):
    if not current_user.is_admin:
        return jsonify({"error": "Không có quyền truy cập"}), 403

    query = """
    MATCH (u:User {name: $name})-[r:REVIEWED]->(l:Location)
    RETURN l.name AS location, r.rating AS rating, r.comment AS comment, toString(r.timestamp) AS time
    ORDER BY r.timestamp DESC
    """
    results = run_query(query, {"name": username})
    return jsonify(results if results else [])


# --- Xem hồ sơ chi tiết user (GET /api/admin/user_profile/<username>) ---
# --- View detailed user profile (GET /api/admin/user_profile/<username>) ---
# Trả về: thông tin cá nhân + stats + reviews + liked locations
# Returns: personal info + stats + reviews + liked locations
@bp.route("/api/admin/user_profile/<username>", methods=["GET"])
@login_required
def api_get_user_profile(username):
    if not current_user.is_admin:
        return jsonify({"error": "Không có quyền truy cập"}), 403

    # 1. Lấy thông tin User & thống kê / Get User Info & Stats
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

    # 2. Lấy danh sách Reviews / Get Reviews List
    reviews_query = """
    MATCH (u:User {name: $name})-[r:REVIEWED]->(l:Location)
    RETURN l.name AS location, r.rating AS rating, r.comment AS comment, toString(r.timestamp) AS time
    ORDER BY r.timestamp DESC
    """
    reviews = run_query(reviews_query, {"name": username})
    profile["reviews"] = reviews if reviews else []

    # 3. Lấy danh sách Liked Locations / Get Liked Locations
    liked_query = """
    MATCH (u:User {name: $name})-[r:LIKED]->(l:Location)
    OPTIONAL MATCH (l)-[:HAS_CATEGORY]->(cat:Category)
    RETURN l.name AS name, l.image AS image, cat.name AS category, l.lat AS lat, l.lng AS lng
    ORDER BY r.timestamp DESC
    """
    liked_locs = run_query(liked_query, {"name": username})
    profile["liked_locations"] = liked_locs if liked_locs else []

    return jsonify(profile)


# =============================================================
# API THỐNG KÊ HỆ THỐNG (System Statistics)
# GET /api/admin/stats
# Trả về: user_count, location_count, like_count, link_count
# =============================================================
@bp.route("/api/admin/stats", methods=["GET"])
@login_required
def get_admin_stats():
    if not current_user.is_admin:
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


# =============================================================
# API CHẠY LẠI THUẬT TOÁN AI (Trigger AI Algorithm Re-run)
# POST /api/admin/run-algo
# Gọi hàm run_hybrid_algo() trong setup_algo.py
# Calls run_hybrid_algo() in setup_algo.py
# Bao gồm: PageRank, User Similarity, Location Similarity
# Includes: PageRank, User Similarity, Location Similarity
# =============================================================
@bp.route("/api/admin/run-algo", methods=["POST"])
@login_required
def run_algo_trigger():
    if not current_user.is_admin:
        return jsonify({"error": "Không có quyền"}), 403

    try:
        setup_algo.run_hybrid_algo()
        return jsonify({"status": "success", "message": "Đã cập nhật điểm PageRank!"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# =============================================================
# API THÊM ĐỊA ĐIỂM MỚI (Create Location)
# POST /api/admin/location/add
# Body: {name, category, description, image, lat, lng}
# Tự động đồng bộ vào file Excel sau khi thêm
# Auto-syncs to Excel file after adding
# =============================================================
@bp.route("/api/admin/location/add", methods=["POST"])
@login_required
def add_location():
    if not current_user.is_admin:
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
        # Đồng bộ vào file Excel / Sync to Excel file
        sync_locations_to_excel()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# =============================================================
# API SỬA ĐỊA ĐIỂM (Update Location)
# PUT /api/admin/location/update
# Body: {old_name, name, category, description, image, lat, lng}
# Cập nhật thuộc tính + đổi category nếu cần
# Updates properties + changes category if needed
# =============================================================
@bp.route("/api/admin/location/update", methods=["PUT"])
@login_required
def update_location():
    if not current_user.is_admin:
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
        # Đồng bộ vào file Excel / Sync to Excel file
        sync_locations_to_excel()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# =============================================================
# API XÓA ĐỊA ĐIỂM (Delete Location)
# DELETE /api/admin/location/delete/<name>
# DETACH DELETE — xóa location và TẤT CẢ quan hệ liên quan
# DETACH DELETE — removes location and ALL connected relationships
# =============================================================
@bp.route("/api/admin/location/delete/<name>", methods=["DELETE"])
@login_required
def delete_location(name):
    if not current_user.is_admin:
        return jsonify({"error": "Không có quyền"}), 403

    try:
        query = "MATCH (l:Location {name: $name}) DETACH DELETE l"
        run_query(query, {"name": name})
        # Đồng bộ vào file Excel / Sync to Excel file
        sync_locations_to_excel()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
