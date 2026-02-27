"""
=============================================================================
utils.py - Các hàm tiện ích dùng chung (Backend Utilities)
utils.py - Shared utility functions (Backend Utilities)
=============================================================================
Mô tả / Description:
    - Phân tích cảm xúc bình luận tiếng Việt (Sentiment Analysis).
      Analyze sentiment of Vietnamese-language comments.
    - Phân loại chủ đề bình luận (Topic Classification).
      Classify comment topics (Food, Space, Service, Price, etc.).
    - Xử lý từ ghép tiếng Việt để tránh false positive.
      Handle Vietnamese compound words to avoid false positives.

Phụ thuộc / Dependencies:
    - re (regex cho word boundary matching)

Ghi chú / Notes:
    - Sử dụng phương pháp rule-based (từ điển) — không phải ML model.
      Uses rule-based approach (dictionary) — not an ML model.
    - Hỗ trợ cả tiếng Việt và tiếng Anh trong danh sách từ khóa.
      Supports both Vietnamese and English in keyword lists.
=============================================================================
"""

# Helper functions for API
import re


# =============================================================
# HÀM CHUYỂN ĐỔI AN TOÀN SANG FLOAT (Safe Float Conversion)
# Tránh lỗi khi giá trị không phải số (VD: None, "abc")
# Prevents errors when value is not a number (e.g., None, "abc")
# =============================================================
def safe_float(value, default=0.0):
    try:
        return float(value)
    except (ValueError, TypeError):
        return default


# =============================================================
# DANH SÁCH TỪ GHÉP TIẾNG VIỆT CẦN LOẠI TRỪ
# VIETNAMESE COMPOUND WORDS TO EXCLUDE FROM MATCHING
# Key: từ đơn dễ false positive → Value: danh sách từ ghép chứa từ đó
# Key: single word prone to false positive → Value: compound words list
#
# Ví dụ / Example:
#   "lâu" có thể bị nhầm là từ tiêu cực (chờ lâu), nhưng trong
#   "lâu đài" nó là tên gọi kiến trúc, không mang nghĩa tiêu cực.
#   "lâu" might be misclassified as negative (long wait), but in
#   "lâu đài" (palace) it's a proper noun, not negative.
# =============================================================
_COMPOUND_EXCLUSIONS = {
    "lâu": ["lâu đài", "lâu năm", "lâu nay", "lâu rồi"],
    "phí": ["chi phí", "học phí", "lệ phí", "miễn phí", "phí dịch vụ"],
    "cũ": ["cũng", "cũng được", "cũng vậy"],
    "rẻ": ["trẻ", "trẻ em", "trẻ con"],
    "ổn": ["ổn định"],
}


def _word_match(word, text):
    """
    Kiểm tra từ khóa có xuất hiện ĐỘC LẬP trong text không.
    Check if a keyword appears INDEPENDENTLY in the text (not part of a compound word).

    Quy trình / Process:
        1. Kiểm tra compound exclusion (từ ghép) trước
           Check compound exclusions first
        2. Dùng regex boundary để xác nhận từ đứng độc lập
           Use regex boundary to confirm the word stands alone

    Ví dụ / Examples:
        _word_match('lâu', 'lâu đài rất đẹp') → False (vì 'lâu đài' là từ ghép / compound word)
        _word_match('lâu', 'đợi lâu quá')     → True  (lâu đứng độc lập / stands alone)
        _word_match('phí', 'chi phí hợp lý')   → False (vì 'chi phí' là từ ghép / compound word)
        _word_match('phí', 'phí phạm')         → True  (phí đứng độc lập / stands alone)

    Args:
        word (str): Từ khóa cần kiểm tra / Keyword to check
        text (str): Văn bản chứa từ cần tìm / Text to search in

    Returns:
        bool: True nếu từ xuất hiện độc lập / True if word appears independently
    """
    # Bước 1: Kiểm tra compound exclusion (từ ghép)
    # Step 1: Check compound exclusion (compound words)
    exclusions = _COMPOUND_EXCLUSIONS.get(word, [])
    for compound in exclusions:
        if compound in text:
            # Xóa compound word khỏi text tạm thời, rồi check lại
            # Remove compound word from text temporarily, then re-check
            temp_text = text.replace(compound, " ")
            if word not in temp_text:
                return False
            # Nếu word vẫn còn tồn tại sau khi xóa compound → tiếp tục check
            # If word still exists after removing compound → continue checking
            text = temp_text

    # Bước 2: Regex word boundary — xác nhận từ đứng độc lập
    # Step 2: Regex word boundary — confirm word stands alone
    escaped = re.escape(word)
    pattern = r"(?:^|[\s,.!?;:])" + escaped + r"(?:$|[\s,.!?;:])"
    return bool(re.search(pattern, text))


