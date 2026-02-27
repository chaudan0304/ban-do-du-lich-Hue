"""
=============================================================================
db/__init__.py - Khởi tạo package Database & Backward Compatibility
db/__init__.py - Database package initialization & Backward Compatibility
=============================================================================
Mô tả / Description:
    - Export tất cả các hàm từ các module con trong thư mục db/.
      Exports all functions from sub-modules in the db/ directory.
    - Cho phép import trực tiếp từ 'db' mà không cần chỉ định module con:
      Allows direct imports from 'db' without specifying sub-modules:
        from db import run_query, register_user, toggle_like_location, ...
    - Duy trì backward compatibility khi tách code thành nhiều file nhỏ.
      Maintains backward compatibility when splitting code into smaller files.

Cấu trúc module / Module structure:
    db/
    ├── __init__.py      ← File này (package exports)
    ├── connection.py    ← Kết nối Neo4j & hàm query chung / Neo4j connection & query functions
    ├── user.py          ← Quản lý người dùng / User management
    ├── admin.py         ← Chức năng admin / Admin functions
    ├── location.py      ← Địa điểm & tương tác / Locations & interactions
    ├── planner.py       ← AI lập lộ trình / AI itinerary planner
    ├── itinerary.py     ← Quản lý lộ trình đã lưu / Saved itinerary management
    └── sync.py          ← Đồng bộ dữ liệu Neo4j ↔ Excel / Data sync Neo4j ↔ Excel
=============================================================================
"""

# -----------------------------------------------------------
# Kết nối & Truy vấn (Connection & Query)
# -----------------------------------------------------------
from .connection import (
    get_driver,
    close_driver,
    run_query,
    run_write_transaction,
    DatabaseError,
    ConstraintViolationError,
)

# -----------------------------------------------------------
# Quản lý Người dùng (User Management)
# -----------------------------------------------------------
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

# -----------------------------------------------------------
# Chức năng Quản trị (Admin Functions)
# -----------------------------------------------------------
from .admin import get_all_users, delete_user_by_name

# -----------------------------------------------------------
# Địa điểm & Tương tác (Location & Interactions)
# -----------------------------------------------------------
from .location import (
    toggle_like_location,
    add_review,
    get_location_reviews,
    delete_review,
)

# -----------------------------------------------------------
# AI Planner (Lập lộ trình thông minh / Smart itinerary generation)
# -----------------------------------------------------------
from .planner import generate_itinerary

# -----------------------------------------------------------
# Quản lý Lộ trình đã lưu (Saved Itinerary Management)
# -----------------------------------------------------------
from .itinerary import (
    save_user_itinerary,
    get_user_itineraries,
    delete_user_itinerary,
)

# -----------------------------------------------------------
# Đồng bộ dữ liệu (Data Synchronization)
# -----------------------------------------------------------
from .sync import sync_locations_to_excel

# -----------------------------------------------------------
# Danh sách export chính thức (__all__)
# Official export list (__all__)
# Giúp IDE và linter biết được các symbol public của package
# Helps IDEs and linters know the public symbols of the package
# -----------------------------------------------------------
__all__ = [
    # Connection — Kết nối
    "get_driver",
    "close_driver",
    "run_query",
    "run_write_transaction",
    "DatabaseError",
    "ConstraintViolationError",
    # User — Người dùng
    "register_user",
    "get_user_info",
    "update_user_info",
    "verify_user",
    "verify_user_account",
    "reset_user_password",
    "get_user_reviews",
    "get_user_likes",
    # Admin — Quản trị
    "get_all_users",
    "delete_user_by_name",
    # Location — Địa điểm
    "toggle_like_location",
    "add_review",
    "get_location_reviews",
    "delete_review",
    # Planner — Lộ trình
    "generate_itinerary",
    # Itinerary — Lộ trình đã lưu
    "save_user_itinerary",
    "get_user_itineraries",
    "delete_user_itinerary",
    # Sync — Đồng bộ
    "sync_locations_to_excel",
]
