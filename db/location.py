"""
db/location.py - Các hàm xử lý Location & tương tác (like, review)
"""

import logging
from .connection import run_query, run_write_transaction

logger = logging.getLogger(__name__)


def toggle_like_location(username, location_name):
    """
    Like/Unlike một địa điểm.
    Trả về (is_liked, message)
    Tự động cập nhật :INTERACTED để thuật toán gợi ý real-time.
    """
    try:
        # 1. Kiểm tra trạng thái hiện tại
        check_query = """
        MATCH (u:User {name: $u_name})-[r:LIKED]->(l:Location {name: $l_name})
        RETURN r
        """
        existing = run_query(check_query, {"u_name": username, "l_name": location_name})

        params = {"u_name": username, "l_name": location_name}

        if existing:
            # Đã like -> Xóa (Unlike) và cập nhật :INTERACTED
            unlike_query = """
            MATCH (u:User {name: $u_name})-[r:LIKED]->(l:Location {name: $l_name})
            DELETE r
            WITH u, l
            // Kiểm tra xem còn REVIEWED không
            OPTIONAL MATCH (u)-[rev:REVIEWED]->(l)
            WITH u, l, rev
            // Nếu còn REVIEWED, cập nhật weight; nếu không, xóa INTERACTED
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
            # Chưa like -> Tạo quan hệ LIKED và cập nhật :INTERACTED
            like_query = """
            MATCH (u:User {name: $u_name})
            MATCH (l:Location {name: $l_name})
            MERGE (u)-[r:LIKED]->(l)
            SET r.timestamp = datetime()
            WITH u, l
            // Lấy rating từ REVIEWED nếu có
            OPTIONAL MATCH (u)-[rev:REVIEWED]->(l)
            WITH u, l, coalesce(rev.rating, 0) AS review_score
            // Cập nhật :INTERACTED với weight = 1 (liked) + review_score
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
    Nếu có review_id -> Update.
    Nếu không -> Create New (cho phép nhiều review).
    """
    if topics is None:
        topics = []

    # Validate rating range
    if rating is not None:
        try:
            rating = float(rating)
            rating = max(0, min(5, rating))  # Clamp 0-5
        except (ValueError, TypeError):
            rating = 0

    # Logic: Only auto-assign if rating is not provided (0 or None)
    if not rating or rating == 0:
        if sentiment == "Positive":
            rating = 5
        elif sentiment == "Negative":
            rating = 1
        else:
            rating = 3  # Neutral -> 3 sao

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
        # --- UPDATE EXISTING REVIEW ---
        query = """
        MATCH (u:User {name: $u_name})-[r:REVIEWED {id: $review_id}]->(l:Location)
        SET r.rating = $rating, 
            r.comment = $comment, 
            r.sentiment = $sentiment,
            r.topics = $topics,
            r.updated_at = datetime()
        WITH u, l, $rating AS review_score
        
        // Cập nhật quan hệ INTERACTED
        MERGE (u)-[i:INTERACTED]->(l)
        SET i.weight = 1 + review_score,
            i.review_score = review_score
        """
    else:
        # --- CREATE NEW REVIEW ---
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
        
        // Tự động LIKE
        MERGE (u)-[like:LIKED]->(l)
        ON CREATE SET like.timestamp = datetime(), like.auto_from_review = true
        
        // Cập nhật :INTERACTED
        MERGE (u)-[i:INTERACTED]->(l)
        SET i.weight = 1 + review_score,
            i.liked_score = 1,
            i.review_score = review_score,
            i.created_at = datetime()
        """

    # Sau đó tính lại rating trung bình (đồng bộ cả l.rating và l.avgRating)
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
        results = run_write_transaction(
            [
                (query, params),
                (recalc_query, {"l_name": location_name}),
            ]
        )
        stats = results[1]  # Kết quả của recalc_query
        return True, stats[0] if stats else None
    except Exception as e:
        logger.error(f"Lỗi add_review: {e}")
        return False, str(e)


def get_location_reviews(location_name):
    """
    Lấy danh sách review của địa điểm
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


def delete_review(username, location_name, review_id=None):
    """
    Xóa đánh giá. Nếu có review_id thì xóa chính xác, không thì xóa hết của user tại location đó.
    Trả về (success, result_dict) với result_dict chứa thống kê hoặc thông báo lỗi.
    """
    params = {"u_name": username, "l_name": location_name, "rid": review_id}

    # Bước 1: Kiểm tra review tồn tại trước khi xóa
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

    # Bước 2: Xóa review
    if review_id:
        query = """
        MATCH (u:User {name: $u_name})-[r:REVIEWED {id: $rid}]->(l:Location)
        DELETE r
        WITH u, l
        // Check LIKED & Refresh INTERACTED
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
        # Fallback cũ: Xóa hết
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

    # Tính lại rating (đồng bộ cả l.rating và l.avgRating)
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
        # Chạy trong transaction atomic
        results = run_write_transaction(
            [
                (query, params),
                (recalc_query, {"l_name": location_name}),
            ]
        )
        stats = results[1]  # Kết quả recalc
        return True, stats[0] if stats else {"avgRating": 0, "totalReviews": 0}
    except Exception as e:
        logger.error(f"Lỗi delete_review: {e}")
        return False, str(e)
