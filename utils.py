# Helper functions for API
import re


def safe_float(value, default=0.0):
    try:
        return float(value)
    except (ValueError, TypeError):
        return default


# Danh sách từ ghép tiếng Việt cần loại trừ
# Key: từ đơn dễ false positive -> Value: list compound words chứa từ đó
_COMPOUND_EXCLUSIONS = {
    "lâu": ["lâu đài", "lâu năm", "lâu nay", "lâu rồi"],
    "phí": ["chi phí", "học phí", "lệ phí", "miễn phí", "phí dịch vụ"],
    "cũ": ["cũng", "cũng được", "cũng vậy"],
    "rẻ": ["trẻ", "trẻ em", "trẻ con"],
    "ổn": ["ổn định"],
}


def _word_match(word, text):
    """
    Kiểm tra từ khóa có xuất hiện ĐỘC LẬP trong text (không nằm trong từ ghép).
    Với tiếng Việt: kiểm tra compound exclusion trước, rồi dùng regex boundary.

    VD:
      _word_match('lâu', 'lâu đài rất đẹp') -> False (vì 'lâu đài' là từ ghép)
      _word_match('lâu', 'đợi lâu quá')     -> True  (lâu đứng độc lập)
      _word_match('phí', 'chi phí hợp lý')   -> False (vì 'chi phí' là từ ghép)
      _word_match('phí', 'phí phạm')         -> True  (phí đứng độc lập)
    """
    # Bước 1: Kiểm tra compound exclusion
    exclusions = _COMPOUND_EXCLUSIONS.get(word, [])
    for compound in exclusions:
        if compound in text:
            # Xóa compound word khỏi text tạm thời, rồi check lại
            temp_text = text.replace(compound, " ")
            if word not in temp_text:
                return False
            # Nếu word vẫn còn tồn tại sau khi xóa compound -> tiếp tục check
            text = temp_text

    # Bước 2: Regex word boundary
    escaped = re.escape(word)
    pattern = r"(?:^|[\s,.!?;:])" + escaped + r"(?:$|[\s,.!?;:])"
    return bool(re.search(pattern, text))


def analyze_sentiment(text):
    text = text.lower().strip()

    if not text:
        return "Neutral"

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
        "thất vọng",
        "ghét",
        "bad",
        "tởm",
        "hôi",
        "đau",
        "nhạt",
        "lâu",
        "phí",
        "cũ",
    ]

    # Từ cần compound-aware boundary check (dễ false positive)
    boundary_words_pos = {"rẻ", "ổn", "ok"}
    boundary_words_neg = {"lâu", "phí", "cũ"}

    score = 0

    # Tính điểm - có phân biệt từ cần boundary
    for w in pos_words:
        if w in boundary_words_pos:
            if _word_match(w, text):
                score += 1
        elif w in text:
            score += 1

    for w in neg_words:
        if w in boundary_words_neg:
            if _word_match(w, text):
                score -= 1
        elif w in text:
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
    text = text.lower().strip()
    if not text:
        return []

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
            "nhiệt tình",
            "thân thiện",
            "chuyên nghiệp",
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

    # Từ cần word boundary check (dễ false positive)
    boundary_keywords = {"vị", "mát", "nhanh", "gần", "xa", "rẻ"}

    for topic, words in keywords.items():
        for w in words:
            if w in boundary_keywords:
                if _word_match(w, text):
                    topics.append(topic)
                    break
            elif w in text:
                topics.append(topic)
                break

    return topics
