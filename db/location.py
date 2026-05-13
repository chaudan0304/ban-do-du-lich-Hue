"""
=============================================================================
db/location.py - Các hàm xử lý Location & tương tác (Like, Review)
db/location.py - Location & Interaction functions (Like, Review)
=============================================================================
Mô tả / Description:
    - Like/Unlike địa điểm (toggle) + tự động cập nhật :INTERACTED.
      Like/Unlike locations (toggle) + auto-update :INTERACTED.
    - Thêm hoặc cập nhật đánh giá (review) + auto-like + cập nhật trọng số.
      Add or update reviews + auto-like + update interaction weights.
    - Lấy danh sách đánh giá theo địa điểm (sắp xếp theo cảm xúc + rating).
      Get reviews by location (sorted by sentiment + rating).
    - Xóa đánh giá + tự động cập nhật :INTERACTED và rating trung bình.
      Delete reviews + auto-update :INTERACTED and average rating.

Phụ thuộc / Dependencies:
    - db.connection (run_query, run_write_transaction)

Ghi chú quan trọng / Important Notes:
    - Mọi thao tác like/review đều tự động cập nhật quan hệ :INTERACTED
      All like/review operations auto-update :INTERACTED relationship
    - Điều này đảm bảo thuật toán gợi ý AI luôn có dữ liệu mới nhất
      This ensures the AI recommendation algorithm always has latest data
    - Công thức trọng số: weight = liked_score(0-1) + review_score(0-5)
      Weight formula: weight = liked_score(0-1) + review_score(0-5)
    - Tối đa 6 điểm/user-location (1 from LIKED + 5 from 5-star review)
      Maximum 6 points/user-location (1 from LIKED + 5 from 5-star review)
=============================================================================
"""

import logging
from .connection import run_query, run_write_transaction

logger = logging.getLogger(__name__)


# =============================================================
# LIKE/UNLIKE ĐỊA ĐIỂM (Toggle Like)
# Nếu đã like → bỏ like (Unlike)
# If already liked → remove like (Unlike)
# Nếu chưa like → thêm like
# If not liked → add like
#
# Đồng thời cập nhật quan hệ :INTERACTED để thuật toán gợi ý
# luôn phản ánh đúng trạng thái tương tác.
# Also updates :INTERACTED relationship so the recommendation
# algorithm always reflects the current interaction state.
# =============================================================
def toggle_like_location(username, location_name):
   
    try:
        # 1. Kiểm tra trạng thái hiện tại / Check current state
        check_query = """
        MATCH (u:User {name: $u_name})-[r:LIKED]->(l:Location {name: $l_name})
        RETURN r
        """
        existing = run_query(check_query, {"u_name": username, "l_name": location_name})

        params = {"u_name": username, "l_name": location_name}

        if existing:
           
            unlike_query = """
            MATCH (u:User {name: $u_name})-[r:LIKED]->(l:Location {name: $l_name})
            DELETE r
            WITH u, l
            
            OPTIONAL MATCH (u)-[rev:REVIEWED]->(l)
            WITH u, l, rev
           
            FOREACH (_ IN CASE WHEN rev IS NOT NULL THEN [1] ELSE [] END |
                MERGE (u)-[i:INTERACTED]->(l)
                SET i.weight = rev.rating,
                    i.liked_score = 0,
                    i.review_score = rev.rating
            )
            FOREACH (_ IN CASE WHEN rev IS NULL THEN [1] ELSE [] END |
                MERGE (u)-[i:INTERACTED]->(l)
                DELETE i
            )
            """
            run_query(unlike_query, params)
            return False, "Đã bỏ thích"
        else:
          
            like_query = """
            MATCH (u:User {name: $u_name})
            MATCH (l:Location {name: $l_name})
            MERGE (u)-[r:LIKED]->(l)
            SET r.timestamp = datetime()
            WITH u, l
         
            OPTIONAL MATCH (u)-[rev:REVIEWED]->(l)
            WITH u, l, coalesce(rev.rating, 0) AS review_score
            
            MERGE (u)-[i:INTERACTED]->(l)
            SET i.weight = 1 + review_score,
                i.liked_score = 1,
                i.review_score = review_score,
                i.created_at = datetime()
            """
            run_query(like_query, params)
            return True, "Đã thích địa điểm"
    except Exception as e:
        logger.error(f"Lỗi toggle_like_location: {e}")
        return False, f"Lỗi: {str(e)}"


