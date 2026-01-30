"""
Script tạo dữ liệu người dùng mẫu và thêm vào data.xlsx
- 20 người dùng với tên Việt Nam
- Mỗi người thích ngẫu nhiên 3-8 địa điểm
"""
import pandas as pd
import random

# Đọc danh sách địa điểm hiện có
df_locations = pd.read_excel("data.xlsx", sheet_name=0)
location_names = df_locations["name"].tolist()

print(f"📍 Tổng số địa điểm: {len(location_names)}")

# Danh sách tên người dùng Việt Nam
vietnamese_names = [
    "Minh Anh", "Hoàng Long", "Thùy Linh", "Đức Huy", "Ngọc Hà",
    "Quang Hải", "Phương Thảo", "Tuấn Kiệt", "Mai Lan", "Văn Nam",
    "Thanh Tâm", "Hồng Nhung", "Bảo Ngọc", "Tiến Đạt", "Yến Nhi",
    "Công Vinh", "Kim Chi", "Trung Hiếu", "Ánh Dương", "Hữu Phúc"
]

# Tạo danh sách Users
users_data = []
for i, name in enumerate(vietnamese_names, start=1):
    users_data.append({
        "user_id": f"user{i:02d}",
        "name": name,
        "password": "123",  # Password mặc định
        "role": "user"
    })

df_users = pd.DataFrame(users_data)
print(f"👤 Đã tạo {len(df_users)} người dùng")

# Tạo danh sách Likes (mỗi user thích 3-8 địa điểm ngẫu nhiên)
likes_data = []
for user in users_data:
    # Random số lượng địa điểm thích (3-8)
    num_likes = random.randint(3, 8)
    # Chọn ngẫu nhiên các địa điểm (không trùng lặp)
    liked_locations = random.sample(location_names, num_likes)
    
    for loc_name in liked_locations:
        likes_data.append({
            "user_id": user["user_id"],
            "user_name": user["name"],
            "location_name": loc_name
        })

df_likes = pd.DataFrame(likes_data)
print(f"❤️ Đã tạo {len(df_likes)} lượt thích")

# Ghi vào file Excel với 3 sheets
with pd.ExcelWriter("data.xlsx", engine="openpyxl") as writer:
    # Sheet 1: Locations (giữ nguyên)
    df_locations.to_excel(writer, sheet_name="Locations", index=False)
    # Sheet 2: Users
    df_users.to_excel(writer, sheet_name="Users", index=False)
    # Sheet 3: Likes
    df_likes.to_excel(writer, sheet_name="Likes", index=False)

print("\n✅ Đã cập nhật file data.xlsx với 3 sheets:")
print("   - Locations: Danh sách địa điểm")
print("   - Users: Danh sách người dùng")
print("   - Likes: Lượt thích của người dùng")

# Thống kê
print("\n📊 Thống kê lượt thích theo người dùng:")
likes_per_user = df_likes.groupby("user_name").size()
for name, count in likes_per_user.items():
    print(f"   - {name}: {count} địa điểm")
