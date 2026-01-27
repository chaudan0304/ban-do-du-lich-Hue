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
        df_loc = pd.read_excel("data.xlsx", sheet_name="Locations")
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

        # 3. Nạp Users (Mã hóa mật khẩu)
        df_user = pd.read_excel("data.xlsx", sheet_name="Users")
        logging.info(f"👤 Đang nạp {len(df_user)} User (đang mã hóa mật khẩu)...")

        row_count_users = 0
        for i, row in df_user.iterrows():
            # Mã hóa mật khẩu
            raw_pass = str(row["pass_word"])
            hash_pass = generate_password_hash(raw_pass)

            q_user = """
            MERGE (u:User {name: $name})
            
            ON CREATE SET 
                u.password = $pass, 
                u.role = 'user',
                u.created_at = datetime()
            ON MATCH SET 
                u.password = $pass

            WITH u
            MATCH (l:Location {id: $lid})
            MERGE (u)-[:LIKED]->(l)
            """

            run_query(
                q_user,
                {
                    "name": row["user_name"],
                    "pass": hash_pass,
                    "lid": row["liked_id"],
                },
            )
            row_count_users += 1

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

        # Tính toán số liệu
        total_users = df_user["user_name"].nunique()

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
