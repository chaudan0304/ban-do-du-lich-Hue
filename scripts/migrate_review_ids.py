"""
=============================================================================
scripts/migrate_review_ids.py - Chuyển đổi ID cho Reviews (Review ID Migration)
=============================================================================
Mô tả / Description:
    Gán UUID duy nhất cho các REVIEWED relationship chưa có ID.
    Assigns unique UUIDs to REVIEWED relationships that don't have an ID.

    Mục đích / Purpose:
    - Đảm bảo mỗi review có ID duy nhất để hỗ trợ sửa/xóa chính xác.
      Ensures each review has a unique ID for precise edit/delete operations.
    - Chạy MỘT LẦN khi nâng cấp hệ thống (migration script).
      Runs ONCE during system upgrade (migration script).

Phụ thuộc / Dependencies:
    - db (run_query) — thông qua sys.path append
      db (run_query) — via sys.path append

Cách chạy / How to run:
    python scripts/migrate_review_ids.py
=============================================================================
"""

import sys
import os

# Thêm thư mục cha vào path / Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from db import run_query


def migrate_ids():
    """
    Gán randomUUID() cho các REVIEWED relationship chưa có r.id.
    Assign randomUUID() to REVIEWED relationships missing r.id.
    """
    print("Migrating Review IDs...")
    query = """
    MATCH ()-[r:REVIEWED]->()
    WHERE r.id IS NULL
    SET r.id = randomUUID()
    RETURN count(r) as updated_count
    """
    try:
        res = run_query(query)
        print(f"Update Result: {res}")
    except Exception as e:
        print(f"Error: {e}")


# ═══════════════════════════════════════════════════════
# ENTRY POINT / Chạy: python scripts/migrate_review_ids.py
# ═══════════════════════════════════════════════════════
if __name__ == "__main__":
    migrate_ids()
