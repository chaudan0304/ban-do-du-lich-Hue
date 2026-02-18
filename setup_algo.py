"""
=============================================================================
setup_algo.py - Thuật toán Hybrid Recommendation v2.0 (AI Engine)
setup_algo.py - Hybrid Recommendation Algorithm v2.0 (AI Engine)
=============================================================================
Mô tả / Description:
    File quan trọng nhất chứa TOÀN BỘ logic thuật toán AI:
    Most important file containing ALL AI algorithm logic:

    1. TẠO QUAN HỆ :INTERACTED (Interaction Weighting)
       CREATE :INTERACTED RELATIONSHIP (Interaction Weighting)
       Công thức: weight = LIKED(0-1) + REVIEWED(0-5) → Max 6 điểm
       Formula: weight = LIKED(0-1) + REVIEWED(0-5) → Max 6 points

    2. TẠO QUAN HỆ :RELATED_TO (Location Linking)
       CREATE :RELATED_TO RELATIONSHIP (Location Linking)
       - Co-occurrence: Nếu nhiều user thích cả 2 nơi → liên kết mạnh
         Co-occurrence: If many users like both places → strong link
       - Category: Cùng danh mục → liên kết nhẹ
         Category: Same category → lighter link

    3. WEIGHTED PAGERANK (2 đồ thị riêng biệt / 2 separate graphs)
       a. User-Location (pagerankScore): Phổ biến + Chất lượng
          User-Location (pagerankScore): Popularity + Quality
       b. Location-Location (pagerankConnect): Kết nối mạng lưới
          Location-Location (pagerankConnect): Network connectivity

    4. USER SIMILARITY (Jaccard Index via GDS nodeSimilarity)
       Tạo :SIMILAR_TO giữa các user có sở thích giống nhau
       Creates :SIMILAR_TO between users with similar preferences

    5. LOCATION SIMILARITY (Jaccard Index)
       Tạo :LOC_SIMILAR giữa các địa điểm tương tự
       Creates :LOC_SIMILAR between similar locations

    6. NORMALIZE SCORE & AVG RATING
       Chuẩn hóa điểm về thang 0-1 để dùng trong recommendation query
       Normalizes scores to 0-1 scale for recommendation queries

Phụ thuộc / Dependencies:
    - neo4j (Neo4j Python Driver)
    - Neo4j GDS Plugin (Graph Data Science) — cần cài trong Neo4j
      Neo4j GDS Plugin (Graph Data Science) — must be installed in Neo4j
    - python-dotenv

Cấu hình / Configuration:
    - MAX_ITERATIONS: Số vòng lặp PageRank (12 — đủ cho đồ thị nhỏ)
      PageRank iterations (12 — sufficient for small graphs)
    - DAMPING_FACTOR: Hệ số tắt dần (0.88 — cân bằng global/local)
      Damping factor (0.88 — balances global/local)
    - WEIGHT_LIKED: Trọng số từ Like (1.0 điểm)
      Weight from Like (1.0 points)
    - WEIGHT_CO_OCCURRENCE: Trọng số co-occurrence (1.2/user chung)
      Co-occurrence weight (1.2/common user)
    - WEIGHT_CATEGORY: Trọng số cùng category (0.8)
      Same category weight (0.8)

Ghi chú / Notes:
    - Phải chạy lại khi có thay đổi lớn về dữ liệu (nhiều user mới, nhiều review mới).
      Must re-run when significant data changes (many new users, many new reviews).
    - Admin có thể trigger từ Dashboard (POST /api/admin/run-algo).
      Admin can trigger from Dashboard (POST /api/admin/run-algo).
    - Tương thích Neo4j 5.11.2 + GDS 2.24.0.
      Compatible with Neo4j 5.11.2 + GDS 2.24.0.
=============================================================================
"""

from neo4j import GraphDatabase, NotificationSeverity
import os
import sys
from dotenv import load_dotenv
from datetime import datetime

# Fix encoding cho Windows console (hỗ trợ emoji)
# Fix encoding for Windows console (emoji support)
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

load_dotenv()

