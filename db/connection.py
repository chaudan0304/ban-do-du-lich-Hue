"""
=============================================================================
db/connection.py - Quản lý kết nối Neo4j Database
db/connection.py - Neo4j Database Connection Management
=============================================================================
Mô tả / Description:
    - Quản lý kết nối đến Neo4j database (Singleton Pattern).
      Manages connection to Neo4j database (Singleton Pattern).
    - Cung cấp hàm chạy Cypher query chung (run_query).
      Provides general Cypher query execution (run_query).
    - Hỗ trợ chạy nhiều query trong 1 transaction (atomic / run_write_transaction).
      Supports running multiple queries in 1 atomic transaction (run_write_transaction).
    - Phát hiện và phân loại lỗi database (DatabaseError, ConstraintViolationError).
      Detects and classifies database errors (DatabaseError, ConstraintViolationError).

Phụ thuộc / Dependencies:
    - neo4j (Neo4j Python Driver)
    - python-dotenv (đọc biến môi trường / read environment variables)

Ghi chú / Notes:
    - Sử dụng Singleton Pattern cho driver — chỉ tạo 1 kết nối cho toàn bộ app.
      Uses Singleton Pattern for driver — creates only 1 connection for the entire app.
    - Kết nối tự động đóng khi app tắt (thông qua atexit trong app.py).
      Connection auto-closes on app shutdown (via atexit in app.py).
=============================================================================
"""

import os
import logging
from neo4j import GraphDatabase
from dotenv import load_dotenv

# Tải biến môi trường từ file .env
# Load environment variables from .env file
load_dotenv()

logger = logging.getLogger(__name__)

# -----------------------------------------------------------
# Cấu hình kết nối Neo4j (từ biến môi trường hoặc giá trị mặc định)
# Neo4j connection configuration (from environment or defaults)
# -----------------------------------------------------------
URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
USER = os.getenv("NEO4J_USER", "neo4j")
PASSWORD = os.getenv("NEO4J_PASS", "12345678")

# Biến toàn cục lưu driver (Singleton)
# Global variable storing the driver (Singleton)
_driver = None


# =============================================================
# CUSTOM EXCEPTIONS (Lỗi tùy chỉnh)
# =============================================================
class DatabaseError(Exception):
    """Lỗi chung khi thao tác database / General database operation error"""

    pass


class ConstraintViolationError(DatabaseError):
    """Lỗi khi vi phạm ràng buộc (VD: tên trùng) / Constraint violation (e.g., duplicate name)"""

    pass


# =============================================================
# HÀM LẤY DRIVER KẾT NỐI (Singleton Pattern)
# GET CONNECTION DRIVER (Singleton Pattern)
# Chỉ tạo driver mới nếu chưa có — tránh tạo nhiều kết nối thừa
# Only creates a new driver if none exists — avoids redundant connections
# =============================================================
def get_driver():
    """Lấy driver kết nối Neo4j (singleton pattern) / Get Neo4j connection driver (singleton)"""
    global _driver
    if _driver is None:
        try:
            _driver = GraphDatabase.driver(URI, auth=(USER, PASSWORD))
            _driver.verify_connectivity()
            logger.info("✅ Kết nối Neo4j thành công!")
        except Exception as e:
            logger.error(f"❌ Lỗi kết nối Neo4j: {e}")
            _driver = None
    return _driver


# =============================================================
# ĐÓNG KẾT NỐI (Connection Cleanup)
# Được gọi bởi atexit trong app.py khi server tắt
# Called by atexit in app.py when server shuts down
# =============================================================
def close_driver():
    """Đóng kết nối Neo4j / Close Neo4j connection"""
    global _driver
    if _driver:
        _driver.close()
        _driver = None


# =============================================================
# HÀM CHẠY CYPHER QUERY CHUNG (General Query Execution)
# Hàm chính để tương tác với Neo4j — dùng trong toàn bộ ứng dụng
# Primary function to interact with Neo4j — used throughout the app
#
# Tự động phát hiện lỗi constraint và ném ConstraintViolationError
# Auto-detects constraint errors and raises ConstraintViolationError
# =============================================================
def run_query(query, params=None):
   
    driver = get_driver()
    if not driver:
        raise DatabaseError("Không thể kết nối đến Neo4j Database")

    try:
        with driver.session() as session:
            result = session.run(query, params or {})
            records = [record.data() for record in result]
            return records
    except Exception as e:
        error_str = str(e).lower()
        logger.error(f"NEO4J Query Error: {e}")

        if "constraint" in error_str or "already exists" in error_str:
            raise ConstraintViolationError(f"Vi phạm ràng buộc: {e}") from e
        raise DatabaseError(f"Lỗi truy vấn database: {e}") from e


# =============================================================
# HÀM CHẠY NHIỀU QUERY TRONG 1 TRANSACTION (Atomic Write Transaction)
# Nếu bất kỳ query nào lỗi → rollback tất cả (đảm bảo tính toàn vẹn dữ liệu)
# If any query fails → rollback all (ensures data integrity)
#
# Sử dụng cho các thao tác cần đồng bộ:
# Used for operations requiring synchronization:
#   - Thêm review + cập nhật rating trung bình
#     Add review + update average rating
#   - Xóa review + cập nhật INTERACTED
#     Delete review + update INTERACTED
# =============================================================
def run_write_transaction(queries_with_params):
   
    driver = get_driver()
    if not driver:
        raise DatabaseError("Không thể kết nối đến Neo4j Database")

    def _execute(tx):
        """Callback thực thi trong transaction / Callback executed within transaction"""
        all_results = []
        for query, params in queries_with_params:
            result = tx.run(query, params or {})
            records = [record.data() for record in result]
            all_results.append(records)
        return all_results

    try:
        with driver.session() as session:
            return session.execute_write(_execute)
    except Exception as e:
        error_str = str(e).lower()
        logger.error(f"NEO4J Transaction Error: {e}")

        if "constraint" in error_str or "already exists" in error_str:
            raise ConstraintViolationError(f"Vi phạm ràng buộc: {e}") from e
        raise DatabaseError(f"Lỗi transaction database: {e}") from e
