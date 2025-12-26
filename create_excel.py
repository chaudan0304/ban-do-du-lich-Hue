import pandas as pd

# ============================================================
# 1. DANH SÁCH ĐỊA ĐIỂM)
# ============================================================

locations = [
    # --- Di tích ---
    {
        "name": "Hoàng Thành Huế",
        "description": "Hoàng thành cổ kính, di sản UNESCO với cung điện và thành lũy Nguyễn triều.",
        "category": "Di tích",
        "rating": 4.9,
        "lat": 16.47005,
        "lng": 107.57738,
        "image": "/static/images/dai-noi-hue.png",
    },
    {
        "name": "Cung An Định",
        "description": "Biệt thự cổ kiến trúc Châu Âu độc đáo, nơi ở của gia đình vua Bảo Đại.",
        "category": "Di tích",
        "rating": 4.7,
        "lat": 16.45659,
        "lng": 107.59832,
        "image": "/static/images/cung-an-dinh.png",
    },
    {
        "name": "Đàn Nam Giao",
        "description": "Nơi các vua Nguyễn tế trời đất, không gian trang nghiêm cổ kính.",
        "category": "Di tích",
        "rating": 4.5,
        "lat": 16.43780,
        "lng": 107.58270,
        "image": "/static/images/dan-nam-giao.png",
    },
    # --- Tâm linh ---
    {
        "name": "Chùa Thiên Mụ",
        "description": "Ngôi chùa cổ nhất Huế bên sông Hương, tháp Phước Duyên biểu tượng.",
        "category": "Tâm linh",
        "rating": 4.8,
        "lat": 16.45370,
        "lng": 107.54458,
        "image": "/static/images/chua-thien-mu.png",
    },
    {
        "name": "Chùa Từ Đàm",
        "description": "Trung tâm Phật giáo Huế, nơi khởi xướng phong trào 1963.",
        "category": "Tâm linh",
        "rating": 4.6,
        "lat": 16.45153,
        "lng": 107.58178,
        "image": "/static/images/chua-tu-dam.png",
    },
    {
        "name": "Chùa Báo Quốc",
        "description": "Chùa cổ trên đồi, xây năm 1670, vườn thông yên tĩnh học Phật.",
        "category": "Tâm linh",
        "rating": 4.7,
        "lat": 16.45421,
        "lng": 107.57962,
        "image": "/static/images/chua-bao-quoc.png",
    },
    {
        "name": "Chùa Từ Hiếu",
        "description": "Chùa tổ của Thiền sư Thích Nhất Hạnh, vườn mộ giữa rừng thông.",
        "category": "Tâm linh",
        "rating": 4.8,
        "lat": 16.43889,
        "lng": 107.57199,
        "image": "/static/images/chua-tu-hieu.png",
    },
    {
        "name": "Chùa Huyền Không Sơn Thượng",
        "description": "Chùa trên núi, hồ sen, thư pháp, kiến trúc hòa quyện thiên nhiên.",
        "category": "Tâm linh",
        "rating": 4.8,
        "lat": 16.45078,
        "lng": 107.49381,
        "image": "/static/images/chua-huyen-khong-son-thuong.png",
    },
    {
        "name": "Chùa Thiền Lâm",
        "description": "Kiến trúc kiểu Ấn Độ với tượng Phật trắng lớn.",
        "category": "Tâm linh",
        "rating": 4.7,
        "lat": 16.43817,
        "lng": 107.57528,
        "image": "/static/images/chua-thien-lam.png",
    },
    {
        "name": "Điện Hòn Chén",
        "description": "Ngôi điện linh thiêng nằm bên bờ sông Hương.",
        "category": "Tâm linh",
        "rating": 4.6,
        "lat": 16.42195,
        "lng": 107.56296,
        "image": "/static/images/dien-hon-chen.png",
    },
    # --- Lăng tẩm ---
    {
        "name": "Lăng Khải Định",
        "description": "Lăng tẩm độc đáo kết hợp kiến trúc Á-Âu.",
        "category": "Lăng tẩm",
        "rating": 4.7,
        "lat": 16.39890,
        "lng": 107.59029,
        "image": "/static/images/lang-khai-dinh.png",
    },
    {
        "name": "Lăng Tự Đức",
        "description": "Lăng mộ lãng mạn nhất của vua Tự Đức, hồ sen và kiến trúc thơ mộng.",
        "category": "Lăng tẩm",
        "rating": 4.8,
        "lat": 16.43299,
        "lng": 107.56644,
        "image": "/static/images/lang-tu-duc.png",
    },
    {
        "name": "Lăng Minh Mạng",
        "description": "Lăng mộ hoành tráng nhất, kiến trúc đối xứng hoàn hảo bên sông Hương.",
        "category": "Lăng tẩm",
        "rating": 4.9,
        "lat": 16.38748,
        "lng": 107.57025,
        "image": "/static/images/lang-minh-mang.png",
    },
    {
        "name": "Lăng Gia Long",
        "description": "Lăng mộ xa xôi nhất, nằm giữa núi rừng thiên nhiên hùng vĩ.",
        "category": "Lăng tẩm",
        "rating": 4.6,
        "lat": 16.36197,
        "lng": 107.59694,
        "image": "/static/images/lang-gia-long.png",
    },
    # --- Ẩm thực ---
    {
        "name": "Bún Bò Mệ Kéo",
        "description": "Quán bún bò Huế nguyên bản nhất, nước dùng đậm đà gia truyền.",
        "category": "Ẩm thực",
        "rating": 4.6,
        "lat": 16.47505,
        "lng": 107.58870,
        "image": "/static/images/bun-bo-me-keo.png",
    },
    {
        "name": "Chè Hẻm Huế",
        "description": "Quán chè hẻm nổi tiếng với hơn 20 loại chè Huế truyền thống.",
        "category": "Ẩm thực",
        "rating": 4.5,
        "lat": 16.46510,
        "lng": 107.59358,
        "image": "/static/images/che-hem-hue.png",
    },
    {
        "name": "Nem Lủi Bà Tý",
        "description": "Quán nem lủi nướng nổi tiếng, ăn kèm bánh tráng và rau sống.",
        "category": "Ẩm thực",
        "rating": 4.6,
        "lat": 16.48003,
        "lng": 107.58339,
        "image": "/static/images/nem-lui-ba-ty.png",
    },
    # --- Mua sắm ---
    {
        "name": "Chợ Đông Ba",
        "description": "Chợ truyền thống sầm uất nhất Huế, bán đặc sản và quà lưu niệm.",
        "category": "Mua sắm",
        "rating": 4.5,
        "lat": 16.47243,
        "lng": 107.58867,
        "image": "/static/images/cho-dong-ba.png",
    },
    {
        "name": "Chợ Bến Ngự",
        "description": "Chợ địa phương gần Đại Nội, bán hải sản tươi, rau củ và đặc sản Huế.",
        "category": "Mua sắm",
        "rating": 4.4,
        "lat": 16.45518,
        "lng": 107.58394,
        "image": "/static/images/cho-ben-ngu.png",
    },
    {
        "name": "Chợ An Cựu",
        "description": "Chợ nổi tiếng ẩm thực đường phố, gần trung tâm.",
        "category": "Mua sắm",
        "rating": 4.5,
        "lat": 16.45745,
        "lng": 107.60070,
        "image": "/static/images/cho-an-cuu.png",
    },
    {
        "name": "Chợ Tây Lộc",
        "description": "Chợ dân sinh lớn, nổi tiếng mắm tôm chua và đặc sản Huế.",
        "category": "Mua sắm",
        "rating": 4.3,
        "lat": 16.47678,
        "lng": 107.56569,
        "image": "/static/images/cho-tay-loc.png",
    },
    {
        "name": "Chợ Xép",
        "description": "Chợ nhỏ truyền thống, bán trái cây, đồ cúng và không khí địa phương.",
        "category": "Mua sắm",
        "rating": 4.2,
        "lat": 16.47888,
        "lng": 107.58242,
        "image": "/static/images/cho-xep.png",
    },
    # --- Tham quan ---
    {
        "name": "Nhà vườn An Hiên",
        "description": "Nhà vườn truyền thống Huế đẹp nhất, kiến trúc cổ.",
        "category": "Nhà vườn",
        "rating": 4.8,
        "lat": 16.45532,
        "lng": 107.55378,
        "image": "/static/images/nha-vuon-an-hien.png",
    },
    {
        "name": "Cầu Trường Tiền",
        "description": "Cây cầu biểu tượng bắc qua sông Hương, đẹp lung linh về đêm.",
        "category": "Tham quan",
        "rating": 4.8,
        "lat": 16.46912,
        "lng": 107.58859,
        "image": "/static/images/cau-truong-tien.png",
    },
    {
        "name": "Sông Hương",
        "description": "Dòng sông thơ mộng của Huế, du thuyền nghe ca Huế về đêm.",
        "category": "Tham quan",
        "rating": 4.9,
        "lat": 16.47021,
        "lng": 107.59024,
        "image": "/static/images/song-huong.png",
    },
    {
        "name": "Cầu ngói Thanh Toàn",
        "description": "Cầu ngói cổ kính hơn 200 năm, kiến trúc Nhật Bản độc đáo.",
        "category": "Tham quan",
        "rating": 4.7,
        "lat": 16.46674,
        "lng": 107.64210,
        "image": "/static/images/cau-thanh-toan.png",
    },
    {
        "name": "Làng Hương Thủy Xuân",
        "description": "Làng nghề làm hương truyền thống rực rỡ sắc màu.",
        "category": "Tham quan",
        "rating": 4.6,
        "lat": 16.43554,
        "lng": 107.56227,
        "image": "/static/images/lang-huong.png",
    },
    {
        "name": "Trường THPT chuyên Quốc Học Huế",
        "description": "Ngôi trường cổ kính màu đỏ gạch bên sông Hương, kiến trúc Pháp.",
        "category": "Tham quan",
        "rating": 4.8,
        "lat": 16.46008,
        "lng": 107.58335,
        "image": "/static/images/truong-quoc-hoc-hue.png",
    },
    # --- Thiên nhiên ---
    {
        "name": "Đồi Vọng Cảnh",
        "description": "Đồi cao ngắm toàn cảnh Huế và sông Hương lúc hoàng hôn.",
        "category": "Thiên nhiên",
        "rating": 4.7,
        "lat": 16.42723,
        "lng": 107.56493,
        "image": "/static/images/doi-vong-canh.png",
    },
    {
        "name": "Núi Ngự Bình",
        "description": "Ngọn núi bình phong trấn giữ Huế.",
        "category": "Thiên nhiên",
        "rating": 4.7,
        "lat": 16.44168,
        "lng": 107.59610,
        "image": "/static/images/nui-ngu-binh.png",
    },
    {
        "name": "Đầm Lập An",
        "description": "Tuyệt tình cốc của Huế, vẻ đẹp mơ màng giữa đầm nước và núi Bạch Mã.",
        "category": "Thiên nhiên",
        "rating": 4.7,
        "lat": 16.22142,
        "lng": 108.06157,
        "image": "/static/images/dam-lap-an.png",
    },
    {
        "name": "Vườn Quốc gia Bạch Mã",
        "description": "Thiên đường trên mặt đất với khí hậu mát mẻ.",
        "category": "Thiên nhiên",
        "rating": 4.8,
        "lat": 16.21650,
        "lng": 107.89365,
        "image": "/static/images/vuon-quoc-gia-bach-ma.png",
    },
    {
        "name": "Rừng ngập mặn Rú Chá",
        "description": "Khu rừng ngập mặn nguyên sinh duy nhất còn lại ở phá Tam Giang.",
        "category": "Thiên nhiên",
        "rating": 4.6,
        "lat": 16.55748,
        "lng": 107.61144,
        "image": "/static/images/rung-ru-cha.png",
    },
    {
        "name": "Phá Tam Giang",
        "description": "Vùng đầm phá nước lợ lớn nhất Đông Nam Á, nơi ngắm hoàng hôn đẹp nhất.",
        "category": "Thiên nhiên",
        "rating": 4.7,
        "lat": 16.59788,
        "lng": 107.54309,
        "image": "/static/images/pha-tam-giang.png",
    },
    {
        "name": "Suối Voi",
        "description": "Dòng suối mát lạnh với tảng đá hình con voi độc đáo.",
        "category": "Thiên nhiên",
        "rating": 4.5,
        "lat": 16.24387,
        "lng": 107.98943,
        "image": "/static/images/suoi-voi.png",
    },
    # --- Bãi biển ---
    {
        "name": "Bãi biển Lăng Cô",
        "description": "Một trong những bãi biển đẹp nhất Việt Nam, vịnh Lăng Cô yên bình.",
        "category": "Bãi biển",
        "rating": 4.8,
        "lat": 16.26424,
        "lng": 108.06582,
        "image": "/static/images/bai-bien-lang-co.png",
    },
    {
        "name": "Bãi biển Thuận An",
        "description": "Bãi biển gần trung tâm Huế, hải sản tươi và không khí địa phương.",
        "category": "Bãi biển",
        "rating": 4.6,
        "lat": 16.55966,
        "lng": 107.65428,
        "image": "/static/images/bai-bien-thuan-an.png",
    },
]