# =============================================================
# THÊM HOẶC CẬP NHẬT ĐÁNH GIÁ (Add/Update Review)
# Nếu có review_id → Cập nhật review hiện có (Edit)
# If review_id provided → Update existing review (Edit)
# Nếu không có → Tạo review mới (Create)
# If no review_id → Create new review (Create)
#
# ĐẶC BIỆT: Tạo review mới sẽ tự động LIKE địa điểm
# SPECIAL: Creating a new review auto-LIKEs the location
#
# Sau khi thêm/sửa → tính lại rating trung bình cho location
# After add/edit → recalculate average rating for location
# =============================================================
def add_review(
    username,
    location_name,
    rating,
    comment,
    sentiment="Neutral",
    review_id=None,
    topics=None,
):
    """
    Thêm hoặc cập nhật đánh giá của user.
    Add or update a user's review.

    Args:
        username (str): Tên người dùng / Username
        location_name (str): Tên địa điểm / Location name
        rating (float): Số sao (0-5) / Star rating (0-5)
        comment (str): Nội dung đánh giá / Review content
        sentiment (str): Kết quả phân tích cảm xúc / Sentiment analysis result
        review_id (str): ID review (nếu cập nhật) / Review ID (if updating)
        topics (list): Danh sách chủ đề phân loại / Classified topics list

    Returns:
        (success: bool, result: dict|str)
    """
    if topics is None:
        topics = []

    # Validate rating range — Clamp vào khoảng 0-5
    # Validate rating range — Clamp to 0-5
    if rating is not None:
        try:
            rating = float(rating)
            rating = max(0, min(5, rating))  # Giới hạn 0-5 / Clamp 0-5
        except (ValueError, TypeError):
            rating = 0

    # Tự động gán rating dựa trên sentiment nếu user không chọn sao
    # Auto-assign rating based on sentiment if user didn't select stars
    if not rating or rating == 0:
        if sentiment == "Positive":
            rating = 5
        elif sentiment == "Negative":
            rating = 1
        else:
            rating = 3  # Neutral → 3 sao / Neutral → 3 stars

    params = {
        "u_name": username,
        "l_name": location_name,
        "rating": float(rating) if rating is not None else 0.0,
        "comment": comment,
        "sentiment": sentiment,
        "topics": topics,
        "review_id": review_id,
    }

    if review_id:
        # ─── CẬP NHẬT REVIEW HIỆN CÓ (Update Existing Review) ───
        query = """
        MATCH (u:User {name: $u_name})-[r:REVIEWED {id: $review_id}]->(l:Location)
        SET r.rating = $rating, 
            r.comment = $comment, 
            r.sentiment = $sentiment,
            r.topics = $topics,
            r.updated_at = datetime()
        WITH u, l, $rating AS review_score
        
        // Cập nhật trọng số INTERACTED / Update INTERACTED weight
        MERGE (u)-[i:INTERACTED]->(l)
        SET i.weight = 1 + review_score,
            i.review_score = review_score
        """
    else:
        # ─── TẠO REVIEW MỚI (Create New Review) ───
        # Đặc biệt: Tự động LIKE khi viết review mới
        # Special: Auto-LIKE when writing a new review
        query = """
        MATCH (u:User {name: $u_name})
        MATCH (l:Location {name: $l_name})
        
        CREATE (u)-[r:REVIEWED]->(l)
        SET r.id = randomUUID(),
            r.rating = $rating, 
            r.comment = $comment, 
            r.sentiment = $sentiment,
            r.topics = $topics,
            r.timestamp = datetime()
            
        WITH u, l, $rating AS review_score
        
        // Tự động LIKE khi viết review / Auto-LIKE when writing review
        MERGE (u)-[like:LIKED]->(l)
        ON CREATE SET like.timestamp = datetime(), like.auto_from_review = true
        
        // Cập nhật :INTERACTED / Update :INTERACTED
        MERGE (u)-[i:INTERACTED]->(l)
        SET i.weight = 1 + review_score,
            i.liked_score = 1,
            i.review_score = review_score,
            i.created_at = datetime()
        """

    # ─── TÍNH LẠI RATING TRUNG BÌNH (Recalculate Average Rating) ───
    # Đồng bộ cả l.rating và l.avgRating để đảm bảo nhất quán
    # Sync both l.rating and l.avgRating for consistency
    recalc_query = """
    MATCH (l:Location {name: $l_name})
    OPTIONAL MATCH (l)<-[r:REVIEWED]-(:User)
    WITH l, avg(r.rating) AS avgRating, count(r) AS totalReviews
    SET l.rating = coalesce(avgRating, 0), 
        l.avgRating = coalesce(avgRating, 0),
        l.reviewCount = totalReviews
    RETURN avgRating, totalReviews
    """

    try:
        # Chạy cả 2 query trong 1 transaction atomic
        # Run both queries in 1 atomic transaction
        results = run_write_transaction(
            [
                (query, params),
                (recalc_query, {"l_name": location_name}),
            ]
        )
        stats = results[1]  # Kết quả của recalc_query / recalc_query results
        return True, stats[0] if stats else None
    except Exception as e:
        logger.error(f"Lỗi add_review: {e}")
        return False, str(e)


# =============================================================
# LẤY DANH SÁCH REVIEW CỦA ĐỊA ĐIỂM (Get Location Reviews)
# Sắp xếp ưu tiên: Positive > Neutral > Negative, rồi theo rating & thời gian
# Sort priority: Positive > Neutral > Negative, then by rating & time
# =============================================================
def get_location_reviews(location_name):
    """
    Lấy danh sách review của địa điểm.
    Get list of reviews for a location.

    Returns: list[dict] chứa / containing:
        username, user_fullname, id, rating, comment, sentiment, topics, created_at
    """
    query = """
    MATCH (u:User)-[r:REVIEWED]->(l:Location {name: $l_name})
    RETURN u.name AS username, 
           u.fullname AS user_fullname,
           r.id AS id,
           r.rating AS rating, 
           r.comment AS comment, 
           r.sentiment AS sentiment,
           r.topics AS topics,
           toString(r.timestamp) AS created_at
    ORDER BY 
        CASE WHEN r.sentiment = 'Positive' THEN 3
             WHEN r.sentiment = 'Neutral' THEN 2
             ELSE 1 END DESC,
        r.rating DESC,
        r.timestamp DESC
    """
    return run_query(query, {"l_name": location_name})