# -----------------------------------------------------------
# CẤU HÌNH KẾT NỐI NEO4J (Neo4j Connection Config)
# -----------------------------------------------------------
URI = os.getenv("NEO4J_URI")
USER = os.getenv("NEO4J_USER")
PASS = os.getenv("NEO4J_PASS")
AUTH = (USER, PASS)

# -----------------------------------------------------------
# TÊN GRAPH CHO GDS (GDS Graph Names)
# Sử dụng tên duy nhất để tránh xung đột khi chạy song song
# Uses unique names to avoid conflicts when running in parallel
# -----------------------------------------------------------
GRAPH_USER = "hybrid_user_graph"
GRAPH_LOC = "hybrid_loc_graph"

# -----------------------------------------------------------
# TRỌNG SỐ CẤU HÌNH (Weight Configuration)
# -----------------------------------------------------------
WEIGHT_LIKED = 1.0  # Like đóng góp 1 điểm / Like contributes 1 point
WEIGHT_REVIEW_MAX = 5.0  # Review tối đa 5 sao / Review max 5 stars
# → Tổng tối đa: 6 điểm/user-location / Max total: 6 pts/user-location

WEIGHT_CO_OCCURRENCE = 1.2  # Trọng số co-occurrence: mỗi user chung +1.2
# Co-occurrence weight: each common user +1.2
WEIGHT_CATEGORY = 0.8  # Cùng category +0.8 / Same category +0.8

# -----------------------------------------------------------
# CẤU HÌNH PAGERANK (PageRank Configuration)
# -----------------------------------------------------------
MAX_ITERATIONS = (
    12  # Đủ cho đồ thị nhỏ (~100 nodes) / Sufficient for small graph (~100 nodes)
)
DAMPING_FACTOR = 0.88  # Cân bằng global vs local / Balances global vs local


