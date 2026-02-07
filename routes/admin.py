from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
from db import run_query, get_all_users, delete_user_by_name, sync_locations_to_excel
from utils import safe_float
import setup_algo
import logging

logger = logging.getLogger(__name__)

bp = Blueprint("admin", __name__)


# --- 5. API ADMIN: QUẢN LÝ NGƯỜI DÙNG ---
@bp.route("/api/admin/users", methods=["GET"])
@login_required
def api_get_users():
    if current_user.role != "admin":
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


@bp.route("/api/admin/users/<username>", methods=["DELETE"])
@login_required
def api_delete_user(username):
    if current_user.role != "admin":
        return jsonify({"error": "Không có quyền truy cập"}), 403

    delete_user_by_name(username)
    return jsonify({"message": f"Đã xóa user {username}"}), 200


@bp.route("/api/admin/user_comments/<username>", methods=["GET"])
@login_required
def api_get_user_comments(username):
    if current_user.role != "admin":
        return jsonify({"error": "Không có quyền truy cập"}), 403

    query = """
    MATCH (u:User {name: $name})-[r:REVIEWED]->(l:Location)
    RETURN l.name AS location, r.rating AS rating, r.comment AS comment, toString(r.timestamp) AS time
    ORDER BY r.timestamp DESC
    """
    results = run_query(query, {"name": username})
    return jsonify(results if results else [])


@bp.route("/api/admin/user_profile/<username>", methods=["GET"])
@login_required
def api_get_user_profile(username):
    if current_user.role != "admin":
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


# --- API LẤY THỐNG KÊ ---
@bp.route("/api/admin/stats", methods=["GET"])
@login_required
def get_admin_stats():
    if not current_user.is_authenticated or current_user.role != "admin":
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
@bp.route("/api/admin/run-algo", methods=["POST"])
@login_required
def run_algo_trigger():
    if not current_user.is_authenticated or current_user.role != "admin":
        return jsonify({"error": "Không có quyền"}), 403

    try:
        setup_algo.run_hybrid_algo()
        return jsonify({"status": "success", "message": "Đã cập nhật điểm PageRank!"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# --- API THÊM ĐỊA ĐIỂM MỚI (CREATE) ---
@bp.route("/api/admin/location/add", methods=["POST"])
@login_required
def add_location():
    if not current_user.is_authenticated or current_user.role != "admin":
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
@bp.route("/api/admin/location/update", methods=["PUT"])
@login_required
def update_location():
    if not current_user.is_authenticated or current_user.role != "admin":
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
# --- API XÓA ĐỊA ĐIỂM (DELETE) ---
@bp.route("/api/admin/location/delete/<name>", methods=["DELETE"])
@login_required
def delete_location(name):
    if not current_user.is_authenticated or current_user.role != "admin":
        return jsonify({"error": "Không có quyền"}), 403

    try:
        # Decode name nếu cần thiết, nhưng flask thường tự decode
        query = "MATCH (l:Location {name: $name}) DETACH DELETE l"
        run_query(query, {"name": name})
        # Đồng bộ vào file Excel
        sync_locations_to_excel()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
