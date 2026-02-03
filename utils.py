# Helper functions for API
def safe_float(value, default=0.0):
    try:
        return float(value)
    except (ValueError, TypeError):
        return default


def analyze_sentiment(text):
    text = text.lower()

    # Từ điển tích cực (Positive)
    pos_words = [
        "thích",
        "ngon",
        "đẹp",
        "tuyệt",
        "tốt",
        "hay",
        "vui",
        "xịn",
        "ok",
        "ổn",
        "xuất sắc",
        "thân thiện",
        "sạch",
        "rẻ",
        "đỉnh",
        "hài lòng",
        "love",
        "good",
        "nice",
        "hấp dẫn",
        "thú vị",
        "ấn tượng",
        "lung linh",
        "mê",
        "yêu",
    ]

    # Từ điển tiêu cực (Negative)
    neg_words = [
        "dở",
        "tệ",
        "xấu",
        "chán",
        "đắt",
        "bẩn",
        "ồn",
        "kém",
        "buồn",
        "lâu",
        "thất vọng",
        "ghét",
        "bad",
        "tởm",
        "hôi",
        "đau",
        "phí",
        "nhạt",
        "cũ",
    ]

    score = 0

    # Tính điểm
    for w in pos_words:
        if w in text:
            score += 1

    for w in neg_words:
        if w in text:
            score -= 1

    # Xếp loại
    if score > 0:
        return "Positive"
    if score < 0:
        return "Negative"
    return "Neutral"


def classify_comment_topic(text):
    """
    Phân loại chủ đề bình luận dựa trên từ khóa.
    Trả về danh sách các tags (VD: ['Món ăn', 'Phục vụ'])
    """
    text = text.lower()
    topics = []

    keywords = {
        "Món ăn": [
            "ngon",
            "dở",
            "vị",
            "món",
            "ăn",
            "thực đơn",
            "menu",
            "bánh",
            "chè",
            "cơm",
            "bún",
            "mặn",
            "nhạt",
            "thơm",
        ],
        "Không gian": [
            "đẹp",
            "xấu",
            "rộng",
            "hẹp",
            "view",
            "chỗ ngồi",
            "trang trí",
            "decor",
            "không gian",
            "thoáng",
            "mát",
            "check-in",
        ],
        "Phục vụ": [
            "nhân viên",
            "phục vụ",
            "thái độ",
            "nhanh",
            "lâu",
            "nhiệt tình",
            "thân thiện",
            "chuyên nghiệp",
            "tệ",
        ],
        "Giá cả": ["đắt", "rẻ", "giá", "tiền", "hợp lý", "mắc", "khuyến mãi", "bill"],
        "Vệ sinh": ["sạch", "bẩn", "dơ", "rác", "vệ sinh", "nhà vệ sinh", "wc"],
        "Vị trí": [
            "dễ tìm",
            "khó tìm",
            "gần",
            "xa",
            "trung tâm",
            "hẻm",
            "ngõ",
            "đường",
        ],
    }

    for topic, words in keywords.items():
        for w in words:
            if w in text:
                topics.append(topic)
                break

    return topics
