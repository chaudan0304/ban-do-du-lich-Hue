"""
setup_algo.py - Thuật toán Hybrid Recommendation cho Huế Travel AI (v2.0)
=========================================================================
Mục tiêu:
- TẠO QUAN HỆ :INTERACTED với trọng số tổng hợp từ :LIKED và :REVIEWED
  + Công thức: LIKED = 1 điểm, REVIEWED = 1-5 sao → Tổng tối đa 6 điểm/user-location
- Tạo relationship :RELATED_TO với trọng số động (co-occurrence + category)
- Chạy Weighted PageRank trên 2 đồ thị:
  + User-Location (dựa trên :INTERACTED với weight) → pagerankScore (phổ biến + chất lượng)
  + Location-Location (dựa trên :RELATED_TO) → pagerankConnect (kết nối mạng lưới)
- Normalize score để dùng trong Cypher recommend
- Hỗ trợ Collaborative Filtering (qua co-occurrence) & Content-based (qua category)
- Tương thích Neo4j 5.11.2 + GDS 2.24.0
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

# Trọng số cho Interaction Weighting
WEIGHT_LIKED = 1.0        # Like đóng góp 1 điểm
WEIGHT_REVIEW_MAX = 5.0   # Review tối đa 5 sao → tổng cộng tối đa 6 điểm

# Trọng số cho RELATED_TO (Location - Location)
WEIGHT_CO_OCCURRENCE = 1.2  # Mỗi user chung like tăng weight thêm 1.2
WEIGHT_CATEGORY = 0.8       # Cùng category

# PageRank config
MAX_ITERATIONS = 12   # Đủ cho đồ thị nhỏ
DAMPING_FACTOR = 0.88 # Cân bằng global vs local


def run_hybrid_algo():
    """
    Chạy thuật toán hybrid recommendation v2.0:
    1. Dọn dẹp quan hệ :INTERACTED và :RELATED_TO cũ
    2. Tạo quan hệ :INTERACTED từ :LIKED và :REVIEWED với trọng số tổng hợp
    3. Tạo liên kết :RELATED_TO với trọng số động (co-occurrence + category)
    4. Chạy Weighted PageRank trên 2 đồ thị riêng biệt
    5. Normalize score & lưu timestamp
    6. In bảng so sánh kết quả
    """
    driver = GraphDatabase.driver(
        URI,
        auth=AUTH,
        notifications_min_severity=NotificationSeverity.WARNING,
    )

    with driver.session() as session:
        print("⏳ Đang xử lý dữ liệu Hybrid v2.0 (Interaction Weighting)...")

        # --- 0. Lưu timestamp phiên bản ---
        run_timestamp = datetime.now().isoformat()
        print(f"📅 Thời gian chạy: {run_timestamp}")

        # --- 1. Dọn dẹp quan hệ cũ ---
        print("🧹 Đang dọn dẹp quan hệ :INTERACTED và :RELATED_TO cũ...")
        try:
            session.run("MATCH ()-[r:INTERACTED]->() DELETE r")
            session.run("MATCH ()-[r:RELATED_TO]->() DELETE r")
        except Exception as e:
            print(f"⚠️ Lỗi dọn dẹp liên kết: {e}")

        # ==================================================================
        # BƯỚC 2: TẠO QUAN HỆ :INTERACTED VỚI TRỌNG SỐ TỔNG HỢP
        # ==================================================================
        print("📊 Đang tạo quan hệ :INTERACTED từ :LIKED và :REVIEWED...")
        
        # Bước 2a: Tạo :INTERACTED cho mỗi cặp User-Location
        # Công thức: weight = (hasLiked ? 1 : 0) + (stars từ review, 0-5)
        # Tổng điểm tối đa: 6 (1 from LIKED + 5 from 5-star review)
        try:
            result = session.run(
                """
                // Tìm tất cả các tương tác User-Location
                MATCH (u:User), (l:Location)
                WHERE (u)-[:LIKED]->(l) OR (u)-[:REVIEWED]->(l)
                
                // Kiểm tra LIKED (1 điểm nếu có)
                OPTIONAL MATCH (u)-[like:LIKED]->(l)
                WITH u, l, CASE WHEN like IS NOT NULL THEN $weight_liked ELSE 0 END AS liked_score
                
                // Lấy số sao từ REVIEWED (0-5 điểm)
                OPTIONAL MATCH (u)-[rev:REVIEWED]->(l)
                WITH u, l, liked_score, coalesce(rev.rating, 0) AS review_score
                
                // Tính trọng số tổng hợp
                WITH u, l, liked_score + review_score AS total_weight
                WHERE total_weight > 0
                
                // Tạo quan hệ :INTERACTED với weight
                MERGE (u)-[i:INTERACTED]->(l)
                SET i.weight = total_weight,
                    i.liked_score = CASE WHEN (u)-[:LIKED]->(l) THEN $weight_liked ELSE 0 END,
                    i.review_score = CASE WHEN (u)-[:REVIEWED]->(l) THEN total_weight - CASE WHEN (u)-[:LIKED]->(l) THEN $weight_liked ELSE 0 END ELSE 0 END,
                    i.created_at = datetime()
                
                RETURN count(i) AS total_interactions
                """,
                {"weight_liked": WEIGHT_LIKED}
            )
            record = result.single()
            if record:
                print(f"   ✅ Đã tạo {record['total_interactions']} quan hệ :INTERACTED")
        except Exception as e:
            print(f"❌ Lỗi tạo quan hệ :INTERACTED: {e}")

        # Bước 2b: Hiển thị thống kê phân bổ trọng số
        print("📈 Thống kê phân bổ trọng số :INTERACTED:")
        try:
            stats = session.run(
                """
                MATCH (u:User)-[i:INTERACTED]->(l:Location)
                RETURN 
                    round(min(i.weight), 2) AS min_weight,
                    round(max(i.weight), 2) AS max_weight,
                    round(avg(i.weight), 2) AS avg_weight,
                    count(i) AS total,
                    count(CASE WHEN i.weight = 6 THEN 1 END) AS perfect_score
                """
            )
            stat = stats.single()
            if stat:
                print(f"   Min: {stat['min_weight']}, Max: {stat['max_weight']}, Avg: {stat['avg_weight']}")
                print(f"   Tổng: {stat['total']} | Điểm tối đa (6/6): {stat['perfect_score']}")
        except Exception as e:
            print(f"⚠️ Không thể lấy thống kê: {e}")

        # ==================================================================
        # BƯỚC 3: TẠO QUAN HỆ :RELATED_TO (Location - Location)
        # ==================================================================
        # 3a: Từ co-occurrence (Collaborative Filtering)
        print("1️⃣a Đang tạo liên kết co-occurrence (trọng số động)...")
        try:
            session.run(
                """
                MATCH (u:User)-[:INTERACTED]->(l1:Location)
                MATCH (u)-[:INTERACTED]->(l2:Location)
                WHERE elementId(l1) < elementId(l2)
                WITH l1, l2, count(DISTINCT u) AS common_users
                MERGE (l1)-[r:RELATED_TO]-(l2)
                SET r.weight = coalesce(r.weight, 0) + (common_users * $weight)
                """,
                {"weight": WEIGHT_CO_OCCURRENCE},
            )
        except Exception as e:
            print(f"❌ Lỗi tạo liên kết co-occurrence: {e}")

        # 3b: Từ cùng category (Content-based)
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

        # ==================================================================
        # BƯỚC 4: WEIGHTED PAGERANK (User-Location với :INTERACTED)
        # ==================================================================
        print("2️⃣ Tính Weighted PageRank phổ biến (dựa trên :INTERACTED weight)...")
        try:
            session.run(
                "CALL gds.graph.drop($name, false) YIELD graphName", {"name": GRAPH_USER}
            )
        except Exception:
            pass  # Bỏ qua lỗi nếu graph không tồn tại

        try:
            # Project graph với relationshipProperties để lấy weight
            session.run(
                """
                CALL gds.graph.project(
                    $graphName,
                    ['User', 'Location'],
                    {
                        INTERACTED: {
                            properties: 'weight'
                        }
                    }
                )
                """,
                {"graphName": GRAPH_USER},
            )
        except Exception as e:
            print(f"❌ Lỗi project graph user: {e}")
            driver.close()
            return

        try:
            # Chạy Weighted PageRank với relationshipWeightProperty
            session.run(
                """
                CALL gds.pageRank.write($graphName, {
                    writeProperty: 'pagerankScore',
                    maxIterations: $max_iter,
                    dampingFactor: $damping,
                    relationshipWeightProperty: 'weight'
                })
                """,
                {
                    "graphName": GRAPH_USER,
                    "max_iter": MAX_ITERATIONS,
                    "damping": DAMPING_FACTOR,
                },
            )
            print("   ✅ Weighted PageRank hoàn tất (phản ánh cả lượt tương tác & đánh giá sao)")
        except Exception as e:
            print(f"❌ Lỗi chạy Weighted PageRank user: {e}")
            driver.close()
            return

        # ==================================================================
        # BƯỚC 5: PAGERANK KẾT NỐI (Location network)
        # ==================================================================
        print("3️⃣ Tính PageRank kết nối (dựa trên :RELATED_TO)...")
        try:
            session.run(
                "CALL gds.graph.drop($name, false) YIELD graphName", {"name": GRAPH_LOC}
            )
        except Exception:
            pass

        try:
            session.run(
                """
                CALL gds.graph.project(
                    $graphName,
                    'Location',
                    {
                        RELATED_TO: {
                            orientation: 'UNDIRECTED',
                            properties: 'weight'
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
                    dampingFactor: $damping,
                    relationshipWeightProperty: 'weight'
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

        # ==================================================================
        # BƯỚC 6: NORMALIZE SCORE & TÍNH AVG RATING
        # ==================================================================
        print("📊 Normalize score, tính rating trung bình, và lưu timestamp...")
        try:
            # Tính rating trung bình cho mỗi Location
            session.run(
                """
                MATCH (l:Location)
                OPTIONAL MATCH (u:User)-[r:REVIEWED]->(l)
                WITH l, avg(r.rating) AS avgRating, count(r) AS reviewCount
                SET l.avgRating = coalesce(avgRating, 0),
                    l.reviewCount = reviewCount
                """
            )
            
            # Normalize pagerankScore và pagerankConnect
            session.run(
                """
                MATCH (l:Location)
                WITH max(l.pagerankScore) AS max_pr, max(l.pagerankConnect) AS max_pc
                MATCH (l:Location)
                SET l.pagerankNorm = CASE WHEN max_pr > 0 THEN coalesce(l.pagerankScore, 0) / max_pr ELSE 0 END,
                    l.pagerankConnectNorm = CASE WHEN max_pc > 0 THEN coalesce(l.pagerankConnect, 0) / max_pc ELSE 0 END,
                    l.lastAlgoRun = $timestamp,
                    l.algoVersion = 'hybrid_interaction_v2'
                """,
                {"timestamp": run_timestamp},
            )
        except Exception as e:
            print(f"⚠️ Lỗi normalize & timestamp: {e}")

        # ==================================================================
        # BƯỚC 7: IN KẾT QUẢ SO SÁNH
        # ==================================================================
        print("\n✅ SO SÁNH KẾT QUẢ (Top 50) - Phản ánh cả Lượt tương tác & Chất lượng đánh giá:")
        print(
            f"{'Tên địa điểm':<36} | {'Phổ biến':^12} | {'Kết nối':^12} | {'Avg Rating':^10} | {'Tổng điểm':^12} |"
        )
        print("-" * 98)

        result = session.run(
            """
            MATCH (l:Location)
            RETURN l.name AS name, 
                   round(coalesce(l.pagerankScore, 0), 4) AS score1, 
                   round(coalesce(l.pagerankConnect, 0), 4) AS score2,
                   round(coalesce(l.avgRating, 0), 1) AS avgRating,
                   round(coalesce(l.pagerankScore, 0) + coalesce(l.pagerankConnect, 0), 4) AS total_score
            ORDER BY total_score DESC
            LIMIT 50
            """
        )

        for r in result:
            print(
                f"{r['name']:<36} | {r['score1']:^12.4f} | {r['score2']:^12.4f} | {r['avgRating']:^10.1f} | {r['total_score']:^12.4f} |"
            )
        print("-" * 98)

    driver.close()
    print(f"\n🚀 Hoàn tất! Dữ liệu đã cập nhật với Interaction Weighting lúc {run_timestamp}")


if __name__ == "__main__":
    run_hybrid_algo()