# =============================================================
# XÓA ĐÁNH GIÁ (Delete Review)
# Nếu có review_id → xóa chính xác 1 review
# If review_id provided → delete exactly 1 review
# Nếu không → xóa tất cả review của user tại location đó
# If not → delete all user's reviews at that location
#
# Sau khi xóa → cập nhật :INTERACTED và tính lại rating
# After delete → update :INTERACTED and recalculate rating
# =============================================================
def delete_review(username, location_name, review_id=None):
    """
    Xóa đánh giá.
    Delete review.

    Args:
        username (str): Tên người xóa / Username of deletor
        location_name (str): Tên địa điểm / Location name
        review_id (str): ID review cụ thể (tùy chọn) / Specific review ID (optional)

    Returns:
        (success: bool, result: dict|str) — dict chứa avgRating, totalReviews
    """
    params = {"u_name": username, "l_name": location_name, "rid": review_id}

    # Bước 1: Kiểm tra review tồn tại trước khi xóa
    # Step 1: Check if review exists before deleting
    if review_id:
        check_query = """
        MATCH (u:User {name: $u_name})-[r:REVIEWED {id: $rid}]->(l:Location)
        RETURN r.id AS id, l.name AS location
        """
    else:
        check_query = """
        MATCH (u:User {name: $u_name})-[r:REVIEWED]->(l:Location {name: $l_name})
        RETURN r.id AS id, l.name AS location
        """

    existing = run_query(check_query, params)
    if not existing:
        return False, "Không tìm thấy đánh giá để xóa"

    # Bước 2: Xóa review + cập nhật :INTERACTED
    # Step 2: Delete review + update :INTERACTED
    if review_id:
        # Xóa chính xác 1 review theo ID / Delete exactly 1 review by ID
        query = """
        MATCH (u:User {name: $u_name})-[r:REVIEWED {id: $rid}]->(l:Location)
        DELETE r
        WITH u, l
        // Kiểm tra LIKED & cập nhật INTERACTED / Check LIKED & refresh INTERACTED
        OPTIONAL MATCH (u)-[like:LIKED]->(l)
        WITH u, l, like
        FOREACH (_ IN CASE WHEN like IS NOT NULL THEN [1] ELSE [] END |
            MERGE (u)-[i:INTERACTED]->(l)
            SET i.weight = 1, i.liked_score = 1, i.review_score = 0
        )
        FOREACH (_ IN CASE WHEN like IS NULL THEN [1] ELSE [] END |
            MERGE (u)-[i:INTERACTED]->(l)
            DELETE i
        )
        """
    else:
        # Fallback: Xóa tất cả review của user tại location
        # Fallback: Delete all user's reviews at location
        query = """
        MATCH (u:User {name: $u_name})-[r:REVIEWED]->(l:Location {name: $l_name})
        DELETE r
        WITH u, l
        OPTIONAL MATCH (u)-[like:LIKED]->(l)
        WITH u, l, like
        FOREACH (_ IN CASE WHEN like IS NOT NULL THEN [1] ELSE [] END |
            MERGE (u)-[i:INTERACTED]->(l)
            SET i.weight = 1, i.liked_score = 1, i.review_score = 0
        )
        FOREACH (_ IN CASE WHEN like IS NULL THEN [1] ELSE [] END |
            MERGE (u)-[i:INTERACTED]->(l)
            DELETE i
        )
        """

    # Bước 3: Tính lại rating trung bình (đồng bộ cả l.rating và l.avgRating)
    # Step 3: Recalculate average rating (sync both l.rating and l.avgRating)
    recalc_query = """
    MATCH (l:Location {name: $l_name})
    OPTIONAL MATCH (l)<-[r:REVIEWED]-(:User)
    WITH l, avg(r.rating) AS avgRating, count(r) AS totalReviews
    SET l.rating = CASE WHEN totalReviews > 0 THEN avgRating ELSE 0 END,
        l.avgRating = CASE WHEN totalReviews > 0 THEN avgRating ELSE 0 END,
        l.reviewCount = totalReviews
    RETURN avgRating, totalReviews
    """

    try:
        # Chạy trong transaction atomic / Run in atomic transaction
        results = run_write_transaction(
            [
                (query, params),
                (recalc_query, {"l_name": location_name}),
            ]
        )
        stats = results[1]  # Kết quả recalc / Recalc results
        return True, stats[0] if stats else {"avgRating": 0, "totalReviews": 0}
    except Exception as e:
        logger.error(f"Lỗi delete_review: {e}")
        return False, str(e)
