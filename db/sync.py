"""
=============================================================================
db/sync.py - Đồng bộ dữ liệu giữa Neo4j và Excel
db/sync.py - Data synchronization between Neo4j and Excel
=============================================================================
Mô tả / Description:
    - Xuất dữ liệu Locations từ Neo4j vào file Excel (data/data.xlsx).
      Export Locations data from Neo4j to Excel file (data/data.xlsx).
    - Giữ nguyên các sheet khác (Users, Likes) khi ghi đè.
      Preserves other sheets (Users, Likes) when overwriting.
    - Được gọi tự động khi admin thêm/sửa/xóa địa điểm.
      Auto-called when admin adds/edits/deletes a location.

Phụ thuộc / Dependencies:
    - pandas (đọc/ghi Excel / read/write Excel)
    - openpyxl (Excel engine)
    - db.connection (run_query)

Ghi chú / Notes:
    - File Excel là bản sao lưu (backup) của dữ liệu Neo4j.
      Excel file is a backup copy of Neo4j data.
    - Dữ liệu chính vẫn nằm trong Neo4j database.
      Primary data still resides in Neo4j database.
=============================================================================
"""

import logging
import pandas as pd
from .connection import run_query

logger = logging.getLogger(__name__)


# =============================================================
# ĐỒNG BỘ LOCATIONS VÀO EXCEL (Sync Locations to Excel)
# Quy trình / Process:
#   1. Lấy tất cả locations từ Neo4j
#      Fetch all locations from Neo4j
#   2. Đọc các sheet hiện có (Users, Likes) để giữ nguyên
#      Read existing sheets (Users, Likes) to preserve them
#   3. Tạo DataFrame từ locations
#      Create DataFrame from locations
#   4. Ghi vào Excel (ghi đè sheet Locations, giữ nguyên sheet khác)
#      Write to Excel (overwrite Locations sheet, keep other sheets)
# =============================================================
def sync_locations_to_excel(excel_path="data/data.xlsx"):
    """
    Đồng bộ dữ liệu Locations từ Neo4j vào file Excel.
    Sync Locations data from Neo4j to Excel file.

    Args:
        excel_path (str): Đường dẫn file Excel (mặc định: data/data.xlsx)
                          Excel file path (default: data/data.xlsx)

    Returns:
        bool: True nếu thành công, False nếu lỗi
              True if successful, False if error
    """
    try:
        # 1. Lấy tất cả locations từ Neo4j / Fetch all locations from Neo4j
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

        # 2. Đọc các sheet hiện có (Users, Likes) để giữ nguyên khi ghi đè
        #    Read existing sheets (Users, Likes) to preserve when overwriting
        existing_sheets = {}
        try:
            xl = pd.ExcelFile(excel_path)
            for sheet in xl.sheet_names:
                if sheet != "Locations":
                    existing_sheets[sheet] = pd.read_excel(excel_path, sheet_name=sheet)
        except FileNotFoundError:
            logger.info(f"File {excel_path} chưa tồn tại, sẽ tạo mới")

        # 3. Tạo DataFrame từ locations / Create DataFrame from locations
        df_locations = pd.DataFrame(locations)

        # 4. Ghi vào Excel với openpyxl engine
        #    Write to Excel with openpyxl engine
        with pd.ExcelWriter(excel_path, engine="openpyxl", mode="w") as writer:
            # Ghi sheet Locations trước / Write Locations sheet first
            df_locations.to_excel(writer, sheet_name="Locations", index=False)

            # Ghi lại các sheet khác (Users, Likes) / Re-write other sheets
            for sheet_name, df in existing_sheets.items():
                df.to_excel(writer, sheet_name=sheet_name, index=False)

        logger.info(f"Đã đồng bộ {len(locations)} địa điểm vào {excel_path}")
        return True

    except Exception as e:
        logger.error(f"Lỗi đồng bộ Excel: {e}")
        return False
