import pandas as pd
from db import run_query, close_driver
from werkzeug.security import generate_password_hash, check_password_hash
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def main():
    logging.info("⏳ Đang đọc file Excel...")
    try:
        # 1. Xóa dữ liệu cũ (Reset Database)
        logging.info("🧹 Đang dọn dẹp dữ liệu cũ...")
        run_query("MATCH (n) DETACH DELETE n")

        # 2. Nạp Locations
        # Đọc sheet đầu tiên (bất kể tên gì)
        df_loc = pd.read_excel("data.xlsx", sheet_name=0)
        logging.info(f"📥 Đang nạp {len(df_loc)} địa điểm...")

        for i, row in df_loc.iterrows():
            q_loc = """
            MERGE (c:City {name: $city})
            MERGE (cat:Category {name: $cat})
            MERGE (l:Location {id: $id})
            SET l.name = $name, l.desc = $desc, 
                l.lat = $lat, l.lng = $lng, 
                l.image = $image   
            MERGE (l)-[:LOCATED_IN]->(c)
            MERGE (l)-[:HAS_CATEGORY]->(cat)
            """
            run_query(
                q_loc,
                {
                    "id": row["id"],
                    "name": row["name"],
                    "desc": row["description"],
                    "city": row["city"],
                    "cat": row["category"],
                    "lat": row["lat"],
                    "lng": row["lng"],
                    "image": row["image"],
                },
            )

        # 3. Nạp Users (Tạo giả lập vì sheet Users đã mất)
        logging.info("👤 Đang tạo dữ liệu người dùng mẫu...")
        
        # Danh sách người dùng mẫu và sở thích giả định
        sample_users = [
            ("user1", "Tung", ["Đại Nội", "Lăng Tự Đức", "Chùa Thiên Mụ"]), 
            ("user2", "Lan", ["Chợ Đông Ba", "Cầu Trường Tiền", "Chè Hẻm"]),
            ("user3", "Minh", ["Vườn Quốc gia Bạch Mã", "Bãi biển Lăng Cô", "Đầm Lập An"]),
            ("user4", "Hoa", ["Nhà Lưu Niệm Nguyễn Tất Thành", "Bảo tàng Hồ Chí Minh", "Trường Quốc Học"])
        ]

        row_count_users = 0
        default_pass = generate_password_hash("123")

        for u_id, u_name, likes in sample_users:
            # Tạo user
            q_create_user = """
            MERGE (u:User {name: $name})
            SET u.password = $pass, u.role = 'user', u.created_at = datetime()
            """
            run_query(q_create_user, {"name": u_name, "pass": default_pass})
            
            # Tạo like
            for loc_name in likes:
                q_like = """
                MATCH (u:User {name: $name})
                MATCH (l:Location) WHERE l.name CONTAINS $loc_name
                MERGE (u)-[:LIKED]->(l)
                """
                run_query(q_like, {"name": u_name, "loc_name": loc_name})
                row_count_users += 1
                
        # Update tổng user
        total_users = len(sample_users)

        # 4. Tự động tạo tài khoản Admin (Để bạn đăng nhập)
        logging.info("🔑 Đang tạo tài khoản Admin (Mã hóa)...")

        admin_pass = "admin"
        admin_hass = generate_password_hash(admin_pass)
        run_query(
            """
            MERGE (a:User {name: 'admin'})
            SET a.password = $pass, 
                a.role = 'admin', 
                a.created_at = datetime()
        """,
            {"pass": admin_hass},
        )

        # Tính toán số liệu (đã tính ở trên)

        logging.info("-" * 30)
        logging.info("✅ NẠP DỮ LIỆU THÀNH CÔNG!")
        logging.info(f"- Tổng địa điểm: {len(df_loc)}")
        logging.info(f"- Tổng User thực tế: {total_users}")
        logging.info(f"- Tổng số lượt thích : {row_count_users}")
        logging.info("- Tài khoản Admin: admin / {admin_pass}")
        logging.info("-" * 30)

    except Exception as e:
        logging.error(f"❌ Lỗi: {e}")
    finally:
        close_driver()


if __name__ == "__main__":
    main()
