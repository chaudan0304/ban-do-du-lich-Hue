"""
=============================================================================
db/itinerary.py - Quản lý lộ trình đã lưu của người dùng
db/itinerary.py - User's saved itinerary management
=============================================================================
Mô tả / Description:
    - Lưu lộ trình do AI tạo vào Neo4j (node Itinerary).
      Save AI-generated itinerary to Neo4j (Itinerary node).
    - Lấy danh sách lộ trình đã lưu của user.
      Get list of user's saved itineraries.
    - Xóa lộ trình đã lưu.
      Delete saved itinerary.

Phụ thuộc / Dependencies:
    - json (chuyển đổi dữ liệu lộ trình / convert itinerary data)
    - db.connection (run_query)

Cấu trúc dữ liệu trong Neo4j / Data structure in Neo4j:
    (User)-[:CREATED]->(Itinerary {id, title, data, days, created_at})
    - data: JSON string chứa mảng các ngày & hoạt động
            JSON string containing array of days & activities
=============================================================================
"""

import json
import logging
from .connection import run_query

logger = logging.getLogger(__name__)


# =============================================================
# LƯU LỘ TRÌNH (Save Itinerary)
# Chuyển dữ liệu plan thành JSON string và lưu vào node Itinerary
# Converts plan data to JSON string and saves to Itinerary node
#
# Hỗ trợ 2 format input:
# Supports 2 input formats:
#   1. {"title": "...", "plan": [...]} — wrapper object
#   2. [...] — trực tiếp plan array
# =============================================================
def save_user_itinerary(username, itinerary_data):
    """
    Lưu lộ trình vào DB.
    Save itinerary to database.

    Args:
        username (str): Tên người dùng / Username
        itinerary_data (dict|list): Dữ liệu lộ trình / Itinerary data

    Returns:
        (success: bool, message: str)
    """
    # Xử lý format input linh hoạt / Handle flexible input format
    if isinstance(itinerary_data, dict):
        plan = itinerary_data.get("plan", [])
        title = itinerary_data.get("title", "")
    else:
        plan = itinerary_data
        title = ""

    # Tính số ngày từ plan array / Calculate days from plan array
    days_count = len(plan) if isinstance(plan, list) else 0
    if not title:
        title = f"Lịch trình {days_count} ngày tại Huế"

    # Chỉ lưu plan array (không lưu wrapper object) — dễ parse khi đọc lại
    # Only save plan array (not wrapper object) — easier to parse when reading back
    data_json = json.dumps(plan, ensure_ascii=False)

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
        logger.error(f"Error saving itinerary: {e}")
        return False, str(e)


# =============================================================
# LẤY DANH SÁCH LỘ TRÌNH CỦA USER (Get User Itineraries)
# Parse JSON string trong trường 'data' thành Python object
# Parses JSON string in 'data' field back to Python object
# Sắp xếp theo thời gian tạo mới nhất
# Sorted by newest creation time
# =============================================================
def get_user_itineraries(username):
    """
    Lấy danh sách lộ trình của user.
    Get list of user's itineraries.

    Returns:
        list[dict]: Mỗi dict chứa / Each dict contains:
            id, title, days, data (parsed JSON), created_at
    """
    query = """
    MATCH (u:User {name: $username})-[:CREATED]->(i:Itinerary)
    RETURN i.id as id, i.title as title, i.days as days, i.data as data, toString(i.created_at) as created_at
    ORDER BY i.created_at DESC
    """
    results = run_query(query, {"username": username})

    # Parse JSON string back to Python object
    # Chuyển JSON string trở lại thành Python object
    for r in results:
        try:
            r["data"] = json.loads(r["data"])
        except Exception:
            r["data"] = []  # Fallback nếu JSON lỗi / Fallback if JSON is invalid
    return results


# =============================================================
# XÓA LỘ TRÌNH (Delete Itinerary)
# Sử dụng DETACH DELETE để xóa node và quan hệ :CREATED
# Uses DETACH DELETE to remove node and :CREATED relationship
# =============================================================
def delete_user_itinerary(username, itinerary_id):
    """
    Xóa lộ trình.
    Delete itinerary.

    Args:
        username (str): Tên người dùng (xác thực quyền sở hữu)
                        Username (ownership verification)
        itinerary_id (str): ID lộ trình cần xóa / Itinerary ID to delete
    """
    query = """
    MATCH (u:User {name: $username})-[:CREATED]->(i:Itinerary {id: $id})
    DETACH DELETE i
    """
    run_query(query, {"username": username, "id": itinerary_id})
    return True
