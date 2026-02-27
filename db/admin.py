"""
=============================================================================
db/admin.py - Các hàm quản trị hệ thống (Admin Functions)
db/admin.py - System administration functions (Admin Functions)
=============================================================================
Mô tả / Description:
    - Lấy danh sách tất cả người dùng (kèm thống kê hoạt động).
      Get list of all users (with activity statistics).
    - Xóa người dùng khỏi hệ thống (DETACH DELETE — xóa cả quan hệ).
      Delete user from the system (DETACH DELETE — removes all relationships).

Phụ thuộc / Dependencies:
    - db.connection (run_query)

Bảo mật / Security:
    - Các route gọi hàm này đều kiểm tra quyền admin trước.
      Routes calling these functions check admin permission first.
=============================================================================
"""

from .connection import run_query


# =============================================================
# LẤY DANH SÁCH TẤT CẢ NGƯỜI DÙNG (Get All Users)
# Trả về: name, role, liked_count, comment_count
# Returns: name, role, liked_count, comment_count
# Sắp xếp theo thời gian tạo mới nhất
# Sorted by newest creation time
# =============================================================
def get_all_users():
    """Lấy danh sách tất cả user (kèm thống kê) / Get all users (with statistics)"""
    query = """
    MATCH (u:User) 
    OPTIONAL MATCH (u)-[r:LIKED]->()
    OPTIONAL MATCH (u)-[rev:REVIEWED]->()
    WITH u.name as name, u.role as role, u.created_at as created_at, count(DISTINCT r) as liked_count, count(DISTINCT rev) as comment_count
    RETURN name, role, liked_count, comment_count
    ORDER BY coalesce(created_at, datetime()) DESC
    """
    return run_query(query)


# =============================================================
# XÓA NGƯỜI DÙNG (Delete User)
# Sử dụng DETACH DELETE — xóa node User VÀ tất cả quan hệ liên quan
# Uses DETACH DELETE — removes User node AND all connected relationships
# Bao gồm: LIKED, REVIEWED, INTERACTED, CREATED (itineraries)
# Includes: LIKED, REVIEWED, INTERACTED, CREATED (itineraries)
# =============================================================
def delete_user_by_name(username):
    """Xóa user khỏi hệ thống / Delete user from system"""
    query = "MATCH (u:User {name: $name}) DETACH DELETE u"
    run_query(query, {"name": username})
    return True
