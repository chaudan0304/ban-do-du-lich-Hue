from neo4j import GraphDatabase
import os
from dotenv import load_dotenv

load_dotenv()

URI = os.getenv("NEO4J_URI")
USER = os.getenv("NEO4J_USER")
PASS = os.getenv("NEO4J_PASS")
AUTH = (USER, PASS)


def run_hybrid_algo():
    driver = GraphDatabase.driver(URI, auth=AUTH)
    with driver.session() as session:
        print("⏳ Đang xử lý dữ liệu Hybrid...")

        # --- PHẦN 1: TẠO MỐI QUAN HỆ 'RELATED_TO' (Location <-> Location) ---
        print("1️⃣  Đang tạo mối liên hệ giữa các địa điểm (Co-occurrence)...")
        # Logic: Nếu cùng 1 user thích cả 2 địa điểm, thì 2 địa điểm đó liên quan nhau
        session.run(
            """
            MATCH (u:User)-[:LIKED]->(l1:Location)
            MATCH (u)-[:LIKED]->(l2:Location)
            WHERE elementId(l1) < elementId(l2)
            MERGE (l1)-[:RELATED_TO]-(l2)
        """
        )

        # --- PHẦN 2: CHẠY PAGERANK PHỔ BIẾN (User Vote) ---
        print("2️⃣  Tính điểm 'Phổ biến' (Dựa trên LIKED)...")
        try:
            session.run("CALL gds.graph.drop('graphUser', false) YIELD graphName")
        except:
            pass

        session.run(
            """
            CALL gds.graph.project(
                'graphUser',
                ['User', 'Location'],
                'LIKED'
            )
        """
        )

        session.run(
            """
            CALL gds.pageRank.write('graphUser', {
                writeProperty: 'pagerankScore',
                maxIterations: 20,
                dampingFactor: 0.85
            })
        """
        )

        # --- PHẦN 3: CHẠY PAGERANK KẾT NỐI (Location Network) ---
        print("3️⃣ Tính điểm 'Kết nối' (Dựa trên RELATED_TO)...")
        try:
            session.run("CALL gds.graph.drop('graphLoc', false) YIELD graphName")
        except:
            pass

        session.run(
            """
            CALL gds.graph.project(
                'graphLoc',
                'Location',
                {
                    RELATED_TO: {
                        orientation: 'UNDIRECTED'
                    }
                }
            )
        """
        )

        session.run(
            """
            CALL gds.pageRank.write('graphLoc', {
                writeProperty: 'pagerankConnect', 
                maxIterations: 20,
                dampingFactor: 0.85
            })
        """
        )

        # --- PHẦN 4: HIỂN THỊ KẾT QUẢ SO SÁNH ---
        print("\n✅ SO SÁNH KẾT QUẢ:")
        print(
            f"{'Tên địa điểm':<30} | {'Phổ biến (User)':<15} | {'Kết nối (Mạng lưới)':<15}"
        )
        print("-" * 70)

        result = session.run(
            """
            MATCH (l:Location)
            RETURN l.name AS name, 
                   coalesce(l.pagerankScore, 0) AS score1, 
                   coalesce(l.pagerankConnect, 0) AS score2
            ORDER BY score1 DESC
            LIMIT 10
        """
        )

        for r in result:
            print(f"{r['name']:<30} | {r['score1']:.4f}          | {r['score2']:.4f}")

    driver.close()


if __name__ == "__main__":
    run_hybrid_algo()
    print("\n🚀 Đã cập nhật xong cả 2 loại điểm số!")
