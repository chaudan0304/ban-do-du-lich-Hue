"""
setup_algo.py - Thuật toán Hybrid Recommendation cho Huế Travel AI
==================================================================
Mục tiêu:
- Tạo relationship :RELATED_TO với trọng số động (co-occurrence + category)
- Chạy PageRank trên 2 đồ thị:
  + User-Location (dựa trên :LIKED) → pagerankScore (phổ biến toàn cục)
  + Location-Location (dựa trên :RELATED_TO) → pagerankConnect (kết nối mạng lưới)
- Normalize score để dùng trong Cypher recommend
- Hỗ trợ Collaborative Filtering (qua co-occurrence) & Content-based (qua category)
- Tương thích Neo4j 5.11.2 + GDS 2.24.0, tắt warning deprecation
"""

from neo4j import GraphDatabase, NotificationSeverity
import os
import sys
from dotenv import load_dotenv
from datetime import datetime

# Fix encoding cho Windows console (hỗ trợ emoji)
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()

URI = os.getenv("NEO4J_URI")
USER = os.getenv("NEO4J_USER")
PASS = os.getenv("NEO4J_PASS")
AUTH = (USER, PASS)

# Tên graph động
GRAPH_USER = "hybrid_user_graph"
GRAPH_LOC = "hybrid_loc_graph"

# Trọng số
WEIGHT_CO_OCCURRENCE = 1.2  # Mỗi user chung like tăng weight thêm 1.2
WEIGHT_CATEGORY = 0.8  # Cùng category

# PageRank config
MAX_ITERATIONS = 12  # Đủ cho đồ thị nhỏ
DAMPING_FACTOR = 0.88  # Cân bằng global vs local


