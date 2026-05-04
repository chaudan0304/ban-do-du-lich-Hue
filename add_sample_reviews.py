import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from db.connection import run_query
from db.location import add_review
from utils import analyze_sentiment, classify_comment_topic

# Danh sách người dùng mẫu
users = ["nguyenvana", "lethib", "tranc", "hoangd", "pham"]

# Đảm bảo các người dùng này tồn tại trong DB
for u in users:
    run_query("MERGE (user:User {name: $name}) ON CREATE SET user.fullname = $name, user.password = '123456', user.created_at = datetime()", {"name": u})

# Các đánh giá mẫu cho địa điểm "Hoàng Thành Huế"
comments = [
    ("admin", "Hoàng Thành Huế", 5, "Kiến trúc tuyệt đẹp, mang đậm dấu ấn lịch sử triều Nguyễn. Không gian rộng lớn và rất yên bình."),
    ("nguyenvana", "Hoàng Thành Huế", 4, "Rất đáng để tham quan nhưng trời nắng quá, đi bộ hơi mệt. Nên đi vào buổi sáng sớm hoặc chiều mát."),
    ("lethib", "Hoàng Thành Huế", 5, "Hướng dẫn viên nhiệt tình, giải thích chi tiết về từng cung điện. Rất hữu ích cho người thích lịch sử."),
    ("tranc", "Hoàng Thành Huế", 2, "Giá vé hơi cao so với mặt bằng chung. Nhiều khu vực đang trùng tu nên không xem được trọn vẹn."),
    ("hoangd", "Hoàng Thành Huế", 5, "Một trải nghiệm tuyệt vời, không thể bỏ qua khi đến Huế. Check-in lên hình cực kỳ lung linh."),
    ("pham", "Hoàng Thành Huế", 3, "Nơi lưu giữ nét văn hóa đặc sắc. Tuy nhiên cần thêm các dịch vụ xe điện di chuyển bên trong.")
]

print("Bắt đầu thêm đánh giá...")
for c in comments:
    username, loc_name, rating, comment_text = c
    
    # Tự động phân tích
    sentiment = analyze_sentiment(comment_text)
    topics = classify_comment_topic(comment_text)
    
    success, msg = add_review(username, loc_name, rating, comment_text, sentiment, None, topics)
    print(f"[{username}] -> {loc_name}: {sentiment} | Topics: {topics} | Status: {success}")

print("Hoàn tất!")
