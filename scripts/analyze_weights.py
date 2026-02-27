"""
=============================================================================
scripts/analyze_weights.py - Phân tích chất lượng dữ liệu Rating (Rating Data Analysis)
scripts/analyze_weights.py - Rating Data Quality Analysis
=============================================================================
Mô tả / Description:
    Phân tích chất lượng dữ liệu đánh giá (Rating) trong Neo4j.
    Analyzes the quality of rating data in Neo4j.

    Kiểm tra / Checks:
    - Tổng số địa điểm / Total locations
    - Số địa điểm có avgRating > 0 (đã được đánh giá)
      Number of locations with avgRating > 0 (have been rated)
    - Tỷ lệ phần trăm đã đánh giá / Percentage rated
    - Điểm Rating trung bình toàn hệ thống / System-wide average rating
    - Cảnh báo nếu dữ liệu quá mỏng (< 10% đã đánh giá)
      Warning if data too sparse (< 10% rated)

Phụ thuộc / Dependencies:
    - neo4j (kết nối trực tiếp, không qua db module)
      neo4j (direct connection, not through db module)
    - python-dotenv

Cách chạy / How to run:
    python scripts/analyze_weights.py
=============================================================================
"""

import os
import sys
from neo4j import GraphDatabase
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
load_dotenv()

# Cấu hình kết nối / Connection config
URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
USER = os.getenv("NEO4J_USER", "neo4j")
PASS = os.getenv("NEO4J_PASS", "your_password")


def analyze():
    """
    Phân tích dữ liệu Rating trong Neo4j.
    Analyze Rating data in Neo4j.

    Kết quả / Output:
        - Thống kê tổng quan / Overview statistics
        - Cảnh báo nếu dữ liệu không đủ / Warning if data insufficient
    """
    print("Connecting to Neo4j...", flush=True)
    try:
        driver = GraphDatabase.driver(URI, auth=(USER, PASS))
        with driver.session() as session:
            print("--- PHAN TICH DU LIEU ---", flush=True)

            # ─── Thống kê Rating / Rating Statistics ───
            # Đếm: tổng location, location có rating > 0, rating trung bình
            # Count: total locations, locations with rating > 0, average rating
            result = session.run(
                """
                MATCH (l:Location)
                RETURN count(l) as total,
                       sum(CASE WHEN l.avgRating IS NOT NULL AND l.avgRating > 0 THEN 1 ELSE 0 END) as rated_count,
                       avg(l.avgRating) as avg_global
            """
            ).single()

            if result:
                total = result["total"]
                rated = result["rated_count"]
                avg_global = result["avg_global"]
                if total > 0:
                    pct_rated = rated / total * 100
                else:
                    pct_rated = 0

                print(f"Tong so dia diem: {total}", flush=True)
                print(
                    f"So dia diem co Rating > 0: {rated} ({pct_rated:.1f}%)", flush=True
                )
                print(f"Diem Rating trung binh toan bo: {avg_global:.2f}", flush=True)

                # ─── Cảnh báo / Warning ───
                # Nếu < 10% location có rating → trọng số Rating trong thuật toán
                # sẽ không đáng tin cậy
                # If < 10% locations rated → Rating weight in algorithm
                # won't be reliable
                if pct_rated < 10:
                    print(
                        "\n[CANH BAO] Du lieu Rating qua it! Viec dat trong so 50% cho Rating se lam 90% dia diem bi diem thap.",
                        flush=True,
                    )
                else:
                    print("\n[OK] Du lieu Rating kha tot.", flush=True)

        driver.close()
    except Exception as e:
        print(f"Loi: {e}", flush=True)


# ═══════════════════════════════════════════════════════
# ENTRY POINT / Chạy: python scripts/analyze_weights.py
# ═══════════════════════════════════════════════════════
if __name__ == "__main__":
    analyze()
