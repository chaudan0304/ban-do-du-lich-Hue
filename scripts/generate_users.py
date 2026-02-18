"""
=============================================================================
scripts/generate_users.py - Tạo dữ liệu người dùng mẫu (Generate Sample Users)
scripts/generate_users.py - Generate Sample User Data
=============================================================================
Mô tả / Description:
    Tạo 20 người dùng với tên Việt Nam và gán likes ngẫu nhiên.
    Generates 20 users with Vietnamese names and assigns random likes.

    Quy trình / Process:
    1. Đọc danh sách Location từ data.xlsx (Sheet 1)
       Read Location list from data.xlsx (Sheet 1)
    2. Tạo 20 user với tên Việt Nam + mật khẩu mặc định "123"
       Create 20 users with Vietnamese names + default password "123"
    3. Mỗi user thích ngẫu nhiên 3-8 địa điểm (không trùng lặp)
       Each user randomly likes 3-8 locations (no duplicates)
    4. Ghi lại vào data.xlsx với 3 sheets: Locations, Users, Likes
       Write back to data.xlsx with 3 sheets: Locations, Users, Likes

Phụ thuộc / Dependencies:
    - pandas (đọc/ghi Excel) / pandas (read/write Excel)
    - random (chọn ngẫu nhiên) / random (random selection)

Cách chạy / How to run:
    python scripts/generate_users.py

Lưu ý / Notes:
    - Chạy TRƯỚC import_data.py để tạo dữ liệu mẫu.
      Run BEFORE import_data.py to create sample data.
    - GHI ĐÈ dữ liệu cũ trong sheet Users và Likes.
      OVERWRITES old data in Users and Likes sheets.
=============================================================================
"""

import pandas as pd
import random
import os

# Đường dẫn đến file data / Path to data file
DATA_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "data", "data.xlsx")
)
print(f"📖 Đang đọc file từ: {DATA_PATH}")

# ═══════════════════════════════════════════════════════
# BƯỚC 1: ĐỌC DANH SÁCH ĐỊA ĐIỂM (Read Location List)
# ═══════════════════════════════════════════════════════
try:
    df_locations = pd.read_excel(DATA_PATH, sheet_name=0)
except FileNotFoundError:
    print(
        f"❌ Không tìm thấy file {DATA_PATH}. Vui lòng chạy import_data.py trước hoặc kiểm tra lại."
    )
    exit(1)

location_names = df_locations["name"].tolist()

print(f"📍 Tổng số địa điểm: {len(location_names)}")

# ═══════════════════════════════════════════════════════
# BƯỚC 2: TẠO DANH SÁCH USERS (Create User List)
# 20 tên Việt Nam — mật khẩu mặc định "123"
# 20 Vietnamese names — default password "123"
# ═══════════════════════════════════════════════════════
vietnamese_names = [
    "Minh Anh",
    "Hoàng Long",
    "Thùy Linh",
    "Đức Huy",
    "Ngọc Hà",
    "Quang Hải",
    "Phương Thảo",
    "Tuấn Kiệt",
    "Mai Lan",
    "Văn Nam",
    "Thanh Tâm",
    "Hồng Nhung",
    "Bảo Ngọc",
    "Tiến Đạt",
    "Yến Nhi",
    "Công Vinh",
    "Kim Chi",
    "Trung Hiếu",
    "Ánh Dương",
    "Hữu Phúc",
]

# Tạo danh sách Users / Create Users list
users_data = []
for i, name in enumerate(vietnamese_names, start=1):
    users_data.append(
        {
            "user_id": f"user{i:02d}",
            "name": name,
            "password": "123",  # Mật khẩu mặc định / Default password
            "role": "user",
        }
    )

df_users = pd.DataFrame(users_data)
print(f"👤 Đã tạo {len(df_users)} người dùng")

# ═══════════════════════════════════════════════════════
# BƯỚC 3: TẠO DANH SÁCH LIKES (Create Likes List)
# Mỗi user thích ngẫu nhiên 3-8 địa điểm (không trùng)
# Each user randomly likes 3-8 locations (no duplicates)
# ═══════════════════════════════════════════════════════
likes_data = []
for user in users_data:
    # Random số lượng địa điểm thích (3-8) / Random number of liked locations (3-8)
    num_likes = random.randint(3, 8)
    # Chọn ngẫu nhiên không trùng lặp / Random selection without duplicates
    liked_locations = random.sample(location_names, num_likes)

    for loc_name in liked_locations:
        likes_data.append(
            {
                "user_id": user["user_id"],
                "user_name": user["name"],
                "location_name": loc_name,
            }
        )

df_likes = pd.DataFrame(likes_data)
print(f"❤️ Đã tạo {len(df_likes)} lượt thích")

# ═══════════════════════════════════════════════════════
# BƯỚC 4: GHI VÀO FILE EXCEL (Write to Excel File)
# 3 sheets: Locations (giữ nguyên), Users (mới), Likes (mới)
# 3 sheets: Locations (keep), Users (new), Likes (new)
# ═══════════════════════════════════════════════════════
with pd.ExcelWriter(DATA_PATH, engine="openpyxl") as writer:
    # Sheet 1: Locations (giữ nguyên / keep original)
    df_locations.to_excel(writer, sheet_name="Locations", index=False)
    # Sheet 2: Users (mới / new)
    df_users.to_excel(writer, sheet_name="Users", index=False)
    # Sheet 3: Likes (mới / new)
    df_likes.to_excel(writer, sheet_name="Likes", index=False)

print("\n✅ Đã cập nhật file data.xlsx với 3 sheets:")
print("   - Locations: Danh sách địa điểm")
print("   - Users: Danh sách người dùng")
print("   - Likes: Lượt thích của người dùng")

# ─── THỐNG KÊ (Statistics) ───
print("\n📊 Thống kê lượt thích theo người dùng:")
likes_per_user = df_likes.groupby("user_name").size()
for name, count in likes_per_user.items():
    print(f"   - {name}: {count} địa điểm")
