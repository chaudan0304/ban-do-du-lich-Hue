from neo4j import GraphDatabase
import os
from dotenv import load_dotenv

# Load môi trường
load_dotenv()
URI = os.getenv("NEO4J_URI")
USER = os.getenv("NEO4J_USER")
PASS = os.getenv("NEO4J_PASS")
AUTH = (USER, PASS)


def force_update():
    driver = GraphDatabase.driver(URI, auth=AUTH)
    with driver.session() as session:
        print("🛠️ Bắt đầu cập nhật nóng dữ liệu...")

        # 1. Xóa toàn bộ mối quan hệ LIKED cũ và User cũ
        # (Giữ nguyên các địa điểm Location đã nạp)
        session.run("MATCH (:User)-[r:LIKED]->(:Location) DELETE r")
        session.run("MATCH (u:User) DELETE u")
        print("✅ Đã xóa sạch dữ liệu User cũ.")

        # 2. Tạo User mới và liên kết trực tiếp bằng Cypher
        # Chúng ta dùng tên địa điểm để nối (MATCH)
        query = """
        // --- TẠO NGƯỜI DÙNG MỚI ---
        MERGE (u1:User {name: 'SinhVienHue'})
        MERGE (u2:User {name: 'KhachTayBalo'})
        MERGE (u3:User {name: 'HoiYeuThienNhien'})
        MERGE (u4:User {name: 'YeuTamLinh'})
        MERGE (u5:User {name: 'HuongDanVien'}) 

        // --- TẠO LIÊN KẾT (Ai thích gì) ---
        
        // 1. Hoàng Thành Huế (HOT - Được 3 người thích)
        WITH u1, u2, u3, u4, u5
        MATCH (loc:Location {name: 'Hoàng Thành Huế'})
        MERGE (u1)-[:LIKED]->(loc)
        MERGE (u2)-[:LIKED]->(loc)
        MERGE (u5)-[:LIKED]->(loc)

        // 2. Cầu Trường Tiền (HOT nhì - Được 3 người thích)
        WITH u1, u2, u3, u4, u5
        MATCH (loc:Location {name: 'Cầu Trường Tiền'}) # Lưu ý: Cần đúng tên trong DB
        MERGE (u1)-[:LIKED]->(loc)
        MERGE (u3)-[:LIKED]->(loc)
        MERGE (u5)-[:LIKED]->(loc)

        // 3. Chùa Thiên Mụ (Được 2 người thích)
        WITH u1, u2, u3, u4, u5
        MATCH (loc:Location {name: 'Chùa Thiên Mụ'})
        MERGE (u4)-[:LIKED]->(loc)
        MERGE (u5)-[:LIKED]->(loc)

        // 4. Lăng Khải Định (Được 2 người thích)
        WITH u1, u2, u3, u4, u5
        MATCH (loc:Location {name: 'Lăng Khải Định'})
        MERGE (u2)-[:LIKED]->(loc)
        MERGE (u4)-[:LIKED]->(loc)

        // 5. Bún Bò Mệ Kéo (Được 2 người thích)
        WITH u1, u2, u3, u4, u5
        MATCH (loc:Location {name: 'Bún Bò Mệ Kéo'})
        MERGE (u1)-[:LIKED]->(loc)
        MERGE (u5)-[:LIKED]->(loc)
        """

        # Chạy lệnh
        session.run(query)
        print("✅ Đã nạp xong liên kết chéo (Cross-linked data).")

        # Kiểm tra nhanh
        count = session.run("MATCH ()-[r:LIKED]->() RETURN count(r) as c").single()["c"]
        print(f"📊 Tổng số lượt 'LIKED' hiện tại trong DB: {count}")
        print("(Nếu số này > 0 thì thành công!)")

    driver.close()


if __name__ == "__main__":
    force_update()
    print("🚀 Cập nhật nóng dữ liệu hoàn tất.")
