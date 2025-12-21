from neo4j import GraphDatabase

import os
from dotenv import load_dotenv  
# -------------------------------------
# Đọc file .env (phải gọi trước khi dùng os.getenv)
load_dotenv()   
# Lấy giá trị từ .env (nếu không có sẽ là None → báo lỗi rõ ràng)
URI = os.getenv("NEO4J_URI")
USER = os.getenv("NEO4J_USER")
PASS = os.getenv("NEO4J_PASS")
AUTH = (USER, PASS)
def run_algo():
    driver = GraphDatabase.driver(URI, auth=AUTH)
    with driver.session() as session:
        print("⏳ Đang khởi động GDS...")
        
        # 1. Xóa đồ thị ảo cũ (Dùng tham số FALSE để không báo lỗi nếu chưa có)
        try:
            session.run("CALL gds.graph.drop('myGraph', false)") 
            print("🗑️  Đã dọn dẹp đồ thị ảo cũ.")
        except Exception as e:
            print(f"ℹ️  Thông báo: {e}")

        # 2. TẠO ĐỒ THỊ ẢO
        print("1️⃣  Đang load dữ liệu vào RAM...")
        session.run("""
            CALL gds.graph.project(
                'myGraph',
                ['User', 'Location'],
                'LIKED'
            )
        """)

        # 3. CHẠY THUẬT TOÁN PAGERANK
        print("2️⃣  Đang chạy thuật toán PageRank...")
        session.run("""
            CALL gds.pageRank.write('myGraph', {
                writeProperty: 'pagerankScore',
                maxIterations: 20,
                dampingFactor: 0.85
            })
        """)
        
        # 4. Kiểm tra kết quả
        print("\n✅ KẾT QUẢ XẾP HẠNG (TOP 5 PAGERANK):")
        result = session.run("""
            MATCH (l:Location)
            RETURN l.name, l.pagerankScore
            ORDER BY l.pagerankScore DESC
            LIMIT 5
        """)
        
        for record in result:
            val = record['l.pagerankScore']
            score = f"{val:.4f}" if val else "0.0000"
            print(f"- {record['l.name']}: {score}")

    driver.close()

if __name__ == '__main__':
    run_algo()