# ============================================================
# 2. XỬ LÝ DỮ LIỆU
# ============================================================

# Tạo DataFrame từ list
df_locations = pd.DataFrame(locations)

# Thêm cột ID (tự động tăng từ 1)
df_locations.insert(0, "id", range(1, 1 + len(df_locations)))
df_locations["city"] = "Huế"
# Dictionary giúp tìm ID nhanh từ tên: "Hoàng Thành Huế" -> 1
name_to_id = df_locations.set_index("name")["id"].to_dict()

user_data_raw = [
    ("SinhVienHue", ["Hoàng Thành Huế", "Lăng Khải Định"]),
    ("KhachTayBalo", ["Bún Bò Mệ Kéo", "Chè Hẻm Huế"]),
    ("HoiYeuThienNhien", ["Cầu Trường Tiền", "Vườn Quốc gia Bạch Mã"]),
    ("YeuTamLinh", ["Chùa Thiên Mụ", "Điện Hòn Chén"]),
]

# Chuyển đổi dữ liệu user sang dạng chuẩn (có ID)
user_list = []
for user_name, liked_places in user_data_raw:
    for place_name in liked_places:
        if place_name in name_to_id:
            user_list.append(
                {
                    "user_name": user_name,
                    "liked_id": name_to_id[place_name],  # Tự động lấy ID chuẩn
                }
            )
        else:
            print(
                f"⚠️ Cảnh báo: Không tìm thấy địa điểm '{place_name}' trong danh sách!"
            )

df_users = pd.DataFrame(user_list)

# ============================================================
# 3. XUẤT FILE EXCEL
# ============================================================
try:
    with pd.ExcelWriter("data.xlsx") as writer:
        df_locations.to_excel(writer, sheet_name="Locations", index=False)
        df_users.to_excel(writer, sheet_name="Users", index=False)
    print("\n🎉 XUẤT FILE THÀNH CÔNG!")
    print(f"- Tổng số địa điểm: {len(df_locations)}")
    print(f"- Tổng số sở thích user: {len(df_users)}")
except Exception as e:
    print(f"❌ Lỗi: {e}")
