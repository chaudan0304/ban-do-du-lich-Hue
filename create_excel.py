import pandas as pd

# Dữ liệu Địa điểm (Dùng ảnh Offline trong máy)
data_locations = {
    'id': [1, 2, 3, 4, 5, 6, 7, 8],
    'name': [
        'Đại Nội Huế', 'Chùa Thiên Mụ', 'Chợ Đông Ba', 'Lăng Khải Định', 
        'Cầu Tràng Tiền', 'Bún Bò Mệ Kéo', 'Chè Hẻm', 'Đồi Vọng Cảnh'
    ],
    'description': [
        'Hoàng thành cổ kính.', 'Chùa cổ bên sông Hương.', 
        'Khu chợ sầm uất.', 'Kiến trúc lăng tẩm độc đáo.', 
        'Cây cầu biểu tượng.', 'Bún bò đậm đà.',
        'Quán chè nổi tiếng.', 'Ngắm hoàng hôn đẹp nhất.'
    ],
    'city': ['Huế'] * 8,
    'category': ['Di tích', 'Tâm linh', 'Mua sắm', 'Di tích', 'Tham quan', 'Ẩm thực', 'Ẩm thực', 'Thiên nhiên'],
    'rating': [4.9, 4.8, 4.5, 4.7, 4.8, 4.6, 4.5, 4.7],
    'lat': [16.4689, 16.4534, 16.4703, 16.3993, 16.4685, 16.4732, 16.4710, 16.4350],
    'lng': [107.5779, 107.5449, 107.5810, 107.5903, 107.5923, 107.5955, 107.5930, 107.5630],
    
    # --- QUAN TRỌNG: Đường dẫn ảnh Offline ---
    # Bạn hãy tải ảnh về thư mục static/images/ và điền tên file tương ứng vào đây
    # Ví dụ dưới đây mình để chung 1 ảnh demo.png cho tất cả để test
    'image': [
        '/static/images/dai-noi-hue.png',      # Bạn nhớ tải ảnh và đặt tên đúng nhé
        '/static/images/chua-thien-mu.png',
        '/static/images/cho-dong-ba.png',
        '/static/images/lang-khai-dinh.png',
        '/static/images/cau-trang-tien.png',
        '/static/images/bunbo.png',
        '/static/images/chehem.png',
        '/static/images/doi-vong-canh-hue.png'
    ]
}

# (Phần data_users giữ nguyên như cũ)
data_users = {
    'user_name': ['SinhVienHue', 'SinhVienHue', 'KhachTayBalo', 'KhachTayBalo', 'HoiYeuThienNhien'],
    'liked_id': [1, 4, 6, 7, 8]
}

try:
    with pd.ExcelWriter('data.xlsx') as writer:
        pd.DataFrame(data_locations).to_excel(writer, sheet_name='Locations', index=False)
        pd.DataFrame(data_users).to_excel(writer, sheet_name='Users', index=False)
    print("✅ Đã cập nhật đường dẫn ảnh Offline!")
except Exception as e:
    print(f"❌ Lỗi: {e}")