def run_hybrid_algo():
    """
    Chạy thuật toán Hybrid Recommendation v2.0.
    Run the Hybrid Recommendation Algorithm v2.0.

    Quy trình 7 bước / 7-Step Process:
        1. Dọn dẹp quan hệ :INTERACTED và :RELATED_TO cũ
           Clean old :INTERACTED and :RELATED_TO relationships
        2. Tạo :INTERACTED từ :LIKED và :REVIEWED (trọng số tổng hợp)
           Create :INTERACTED from :LIKED and :REVIEWED (combined weights)
        3. Tạo :RELATED_TO (co-occurrence + category)
           Create :RELATED_TO (co-occurrence + category)
        4. Chạy Weighted PageRank (User-Location graph)
           Run Weighted PageRank (User-Location graph)
        5. Chạy PageRank Kết nối (Location-Location graph)
           Run Connectivity PageRank (Location-Location graph)
        5b. Tính User Similarity (Jaccard Index) → :SIMILAR_TO
            Calculate User Similarity (Jaccard Index) → :SIMILAR_TO
        5c. Tính Location Similarity (Jaccard Index) → :LOC_SIMILAR
            Calculate Location Similarity (Jaccard Index) → :LOC_SIMILAR
        6. Normalize score & tính rating trung bình
           Normalize scores & calculate average rating
        7. In bảng so sánh kết quả (Top 50)
           Print comparison table (Top 50)
    """
    driver = GraphDatabase.driver(
        URI,
        auth=AUTH,
        notifications_min_severity=NotificationSeverity.WARNING,
    )

    with driver.session() as session:
        print("⏳ Đang xử lý dữ liệu Hybrid v2.0 (Interaction Weighting)...")

        # ═══════════════════════════════════════════════════════
        # BƯỚC 0: Lưu timestamp phiên bản
        # STEP 0: Save version timestamp
        # ═══════════════════════════════════════════════════════
        run_timestamp = datetime.now().isoformat()
        print(f"📅 Thời gian chạy: {run_timestamp}")

        # ═══════════════════════════════════════════════════════
        # BƯỚC 1: DỌN DẸP QUAN HỆ CŨ (Clean Old Relationships)
        # Xóa :INTERACTED và :RELATED_TO cũ trước khi tính lại
        # Delete old :INTERACTED and :RELATED_TO before recalculating
        # ═══════════════════════════════════════════════════════
        print("🧹 Đang dọn dẹp quan hệ :INTERACTED và :RELATED_TO cũ...")
        try:
            session.run("MATCH ()-[r:INTERACTED]->() DELETE r")
            session.run("MATCH ()-[r:RELATED_TO]->() DELETE r")
        except Exception as e:
            print(f"⚠️ Lỗi dọn dẹp liên kết: {e}")

        # ═══════════════════════════════════════════════════════
        # BƯỚC 2: TẠO QUAN HỆ :INTERACTED (Interaction Weighting)
        # STEP 2: CREATE :INTERACTED RELATIONSHIP (Interaction Weighting)
        #
        # Công thức trọng số / Weight formula:
        #   weight = (hasLiked ? 1.0 : 0) + (review_stars ∈ [0-5])
        #   → Tối đa 6 điểm (1 from LIKED + 5 from 5-star review)
        #     Maximum 6 points (1 from LIKED + 5 from 5-star review)
        # ═══════════════════════════════════════════════════════
        print("📊 Đang tạo quan hệ :INTERACTED từ :LIKED và :REVIEWED...")

        try:
            result = session.run(
                """
                // Tìm tất cả các tương tác User-Location
                // Find all User-Location interactions
                MATCH (u:User), (l:Location)
                WHERE (u)-[:LIKED]->(l) OR (u)-[:REVIEWED]->(l)
                
                // Kiểm tra LIKED (1 điểm nếu có) / Check LIKED (1 point if exists)
                OPTIONAL MATCH (u)-[like:LIKED]->(l)
                WITH u, l, CASE WHEN like IS NOT NULL THEN $weight_liked ELSE 0 END AS liked_score
                
                // Lấy số sao từ REVIEWED (0-5 điểm) / Get stars from REVIEWED (0-5 points)
                OPTIONAL MATCH (u)-[rev:REVIEWED]->(l)
                WITH u, l, liked_score, coalesce(rev.rating, 0) AS review_score
                
                // Tính trọng số tổng hợp / Calculate combined weight
                WITH u, l, liked_score + review_score AS total_weight
                WHERE total_weight > 0
                
                // Tạo quan hệ :INTERACTED / Create :INTERACTED relationship
                MERGE (u)-[i:INTERACTED]->(l)
                SET i.weight = total_weight,
                    i.liked_score = CASE WHEN (u)-[:LIKED]->(l) THEN $weight_liked ELSE 0 END,
                    i.review_score = CASE WHEN (u)-[:REVIEWED]->(l) THEN total_weight - CASE WHEN (u)-[:LIKED]->(l) THEN $weight_liked ELSE 0 END ELSE 0 END,
                    i.created_at = datetime()
                
                RETURN count(i) AS total_interactions
                """,
                {"weight_liked": WEIGHT_LIKED},
            )
            record = result.single()
            if record:
                print(
                    f"   ✅ Đã tạo {record['total_interactions']} quan hệ :INTERACTED"
                )
        except Exception as e:
            print(f"❌ Lỗi tạo quan hệ :INTERACTED: {e}")

        # ─── Thống kê phân bổ trọng số / Weight distribution statistics ───
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
                print(
                    f"   Min: {stat['min_weight']}, Max: {stat['max_weight']}, Avg: {stat['avg_weight']}"
                )
                print(
                    f"   Tổng: {stat['total']} | Điểm tối đa (6/6): {stat['perfect_score']}"
                )
        except Exception as e:
            print(f"⚠️ Không thể lấy thống kê: {e}")

        # ═══════════════════════════════════════════════════════
        # BƯỚC 3: TẠO QUAN HỆ :RELATED_TO (Location - Location)
        # STEP 3: CREATE :RELATED_TO RELATIONSHIP (Location - Location)
        #
        # Hai nguồn trọng số / Two weight sources:
        #   a. Co-occurrence: Users chung (Collaborative Filtering)
        #      Co-occurrence: Common users (Collaborative Filtering)
        #   b. Cùng Category (Content-Based)
        #      Same Category (Content-Based)
        # ═══════════════════════════════════════════════════════

        # 3a: Co-occurrence — Collaborative Filtering
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

        # 3b: Cùng Category — Content-Based
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

        # ═══════════════════════════════════════════════════════
        # BƯỚC 4: WEIGHTED PAGERANK — User-Location Graph
        # STEP 4: WEIGHTED PAGERANK — User-Location Graph
        #
        # Input: Đồ thị User↔Location qua :INTERACTED (có weight)
        #        Graph User↔Location via :INTERACTED (weighted)
        # Output: l.pagerankScore — phản ánh phổ biến + chất lượng
        #         l.pagerankScore — reflects popularity + quality
        #
        # Sử dụng GDS: gds.pageRank.write()
        #   - relationshipWeightProperty: 'weight' (trọng số từ INTERACTED)
        # ═══════════════════════════════════════════════════════
        print("2️⃣ Tính Weighted PageRank phổ biến (dựa trên :INTERACTED weight)...")

        # Drop graph cũ (nếu có) / Drop old graph (if exists)
        try:
            session.run(
                "CALL gds.graph.drop($name, false) YIELD graphName",
                {"name": GRAPH_USER},
            )
        except Exception:
            pass  # Bỏ qua lỗi nếu graph không tồn tại / Ignore if graph doesn't exist

        try:
            # Project graph User-Location với weight từ :INTERACTED
            # Project User-Location graph with weight from :INTERACTED
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
            # Chạy Weighted PageRank / Run Weighted PageRank
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
            print(
                "   ✅ Weighted PageRank hoàn tất (phản ánh cả lượt tương tác & đánh giá sao)"
            )
        except Exception as e:
            print(f"❌ Lỗi chạy Weighted PageRank user: {e}")
            driver.close()
            return

        # ═══════════════════════════════════════════════════════
        # BƯỚC 5: PAGERANK KẾT NỐI — Location Network
        # STEP 5: CONNECTIVITY PAGERANK — Location Network
        #
        # Input: Đồ thị Location↔Location qua :RELATED_TO (undirected)
        #        Graph Location↔Location via :RELATED_TO (undirected)
        # Output: l.pagerankConnect — phản ánh "trung tâm" của mạng lưới
        #         l.pagerankConnect — reflects "centrality" in the network
        # ═══════════════════════════════════════════════════════
        print("3️⃣ Tính PageRank kết nối (dựa trên :RELATED_TO)...")

        try:
            session.run(
                "CALL gds.graph.drop($name, false) YIELD graphName", {"name": GRAPH_LOC}
            )
        except Exception:
            pass

        try:
            # Project graph Location-Location (UNDIRECTED)
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

        # ═══════════════════════════════════════════════════════
        # BƯỚC 5b: USER SIMILARITY (Jaccard Index)
        # STEP 5b: USER SIMILARITY (Jaccard Index)
        #
        # Sử dụng GDS nodeSimilarity để tính Jaccard giữa các User
        # Uses GDS nodeSimilarity to compute Jaccard between Users
        # Tạo :SIMILAR_TO {score} — dùng cho Collaborative Filtering
        # Creates :SIMILAR_TO {score} — used for Collaborative Filtering
        #
        # Config:
        #   - topK: 10 (giữ top 10 user tương đồng nhất)
        #     topK: 10 (keep top 10 most similar users)
        #   - similarityCutoff: 0.1 (bỏ qua ≤10% giống)
        #     similarityCutoff: 0.1 (ignore ≤10% similar)
        # ═══════════════════════════════════════════════════════
        print("4️⃣ Tính User Similarity (Jaccard Index)...")

        # Xóa relationship SIMILAR_TO cũ / Delete old SIMILAR_TO
        try:
            session.run("MATCH ()-[r:SIMILAR_TO]->() DELETE r")
        except Exception:
            pass

        GRAPH_SIMILARITY = "user_similarity_graph"
        try:
            session.run(
                "CALL gds.graph.drop($name, false) YIELD graphName",
                {"name": GRAPH_SIMILARITY},
            )
        except Exception:
            pass

        try:
            # Project graph User-Location (NATURAL direction)
            session.run(
                """
                CALL gds.graph.project(
                    $graphName,
                    ['User', 'Location'],
                    {
                        INTERACTED: {
                            orientation: 'NATURAL'
                        }
                    }
                )
                """,
                {"graphName": GRAPH_SIMILARITY},
            )

            # Chạy Node Similarity (Jaccard) và ghi kết quả
            # Run Node Similarity (Jaccard) and write results
            result = session.run(
                """
                CALL gds.nodeSimilarity.write($graphName, {
                    writeRelationshipType: 'SIMILAR_TO',
                    writeProperty: 'score',
                    topK: 10,
                    similarityCutoff: 0.1
                })
                YIELD nodesCompared, relationshipsWritten, similarityDistribution
                RETURN nodesCompared, relationshipsWritten, 
                       similarityDistribution.mean AS avgSimilarity,
                       similarityDistribution.max AS maxSimilarity
                """,
                {"graphName": GRAPH_SIMILARITY},
            )

            record = result.single()
            if record:
                print(f"   ✅ So sánh {record['nodesCompared']} users")
                print(f"   ✅ Tạo {record['relationshipsWritten']} quan hệ SIMILAR_TO")
                print(
                    f"   📊 Similarity TB: {record['avgSimilarity']:.4f}, Max: {record['maxSimilarity']:.4f}"
                )

            # Drop graph sau khi sử dụng / Drop graph after use
            session.run(
                "CALL gds.graph.drop($name, false) YIELD graphName",
                {"name": GRAPH_SIMILARITY},
            )

        except Exception as e:
            print(f"⚠️ Lỗi tính User Similarity: {e}")
            print("   (Có thể do chưa đủ dữ liệu hoặc GDS chưa cài)")

        # ═══════════════════════════════════════════════════════
        # BƯỚC 5c: LOCATION SIMILARITY (Jaccard Index)
        # STEP 5c: LOCATION SIMILARITY (Jaccard Index)
        #
        # Tạo :LOC_SIMILAR giữa các địa điểm có user chung
        # Creates :LOC_SIMILAR between locations with common users
        # Dùng cho: /api/similar/<location_name>
        # Used for: /api/similar/<location_name>
        #
        # Config:
        #   - topK: 5 (mỗi location giữ 5 nơi tương tự nhất)
        #     topK: 5 (each location keeps 5 most similar places)
        #   - similarityCutoff: 0.15 (ngưỡng cao hơn User)
        #     similarityCutoff: 0.15 (higher threshold than User)
        #   - orientation: REVERSE (Location←User thay vì User→Location)
        #     orientation: REVERSE (Location←User instead of User→Location)
        # ═══════════════════════════════════════════════════════
        print("5️⃣ Tính Location Similarity (Jaccard Index)...")

        # Xóa relationship LOC_SIMILAR cũ / Delete old LOC_SIMILAR
        try:
            session.run("MATCH ()-[r:LOC_SIMILAR]->() DELETE r")
        except Exception:
            pass

        GRAPH_LOC_SIM = "loc_similarity_graph"
        try:
            session.run(
                "CALL gds.graph.drop($name, false) YIELD graphName",
                {"name": GRAPH_LOC_SIM},
            )
        except Exception:
            pass

        try:
            # Project graph Location-User (REVERSE direction)
            # Đảo chiều để tính similarity từ góc nhìn Location
            # Reverse direction to compute similarity from Location perspective
            session.run(
                """
                CALL gds.graph.project(
                    $graphName,
                    ['Location', 'User'],
                    {
                        INTERACTED: {
                            orientation: 'REVERSE'
                        }
                    }
                )
                """,
                {"graphName": GRAPH_LOC_SIM},
            )

            # Chạy Node Similarity cho Locations
            # Run Node Similarity for Locations
            result = session.run(
                """
                CALL gds.nodeSimilarity.write($graphName, {
                    writeRelationshipType: 'LOC_SIMILAR',
                    writeProperty: 'score',
                    topK: 5,
                    similarityCutoff: 0.15
                })
                YIELD nodesCompared, relationshipsWritten, similarityDistribution
                RETURN nodesCompared, relationshipsWritten,
                       similarityDistribution.mean AS avgSimilarity
                """,
                {"graphName": GRAPH_LOC_SIM},
            )

            record = result.single()
            if record:
                print(f"   ✅ So sánh {record['nodesCompared']} địa điểm")
                print(f"   ✅ Tạo {record['relationshipsWritten']} quan hệ LOC_SIMILAR")
                print(f"   📊 Similarity TB: {record['avgSimilarity']:.4f}")

            # Drop graph sau khi sử dụng / Drop graph after use
            session.run(
                "CALL gds.graph.drop($name, false) YIELD graphName",
                {"name": GRAPH_LOC_SIM},
            )

        except Exception as e:
            print(f"⚠️ Lỗi tính Location Similarity: {e}")

        # ═══════════════════════════════════════════════════════
        # BƯỚC 6: NORMALIZE SCORE & TÍNH AVG RATING
        # STEP 6: NORMALIZE SCORES & CALCULATE AVG RATING
        #
        # Chuẩn hóa điểm về thang 0-1:
        # Normalize scores to 0-1 scale:
        #   pagerankNorm = pagerankScore / max(pagerankScore)
        #   pagerankConnectNorm = pagerankConnect / max(pagerankConnect)
        #
        # Tính rating trung bình cho mỗi Location:
        # Calculate average rating for each Location:
        #   avgRating = AVG(REVIEWED.rating)
        # ═══════════════════════════════════════════════════════
        print("📊 Normalize score, tính rating trung bình, và lưu timestamp...")
        try:
            # Tính rating trung bình / Calculate average rating
            session.run(
                """
                MATCH (l:Location)
                OPTIONAL MATCH (u:User)-[r:REVIEWED]->(l)
                WITH l, avg(r.rating) AS avgRating, count(r) AS reviewCount
                SET l.avgRating = coalesce(avgRating, 0),
                    l.reviewCount = reviewCount
                """
            )

            # Normalize PageRank scores (0-1) + lưu metadata
            # Normalize PageRank scores (0-1) + save metadata
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

        # ═══════════════════════════════════════════════════════
        # BƯỚC 7: IN BẢNG SO SÁNH KẾT QUẢ (Top 50)
        # STEP 7: PRINT RESULTS COMPARISON TABLE (Top 50)
        #
        # Công thức tổng điểm hiển thị / Total display score formula:
        #   total = (pagerankNorm * 0.6 + pagerankConnectNorm * 0.3 + avgRating/5 * 0.1) * 10
        # ═══════════════════════════════════════════════════════
        print(
            "\n✅ SO SÁNH KẾT QUẢ (Top 50) - Phản ánh cả Lượt tương tác & Chất lượng đánh giá:"
        )
        print(
            f"{'Tên địa điểm':<36} | {'Phổ biến':^12} | {'Kết nối':^12} | {'Avg Rating':^10} | {'Tổng điểm':^12} |"
        )
        print("-" * 98)

        result = session.run(
            """
            MATCH (l:Location)
            RETURN l.name AS name, 
                   round(coalesce(l.pagerankNorm, 0), 4) AS score1, 
                   round(coalesce(l.pagerankConnectNorm, 0), 4) AS score2,
                   round(coalesce(l.avgRating, 0), 1) AS avgRating,
                   round((coalesce(l.pagerankNorm, 0) * 0.6 + 
                          coalesce(l.pagerankConnectNorm, 0) * 0.3 + 
                          (coalesce(l.avgRating, 0) / 5.0) * 0.1) * 10.0, 4) AS total_score
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
    print(
        f"\n🚀 Hoàn tất! Dữ liệu đã cập nhật với Interaction Weighting lúc {run_timestamp}"
    )


# ═══════════════════════════════════════════════════════
# ENTRY POINT — Chạy trực tiếp bằng: python setup_algo.py
# ═══════════════════════════════════════════════════════
if __name__ == "__main__":
    run_hybrid_algo()
