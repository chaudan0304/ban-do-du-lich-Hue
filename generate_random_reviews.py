import sys
import os
import random

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from db.connection import run_query
from db.location import add_review
from utils import analyze_sentiment, classify_comment_topic

# 15 người dùng ngẫu nhiên
users = [f"user_random_{i}" for i in range(1, 16)]

# Tạo users trong database
print("Tạo 15 user ngẫu nhiên...")
for u in users:
    run_query(
        "MERGE (user:User {name: $name}) ON CREATE SET user.fullname = $fullname, user.password = '123456', user.created_at = datetime()",
        {"name": u, "fullname": f"Người dùng {u.split('_')[-1]}"}
    )

# Danh sách địa điểm phổ biến để đánh giá
locations = [
    'Hoàng Thành Huế', 'Chùa Thiên Mụ', 'Lăng Khải Định', 'Lăng Tự Đức', 
    'Chợ Đông Ba', 'Cầu Trường Tiền', 'Sông Hương', 'Bún Bò Mệ Kéo', 
    'Chè Hẻm Huế', 'Nem Lụi Bà Tý', 'Vườn Quốc gia Bạch Mã', 'Đồi Vọng Cảnh'
]

# Các mẫu bình luận tương ứng với số sao (1-5)
comments_templates = {
    5: [
        "Tuyệt vời! Không gian rất đẹp và mang đậm nét văn hóa.",
        "Rất ấn tượng, dịch vụ xuất sắc và ẩm thực ngon.",
        "Trải nghiệm đáng nhớ, mình sẽ quay lại đây vào lần sau.",
        "Cảnh quan thiên nhiên hùng vĩ, lên hình bao đẹp.",
        "Mọi thứ đều hoàn hảo, rất đáng giá tiền."
    ],
    4: [
        "Khá tốt, tuy nhiên lúc mình đi hơi đông người.",
        "Không gian đẹp nhưng cần cải thiện thêm một chút về dịch vụ.",
        "Rất thích hợp để đi dạo chụp ảnh vào buổi chiều.",
        "Món ăn ngon, giá cả hợp lý, nhân viên phục vụ tốt.",
        "Địa điểm lý tưởng cho gia đình, mỗi tội thời tiết hơi nắng."
    ],
    3: [
        "Bình thường, không có gì quá nổi bật so với các nơi khác.",
        "Tạm ổn, phù hợp đi qua ngắm cảnh một lúc.",
        "Giá cả hơi cao so với chất lượng nhận được.",
        "Đồ ăn bình thường, cảnh quan đang trùng tu nhiều nơi.",
        "Cần thêm nhiều biển chỉ dẫn và dịch vụ tiện ích hơn."
    ],
    2: [
        "Khá thất vọng vì dịch vụ không như mong đợi.",
        "Đông đúc và ồn ào quá, khó để tận hưởng không gian.",
        "Giá quá đắt, chất lượng đồ ăn không xứng đáng.",
        "Nhiều khu vực xuống cấp, chưa được bảo trì tốt."
    ],
    1: [
        "Rất tệ, thái độ nhân viên không tốt chút nào.",
        "Hoàn toàn thất vọng, sẽ không bao giờ quay lại đây.",
        "Lãng phí thời gian và tiền bạc, cảnh quan không như quảng cáo."
    ]
}

print("Bắt đầu thêm đánh giá ngẫu nhiên...")
total_reviews = 0

# Mỗi user sẽ đánh giá ngẫu nhiên 3-5 địa điểm
for user in users:
    num_places = random.randint(3, 5)
    places_to_review = random.sample(locations, num_places)
    
    for loc in places_to_review:
        # Tỷ lệ: 70% đánh giá tốt (4-5 sao), 20% trung bình (3 sao), 10% kém (1-2 sao)
        rating_choice = random.choices([5, 4, 3, 2, 1], weights=[40, 30, 20, 5, 5], k=1)[0]
        comment_text = random.choice(comments_templates[rating_choice])
        
        # Phân tích cảm xúc & chủ đề
        sentiment = analyze_sentiment(comment_text)
        topics = classify_comment_topic(comment_text)
        
        success, msg = add_review(user, loc, rating_choice, comment_text, sentiment, None, topics)
        if success:
            total_reviews += 1
            print(f"[{user}] -> {loc}: {rating_choice} sao | {sentiment}")

print(f"\n✅ Hoàn tất! Đã tạo thành công {total_reviews} đánh giá ngẫu nhiên từ {len(users)} người dùng.")
