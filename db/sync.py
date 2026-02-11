"""
db/sync.py - Đồng bộ dữ liệu giữa Neo4j và Excel
"""

import logging
import pandas as pd
from .connection import run_query

logger = logging.getLogger(__name__)


def sync_locations_to_excel(excel_path="data/data.xlsx"):
    """
    Đồng bộ dữ liệu Locations từ Neo4j vào file Excel.
    Giữ nguyên các sheet Users và Likes.
    """
    try:
        # 1. Lấy tất cả locations từ Neo4j
        query = """
        MATCH (l:Location)
        OPTIONAL MATCH (l)-[:LOCATED_IN]->(c:City)
        OPTIONAL MATCH (l)-[:HAS_CATEGORY]->(cat:Category)
        RETURN l.id AS id, l.name AS name, l.desc AS description,
               c.name AS city, cat.name AS category,
               l.lat AS lat, l.lng AS lng, l.image AS image
        ORDER BY l.name
        """
        locations = run_query(query)

        if not locations:
            logger.warning("Không có dữ liệu locations để đồng bộ")
            return False

        # 2. Đọc các sheet hiện có (Users, Likes)
        existing_sheets = {}
        try:
            xl = pd.ExcelFile(excel_path)
            for sheet in xl.sheet_names:
                if sheet != "Locations":
                    existing_sheets[sheet] = pd.read_excel(excel_path, sheet_name=sheet)
        except FileNotFoundError:
            logger.info(f"File {excel_path} chưa tồn tại, sẽ tạo mới")

        # 3. Tạo DataFrame từ locations
        df_locations = pd.DataFrame(locations)

        # 4. Ghi vào Excel với openpyxl engine
        with pd.ExcelWriter(excel_path, engine="openpyxl", mode="w") as writer:
            # Ghi sheet Locations trước
            df_locations.to_excel(writer, sheet_name="Locations", index=False)

            # Ghi lại các sheet khác (Users, Likes)
            for sheet_name, df in existing_sheets.items():
                df.to_excel(writer, sheet_name=sheet_name, index=False)

        logger.info(f"Đã đồng bộ {len(locations)} địa điểm vào {excel_path}")
        return True

    except Exception as e:
        logger.error(f"Lỗi đồng bộ Excel: {e}")
        return False
