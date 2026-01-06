from neo4j import GraphDatabase
import os
from dotenv import load_dotenv

# -------------------------------------
# Đọc file .env
load_dotenv()

URI = os.getenv("NEO4J_URI")
USER = os.getenv("NEO4J_USER")
PASS = os.getenv("NEO4J_PASS")
AUTH = (USER, PASS)


def run_algo():
    driver = GraphDatabase.driver(URI, auth=AUTH)
    with driver.session() as session:
        print("⏳ Đang khởi động GDS...")

        # 1. Xóa đồ thị ảo cũ
        try:
            # FIX: Thêm YIELD graphName để Neo4j không trả về schema cũ (gây warning)
            session.run("CALL gds.graph.drop('myGraph', false) YIELD graphName")
            print("🗑️  Đã dọn dẹp đồ thị ảo cũ.")
        except Exception as e:
            print(f"ℹ️  Thông báo: {e}")

        # 2. TẠO ĐỒ THỊ ẢO
        print("1️⃣  Đang load dữ liệu vào RAM...")
        # Ở bước này, project trả về nodeProjection, relationshipProjection...
        # Nếu cũng bị warning tương tự, bạn có thể thêm YIELD graphName, nodeCount...
        session.run(
            """
            CALL gds.graph.project(
                'myGraph',
                ['User', 'Location'],
                'LIKED'
            ) YIELD graphName, nodeCount, relationshipCount
        """
        )

        # 3. CHẠY THUẬT TOÁN PAGERANK
        print("2️⃣  Đang chạy thuật toán PageRank...")
        session.run(
            """
            CALL gds.pageRank.write('myGraph', {
                writeProperty: 'pagerankScore',
                maxIterations: 20,
                dampingFactor: 0.85
            }) YIELD nodePropertiesWritten, ranIterations
        """
        )

        # 4. Kiểm tra kết quả
        print("\n✅ KẾT QUẢ XẾP HẠNG (TOP 5 PAGERANK):")
        result = session.run(
            """
            MATCH (l:Location)
            RETURN l.name AS name, l.pagerankScore AS score
            ORDER BY l.pagerankScore DESC
            LIMIT 5
        """
        )

        for record in result:
            print(f"- {record['name']}: {record['score']:.4f}")

    driver.close()


if __name__ == "__main__":
    run_algo()
    print("🚀 Thuật toán đã hoàn tất.")
