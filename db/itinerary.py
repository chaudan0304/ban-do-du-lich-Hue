"""
db/itinerary.py - Quản lý lộ trình đã lưu của người dùng
"""

import json
import logging
from .connection import run_query

logger = logging.getLogger(__name__)


def save_user_itinerary(username, itinerary_data):
    """Lưu lộ trình vào DB"""
    # itinerary_data có thể là: {"title": "...", "plan": [...]} hoặc trực tiếp là array
    if isinstance(itinerary_data, dict):
        plan = itinerary_data.get("plan", [])
        title = itinerary_data.get("title", "")
    else:
        plan = itinerary_data
        title = ""

    # Tính số ngày từ plan array
    days_count = len(plan) if isinstance(plan, list) else 0
    if not title:
        title = f"Lịch trình {days_count} ngày tại Huế"

    # Chỉ lưu plan array (không lưu wrapper object)
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
        except Exception:
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
