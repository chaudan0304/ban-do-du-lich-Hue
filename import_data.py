import pandas as pd
from db import run_query, close_driver
from werkzeug.security import generate_password_hash, check_password_hash
import logging
import unicodedata
import re

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def main():
    logging.info("⏳ Đang đọc file Excel...")
    try:
        # 1. Xóa dữ liệu cũ (Reset Database)
        logging.info("🧹 Đang dọn dẹp dữ liệu cũ...")
        run_query("MATCH (n) DETACH DELETE n")

        # 2. Nạp Locations
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
            # Xử lý hình ảnh (tránh lỗi NaN)
            raw_image = row["image"]
            if pd.isna(raw_image):
                corrected_image_path = ""
            else:
                corrected_image_path = str(raw_image).strip()

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
                    "image": corrected_image_path,  # Sử dụng đường dẫn đã chuẩn hóa
                },
            )

        # 3. Nạp Users từ sheet Excel
        logging.info("👤 Đang nạp người dùng từ file Excel...")

        try:
            df_users = pd.read_excel("data.xlsx", sheet_name="Users")
            df_likes = pd.read_excel("data.xlsx", sheet_name="Likes")

            default_pass = generate_password_hash("123")
            row_count_users = 0

            # Tạo users
            for i, row in df_users.iterrows():
                q_create_user = """
                MERGE (u:User {name: $name})
                SET u.password = $pass, u.role = 'user', u.created_at = datetime()
                """
                run_query(q_create_user, {"name": row["name"], "pass": default_pass})
                row_count_users += 1

            total_users = len(df_users)
            logging.info(f"   ✅ Đã tạo {total_users} người dùng")

            # Tạo likes
            like_count = 0
            for i, row in df_likes.iterrows():
                q_like = """
                MATCH (u:User {name: $user_name})
                MATCH (l:Location {name: $loc_name})
                MERGE (u)-[:LIKED]->(l)
                """
                run_query(
                    q_like,
                    {"user_name": row["user_name"], "loc_name": row["location_name"]},
                )
                like_count += 1

            logging.info(f"   ✅ Đã tạo {like_count} lượt thích")

        except Exception as e:
            logging.warning(
                f"⚠️ Không tìm thấy sheet Users/Likes, dùng dữ liệu mẫu: {e}"
            )
            # Fallback: dữ liệu mẫu
            sample_users = [
                ("user1", "Tung", ["Hoàng Thành Huế", "Lăng Tự Đức", "Chùa Thiên Mụ"]),
                ("user2", "Lan", ["Chợ Đông Ba", "Cầu Trường Tiền", "Chè Hẻm"]),
                (
                    "user3",
                    "Minh",
                    ["Vườn Quốc gia Bạch Mã", "Bãi biển Lăng Cô", "Đầm Lập An"],
                ),
                (
                    "user4",
                    "Hoa",
                    ["Nhà Lưu Niệm Nguyễn Tất Thành", "Bảo tàng Hồ Chí Minh"],
                ),
            ]

            row_count_users = 0
            default_pass = generate_password_hash("123")

            for u_id, u_name, likes in sample_users:
                q_create_user = """
                MERGE (u:User {name: $name})
                SET u.password = $pass, u.role = 'user', u.created_at = datetime()
                """
                run_query(q_create_user, {"name": u_name, "pass": default_pass})

                for loc_name in likes:
                    q_like = """
                    MATCH (u:User {name: $name})
                    MATCH (l:Location) WHERE l.name CONTAINS $loc_name
                    MERGE (u)-[:LIKED]->(l)
                    """
                    run_query(q_like, {"name": u_name, "loc_name": loc_name})
                    row_count_users += 1

            total_users = len(sample_users)
            like_count = row_count_users

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

        logging.info("-" * 30)
        logging.info("✅ NẠP DỮ LIỆU THÀNH CÔNG!")
        logging.info(f"- Tổng địa điểm: {len(df_loc)}")
        logging.info(f"- Tổng User: {total_users}")
        logging.info(f"- Tổng số lượt thích: {like_count}")
        logging.info(f"- Tài khoản Admin: admin / {admin_pass}")
        logging.info("-" * 30)

    except Exception as e:
        logging.error(f"❌ Lỗi: {e}")
    finally:
        close_driver()


if __name__ == "__main__":
    main()
