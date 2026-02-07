"""
db/admin.py - Các hàm quản trị hệ thống (Admin)
"""

from .connection import run_query


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
