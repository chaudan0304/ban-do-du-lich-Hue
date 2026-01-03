from neo4j import GraphDatabase
import os
from dotenv import load_dotenv

load_dotenv()

URI = os.getenv("NEO4J_URI")
USER = os.getenv("NEO4J_USER")
PASS = os.getenv("NEO4J_PASS")

if not all([URI, USER, PASS]):
    raise ValueError(
        "❌ Thiếu biến môi trường NEO4J_URI, NEO4J_USER hoặc NEO4J_PASS trong file .env"
    )

AUTH = (USER, PASS)


# File: setup_routing.py

# ... (các phần import giữ nguyên)


def create_road_network():
    driver = GraphDatabase.driver(URI, auth=AUTH)

    try:
        with driver.session() as session:
            print("⏳ Đang tạo mạng lưới đường đi ảo (Distance Graph)...")

            # Xóa các quan hệ NEAR cũ để tạo lại
            session.run("MATCH ()-[r:NEAR]-() DELETE r")
            # Tạo các quan hệ NEAR dựa trên khoảng cách địa lý
            query_create_roads = """
            MATCH (l1:Location), (l2:Location)
            WHERE elementId(l1) < elementId(l2) 
            
            WITH l1, l2,
                 point.distance(
                     point({latitude: l1.lat, longitude: l1.lng}),
                     point({latitude: l2.lat, longitude: l2.lng})
                 ) AS dist
            WHERE dist < 100000 

            MERGE (l1)-[r:NEAR {distance: dist}]-(l2)
            RETURN count(r) AS connections
            """
            # -----------------------

            result = session.run(query_create_roads)
            count = result.single()["connections"]
            print(f"✅ Đã tạo {count} đường nối (NEAR)!")

            # Xóa graph GDS cũ
            try:
                session.run("CALL gds.graph.drop('roadGraph', false)")
                print("🗑️  Đã xóa graph ảo cũ.")
            except Exception:
                pass

            # Tạo graph mới
            print("🗺️  Đang nạp bản đồ vào bộ nhớ GDS...")
            session.run(
                """
                CALL gds.graph.project(
                    'roadGraph',
                    'Location',
                    {
                        NEAR: {
                            type: 'NEAR',
                            orientation: 'UNDIRECTED',
                            properties: 'distance'
                        }
                    }
                )
            """
            )
            print("🚀 Đã sẵn sàng cho thuật toán tìm đường!")

    except Exception as e:
        print(f"❌ Lỗi: {e}")
    finally:
        driver.close()


if __name__ == "__main__":
    create_road_network()
