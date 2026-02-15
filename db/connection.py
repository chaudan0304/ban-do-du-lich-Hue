"""
db/connection.py - Quản lý kết nối Neo4j Database
"""

import os
import logging
from neo4j import GraphDatabase
from dotenv import load_dotenv

# Load biến môi trường
load_dotenv()

logger = logging.getLogger(__name__)

# Cấu hình Neo4j connection
URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
USER = os.getenv("NEO4J_USER", "neo4j")
PASSWORD = os.getenv("NEO4J_PASS", "12345678")

_driver = None


class DatabaseError(Exception):
    """Lỗi chung khi thao tác database"""

    pass


class ConstraintViolationError(DatabaseError):
    """Lỗi khi vi phạm ràng buộc (VD: tên trùng)"""

    pass


def get_driver():
    """Lấy driver kết nối Neo4j (singleton pattern)"""
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


def close_driver():
    """Đóng kết nối Neo4j"""
    global _driver
    if _driver:
        _driver.close()
        _driver = None


def run_query(query, params=None):
    """
    Hàm chạy lệnh Cypher chung.

    Returns:
        list[dict]: Danh sách kết quả. Trả về list rỗng [] nếu không có kết quả.

    Raises:
        DatabaseError: Khi có lỗi kết nối hoặc lỗi query.
        ConstraintViolationError: Khi vi phạm ràng buộc (tên trùng, etc.)
    """
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

        # Phát hiện lỗi constraint (tên trùng)
        if "constraint" in error_str or "already exists" in error_str:
            raise ConstraintViolationError(f"Vi phạm ràng buộc: {e}") from e
        raise DatabaseError(f"Lỗi truy vấn database: {e}") from e


def run_write_transaction(queries_with_params):
    """
    Chạy nhiều lệnh Cypher trong MỘT transaction duy nhất (atomic).
    Nếu bất kỳ query nào lỗi → rollback tất cả.

    Args:
        queries_with_params: list of (query_string, params_dict) tuples.

    Returns:
        list[list[dict]]: Danh sách kết quả cho từng query.

    Raises:
        DatabaseError: Khi có lỗi kết nối hoặc lỗi query.
    """
    driver = get_driver()
    if not driver:
        raise DatabaseError("Không thể kết nối đến Neo4j Database")

    def _execute(tx):
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