def run_hybrid_algo():
    """
    Chạy thuật toán hybrid recommendation:
    1. Dọn dẹp :RELATED_TO cũ
    2. Tạo liên kết :RELATED_TO với trọng số động
    3. Chạy PageRank trên 2 đồ thị riêng biệt
    4. Normalize score & lưu timestamp
    5. In bảng so sánh kết quả
    """
    driver = GraphDatabase.driver(
        URI,
        auth=AUTH,
        notifications_min_severity=NotificationSeverity.WARNING,  # Tắt warning deprecation
    )

    with driver.session() as session:
        print("⏳ Đang xử lý dữ liệu Hybrid...")

        # --- 0. Lưu timestamp phiên bản ---
        run_timestamp = datetime.now().isoformat()
        print(f"📅 Thời gian chạy: {run_timestamp}")

        # --- 1. Dọn dẹp liên kết RELATED_TO cũ ---
        print(" 🧹 Đang dọn dẹp liên kết cũ...")
        try:
            session.run("MATCH ()-[r:RELATED_TO]->() DELETE r")
        except Exception as e:
            print(f"⚠️ Lỗi dọn dẹp liên kết: {e}")

        # --- 2a. Tạo :RELATED_TO từ co-occurrence (Collaborative Filtering) ---
        print("1️⃣a Đang tạo liên kết co-occurrence (trọng số động)...")
        try:
            session.run(
                """
                MATCH (u:User)-[:LIKED]->(l1:Location)
                MATCH (u)-[:LIKED]->(l2:Location)
                WHERE elementId(l1) < elementId(l2)
                WITH l1, l2, count(DISTINCT u) AS common_users
                MERGE (l1)-[r:RELATED_TO]-(l2)
                SET r.weight = coalesce(r.weight, 0) + (common_users * $weight)
                """,
                {"weight": WEIGHT_CO_OCCURRENCE},
            )
        except Exception as e:
            print(f"❌ Lỗi tạo liên kết co-occurrence: {e}")

        # --- 2b. Tạo :RELATED_TO từ cùng category (Content-based) ---
        print("1️⃣b Tạo liên kết cùng danh mục...")
        try:
            session.run(
                """
                MATCH (l1:Location)-[:HAS_CATEGORY]->(cat:Category)<-[:HAS_CATEGORY]-(l2:Location)
                WHERE elementId(l1) < elementId(l2)
                MERGE (l1)-[r:RELATED_TO]-(l2)
                SET r.weight = coalesce(r.weight, 0) + $weight
                """,
                {"weight": WEIGHT_CATEGORY},
            )
        except Exception as e:
            print(f"❌ Lỗi tạo liên kết category: {e}")

        # --- 3. PageRank phổ biến (User vote - Collaborative) ---
        print("2️⃣ Tính PageRank phổ biến (dựa trên :LIKED)...")
        try:
            session.run(
                "CALL gds.graph.drop($name, false) YIELD graphName", {"name": GRAPH_USER}
            )
        except Exception as e:
            pass  # Bỏ qua lỗi nếu graph không tồn tại

        try:
            session.run(
                """
                CALL gds.graph.project(
                    $graphName,
                    ['User', 'Location'],
                    'LIKED'
                )
                """,
                {"graphName": GRAPH_USER},
            )
        except Exception as e:
            print(f"❌ Lỗi project graph user: {e}")
            driver.close()
            return

        try:
            session.run(
                """
                CALL gds.pageRank.write($graphName, {
                    writeProperty: 'pagerankScore',
                    maxIterations: $max_iter,
                    dampingFactor: $damping
                })
                """,
                {
                    "graphName": GRAPH_USER,
                    "max_iter": MAX_ITERATIONS,
                    "damping": DAMPING_FACTOR,
                },
            )
        except Exception as e:
            print(f"❌ Lỗi chạy PageRank user: {e}")
            driver.close()
            return

        # --- 4. PageRank kết nối (Location network) ---
        print("3️⃣ Tính PageRank kết nối (dựa trên :RELATED_TO)...")
        try:
            session.run(
                "CALL gds.graph.drop($name, false) YIELD graphName", {"name": GRAPH_LOC}
            )
        except Exception as e:
            pass  # Bỏ qua lỗi nếu graph không tồn tại

        try:
            session.run(
                """
                CALL gds.graph.project(
                    $graphName,
                    'Location',
                    {
                        RELATED_TO: {
                            orientation: 'UNDIRECTED'
                        }
                    }
                )
                """,
                {"graphName": GRAPH_LOC},
            )
        except Exception as e:
            print(f"❌ Lỗi project graph loc: {e}")
            driver.close()
            return

        try:
            session.run(
                """
                CALL gds.pageRank.write($graphName, {
                    writeProperty: 'pagerankConnect', 
                    maxIterations: $max_iter,
                    dampingFactor: $damping
                })
                """,
                {
                    "graphName": GRAPH_LOC,
                    "max_iter": MAX_ITERATIONS,
                    "damping": DAMPING_FACTOR,
                },
            )
        except Exception as e:
            print(f"❌ Lỗi chạy PageRank loc: {e}")
            driver.close()
            return

        # --- 5. Normalize score & lưu timestamp ---
        print("📊 Normalize score và lưu timestamp...")
        try:
            session.run(
                """
                MATCH (l:Location)
                WITH max(l.pagerankScore) AS max_pr, max(l.pagerankConnect) AS max_pc
                MATCH (l:Location)
                SET l.pagerankNorm = coalesce(l.pagerankScore, 0) / max_pr,
                    l.pagerankConnectNorm = coalesce(l.pagerankConnect, 0) / max_pc,
                    l.lastAlgoRun = $timestamp,
                    l.algoVersion = 'hybrid_2025'
                """,
                {"timestamp": run_timestamp},
            )
        except Exception as e:
            print(f"⚠️ Lỗi normalize & timestamp: {e}")

        # --- 6. In kết quả so sánh ---
        print("\n✅ SO SÁNH KẾT QUẢ (Top 50):")
        print(
            f"{'Tên địa điểm':<36} | {'Phổ biến (User)':^15} | {'Kết nối (Mạng lưới)':^20} | {'Tổng điểm':^12} |"
        )
        print("-" * 94)

        result = session.run(
            """
            MATCH (l:Location)
            RETURN l.name AS name, 
                   coalesce(l.pagerankScore, 0) AS score1, 
                   coalesce(l.pagerankConnect, 0) AS score2,
                   coalesce(l.pagerankScore, 0) + coalesce(l.pagerankConnect, 0) AS total_score
            ORDER BY total_score DESC
            LIMIT 50
            """
        )

        for r in result:
            print(
                f"{r['name']:<36} | {r['score1']:^15.4f} | {r['score2']:^20.4f} | {r['total_score']:^12.4f} |"
            )
        print("-" * 94)

    driver.close()
    print(f"\n🚀 Hoàn tất! Dữ liệu đã cập nhật lúc {run_timestamp}")


if __name__ == "__main__":
    run_hybrid_algo()
