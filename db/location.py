"""
db/location.py - Các hàm xử lý Location & tương tác (like, review)
"""

from .connection import run_query


def toggle_like_location(username, location_name):
    """
    Like/Unlike một địa điểm.
    Trả về (is_liked, message)
    Tự động cập nhật :INTERACTED để thuật toán gợi ý real-time.
    """
    # 1. Kiểm tra trạng thái hiện tại
    check_query = """
    MATCH (u:User {name: $u_name})-[r:LIKED]->(l:Location {name: $l_name})
    RETURN r
    """
    existing = run_query(check_query, {"u_name": username, "l_name": location_name})

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
        run_query(unlike_query, {"u_name": username, "l_name": location_name})
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
        run_query(like_query, {"u_name": username, "l_name": location_name})
        return True, "Đã thích địa điểm"


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

    # Sau đó tính lại rating trung bình
    recalc_query = """
    MATCH (l:Location {name: $l_name})<-[r:REVIEWED]-(:User)
    WITH l, avg(r.rating) AS avgRating, count(r) AS totalReviews
    SET l.rating = avgRating, l.reviewCount = totalReviews
    RETURN avgRating, totalReviews
    """

    try:
        run_query(query, params)
        stats = run_query(recalc_query, {"l_name": location_name})
        return True, stats[0] if stats else None
    except Exception as e:
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
    """
    params = {"u_name": username, "l_name": location_name, "rid": review_id}

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

    # Tính lại rating
    recalc_query = """
    MATCH (l:Location {name: $l_name})
    OPTIONAL MATCH (l)<-[r:REVIEWED]-(:User)
    WITH l, avg(r.rating) AS avgRating, count(r) AS totalReviews
    SET l.rating = CASE WHEN totalReviews > 0 THEN avgRating ELSE 0 END, 
        l.reviewCount = totalReviews
    RETURN avgRating, totalReviews
    """

    try:
        run_query(query, params)
        stats = run_query(recalc_query, {"l_name": location_name})
        return True, stats[0] if stats else {"avgRating": 0, "totalReviews": 0}
    except Exception as e:
        return False, str(e)
