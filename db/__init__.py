"""
db/__init__.py - Package initialization & backward compatibility exports

Export tất cả các hàm từ các module con để giữ backward compatibility.
Các file import từ `db` vẫn hoạt động bình thường:
    from db import run_query, register_user, toggle_like_location, ...
"""

# Connection & Query
from .connection import get_driver, close_driver, run_query

# User Management
from .user import (
    register_user,
    get_user_info,
    update_user_info,
    verify_user,
    verify_user_account,
    reset_user_password,
    get_user_reviews,
    get_user_likes,
)

# Admin Functions
from .admin import get_all_users, delete_user_by_name

# Location & Interactions
from .location import (
    toggle_like_location,
    add_review,
    get_location_reviews,
    delete_review,
)

# AI Planner
from .planner import generate_itinerary

# Itinerary Management
from .itinerary import (
    save_user_itinerary,
    get_user_itineraries,
    delete_user_itinerary,
)

# Data Sync
from .sync import sync_locations_to_excel

# Export all for convenience
__all__ = [
    # Connection
    "get_driver",
    "close_driver",
    "run_query",
    # User
    "register_user",
    "get_user_info",
    "update_user_info",
    "verify_user",
    "verify_user_account",
    "reset_user_password",
    "get_user_reviews",
    "get_user_likes",
    # Admin
    "get_all_users",
    "delete_user_by_name",
    # Location
    "toggle_like_location",
    "add_review",
    "get_location_reviews",
    "delete_review",
    # Planner
    "generate_itinerary",
    # Itinerary
    "save_user_itinerary",
    "get_user_itineraries",
    "delete_user_itinerary",
    # Sync
    "sync_locations_to_excel",
]
