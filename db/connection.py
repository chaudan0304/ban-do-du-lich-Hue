"""
db/connection.py - Quản lý kết nối Neo4j Database
"""

import os
from neo4j import GraphDatabase
from dotenv import load_dotenv

# Load biến môi trường
load_dotenv()

# Cấu hình Neo4j connection
URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
USER = os.getenv("NEO4J_USER", "neo4j")
PASSWORD = os.getenv("NEO4J_PASS", "12345678")

_driver = None


def get_driver():
    """Lấy driver kết nối Neo4j (singleton pattern)"""
    global _driver
    if _driver is None:
        try:
            _driver = GraphDatabase.driver(URI, auth=(USER, PASSWORD))
            _driver.verify_connectivity()
            print("✅ Kết nối Neo4j thành công!")
        except Exception as e:
            print(f"❌ Lỗi kết nối Neo4j: {e}")
            _driver = None
    return _driver


def close_driver():
    """Đóng kết nối Neo4j"""
    global _driver
    if _driver:
        _driver.close()
        _driver = None


def run_query(query, params=None):
    """Hàm chạy lệnh Cypher chung, bắt lỗi và trả về kết quả an toàn"""
    driver = get_driver()
    if not driver:
        return None

    try:
        with driver.session() as session:
            result = session.run(query, params or {})
            records = [record.data() for record in result]
            return records
    except Exception as e:
        error_str = str(e).lower()
        print(f"[ERROR] NEO4J: {e}")

        # Phát hiện lỗi constraint (tên trùng)
        if "constraint" in error_str or "already exists" in error_str:
            return "CONSTRAINT_VIOLATION"
        return None