# =============================================================
# PHÂN TÍCH CẢM XÚC (SENTIMENT ANALYSIS)
# Rule-based sentiment classification cho text tiếng Việt
# Rule-based sentiment classification for Vietnamese text
#
# Thuật toán / Algorithm:
#   1. Duyệt danh sách từ tích cực → +1 điểm mỗi từ
#      Scan positive word list → +1 point per word
#   2. Duyệt danh sách từ tiêu cực → -1 điểm mỗi từ
#      Scan negative word list → -1 point per word
#   3. Tổng điểm > 0 → Positive, < 0 → Negative, = 0 → Neutral
#      Total > 0 → Positive, < 0 → Negative, = 0 → Neutral
#
# Trả về / Returns: "Positive" | "Negative" | "Neutral"
# =============================================================
def analyze_sentiment(text):
    text = text.lower().strip()

    if not text:
        return "Neutral"

    # Từ điển tích cực (Positive keywords)
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

    # Từ điển tiêu cực (Negative keywords)
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

    # Các từ cần kiểm tra compound-aware boundary (dễ bị false positive)
    # Words that need compound-aware boundary check (prone to false positive)
    boundary_words_pos = {"rẻ", "ổn", "ok"}
    boundary_words_neg = {"lâu", "phí", "cũ"}

    score = 0

    # Tính điểm — có phân biệt từ cần boundary check
    # Calculate score — differentiate words needing boundary check
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

    # Xếp loại cảm xúc dựa trên tổng điểm
    # Classify sentiment based on total score
    if score > 0:
        return "Positive"
    if score < 0:
        return "Negative"
    return "Neutral"


# =============================================================
# PHÂN LOẠI CHỦ ĐỀ BÌNH LUẬN (COMMENT TOPIC CLASSIFICATION)
# Phân loại bình luận vào các chủ đề dựa trên từ khóa.
# Classify comments into topics based on keywords.
#
# Các chủ đề / Topics:
#   - Món ăn (Food): ngon, dở, vị, món, ăn, menu, bánh...
#   - Không gian (Space): đẹp, xấu, rộng, view, trang trí...
#   - Phục vụ (Service): nhân viên, phục vụ, thái độ, nhanh...
#   - Giá cả (Price): đắt, rẻ, giá, tiền, hợp lý...
#   - Vệ sinh (Hygiene): sạch, bẩn, dơ, rác, vệ sinh...
#   - Vị trí (Location): dễ tìm, khó tìm, gần, xa, trung tâm...
#
# Trả về / Returns: list[str] — VD: ['Món ăn', 'Phục vụ']
# =============================================================
def classify_comment_topic(text):
    """
    Phân loại chủ đề bình luận dựa trên từ khóa.
    Classify comment topics based on keywords.

    Args:
        text (str): Nội dung bình luận / Comment content

    Returns:
        list[str]: Danh sách các tag chủ đề / List of topic tags
                   VD / e.g.: ['Món ăn', 'Phục vụ']
    """
    text = text.lower().strip()
    if not text:
        return []

    topics = []

    # Bảng từ khóa theo chủ đề (Keyword mapping by topic)
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

    # Từ cần word boundary check (dễ bị false positive do quá ngắn hoặc trùng từ ghép)
    # Words needing word boundary check (too short or overlap with compound words)
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
