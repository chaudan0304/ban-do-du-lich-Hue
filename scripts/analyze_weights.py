import os
import sys
from neo4j import GraphDatabase
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
load_dotenv()

URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
USER = os.getenv("NEO4J_USER", "neo4j")
PASS = os.getenv("NEO4J_PASS", "your_password")


def analyze():
    print("Connecting to Neo4j...", flush=True)
    try:
        driver = GraphDatabase.driver(URI, auth=(USER, PASS))
        with driver.session() as session:
            print("--- PHAN TICH DU LIEU ---", flush=True)

            # 1. Thống kê Rating
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


if __name__ == "__main__":
    analyze()
