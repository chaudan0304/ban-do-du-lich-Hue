import os
from dotenv import load_dotenv
from neo4j import GraphDatabase

# Đọc file .env (phải gọi trước khi dùng os.getenv)
load_dotenv()

# Lấy giá trị từ .env (nếu không có sẽ là None → báo lỗi rõ ràng)
URI = os.getenv("NEO4J_URI")
USER = os.getenv("NEO4J_USER")
PASS = os.getenv("NEO4J_PASS")

if not all([URI, USER, PASS]):
    raise ValueError("❌ Thiếu biến môi trường trong file .env! Kiểm tra NEO4J_URI, NEO4J_USER, NEO4J_PASS")

AUTH = (USER, PASS)

driver = None

def get_driver():
    """Hàm lấy driver kết nối (Singleton)"""
    global driver
    if driver is None:
        try:
            driver = GraphDatabase.driver(URI, auth=AUTH)
            driver.verify_connectivity()
            print("✅ (db.py) Đã kết nối Neo4j thành công!")
        except Exception as e:
            print(f"❌ (db.py) Lỗi kết nối: {e}")
            driver = None
    return driver



def close_driver():
    """Hàm đóng kết nối"""
    global driver
    if driver:
        driver.close()
        driver = None

def run_query(query, params=None):
    """Hàm chạy lệnh Cypher chung cho cả dự án"""
    driver = get_driver()
    if driver:
        with driver.session() as session:
            result = session.run(query, params or {})
            return [record.data() for record in result]
    return None