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
