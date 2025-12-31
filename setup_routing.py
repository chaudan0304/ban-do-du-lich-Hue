from neo4j import GraphDatabase
import os
from dotenv import load_dotenv

load_dotenv()
URI = os.getenv("NEO4J_URI")
USER = os.getenv("NEO4J_USER")
PASS = os.getenv("NEO4J_PASS")
AUTH = (USER, PASS)


def create_road_network():
    driver = GraphDatabase.driver(URI, auth=AUTH)
    with driver.session() as session:
        print("⏳ Đang tạo mạng lưới đường đi ảo (Distance Graph)...")

        # 1. Tạo quan hệ NEAR (Gần) dựa trên khoảng cách địa lý
        # Logic: Tìm các địa điểm cách nhau < 5km và nối chúng lại
        query_create_roads = """
            MATCH (l1:Location), (l2:Location)
            WHERE id(l1) < id(l2) -- Tránh trùng lặp (A-B và B-A)
            
            -- Tính khoảng cách (Haversine Formula)
            WITH l1, l2, point.distance(point({latitude: l1.lat, longitude: l1.lng}), 
                                        point({latitude: l2.lat, longitude: l2.lng})) AS dist
            
            -- Nếu khoảng cách < 5000m (5km) thì tạo quan hệ đường đi
            WHERE dist < 5000 
            
            MERGE (l1)-[r:NEAR]-(l2)
            SET r.distance = dist
            RETURN count(r) as connections
        """

        result = session.run(query_create_roads)
        count = result.single()["connections"]
        print(f"✅ Đã tạo {count} đường nối giữa các địa điểm!")

        # 2. Xóa đồ thị routing cũ (nếu có)
        try:
            session.run("CALL gds.graph.drop('roadGraph', false)")
        except:
            pass

        # 3. Tạo đồ thị GDS cho Routing (Cần trọng số là 'distance')
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
        print("🚀 Đã sẵn sàng cho thuật toán tìm đường (Dijkstra)!")

    driver.close()


if __name__ == "__main__":
    create_road_network()
