from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
from db import (
    run_query,
    toggle_like_location,
    add_review,
    get_location_reviews,
    delete_review,
    generate_itinerary,
    get_user_likes,
    get_user_reviews,
    get_user_itineraries,
    save_user_itinerary,
    delete_user_itinerary,
)
from utils import analyze_sentiment, classify_comment_topic

bp = Blueprint("api", __name__)


# --- 2. API: LẤY DANH SÁCH ĐỊA ĐIỂM (CÓ LỌC) ---
@bp.route("/api/locations", methods=["GET"])
def get_locations():
    category_filter = request.args.get("category")
    print(f"DEBUG: Filtering locations by category: '{category_filter}'")

    query = """
    MATCH (l:Location)
    OPTIONAL MATCH (l)-[:HAS_CATEGORY]->(cat:Category)
    """

    params = {}  # Tạo dictionary chứa tham số
    if category_filter and category_filter != "All":
        # Sử dụng CONTAINS để tìm kiếm linh hoạt hơn (và trim khoảng trắng)
        query += " WHERE toLower(cat.name) CONTAINS toLower($cat_name) "
        params["cat_name"] = category_filter.strip()

    query += """
    RETURN l.name AS name,
           l.desc AS description,
           l.lat AS lat, l.lng AS lng,
           l.image AS image, 
           collect(cat.name)[0] AS category,
           (coalesce(l.pagerankNorm, 0) * 0.6 + 
            coalesce(l.pagerankConnectNorm, 0) * 0.3 + 
            (coalesce(l.avgRating, 0) / 5.0) * 0.1) AS score
    ORDER BY score DESC           
    """

    try:
        data = run_query(query, params)
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# --- 3. API: LẤY LỊCH SỬ NGƯỜI DÙNG (MỚI) ---
@bp.route("/api/history/<user_name>", methods=["GET"])
def get_user_history(user_name):
    query = """
    MATCH (u:User {name: $name})-[:LIKED]->(l:Location)
    RETURN l.name AS name, 
           l.image AS image, 
           l.lat AS lat, 
           l.lng AS lng
    LIMIT 10
    """
    try:
        results = run_query(query, {"name": user_name})
        return jsonify(results)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# --- 4. API: GỢI Ý THÔNG MINH (CORE AI) - V2.0 với Interaction Weighting ---
@bp.route("/api/recommend/<user_name>", methods=["GET"])
def recommend(user_name):
    """
    CHIẾN THUẬT: HYBRID RECOMMENDATION V2.0 với 3 thành phần chính:
    1. PERSONALIZED RATING (x5)
    2. COLLABORATIVE FILTERING (x3)
    3. GLOBAL PAGERANK (x10)
    """

    cypher_query = """
    MATCH (me:User {name: $name})
    
    // BƯỚC 1: COLLABORATIVE FILTERING với SIMILARITY SCORE
    // Sử dụng quan hệ SIMILAR_TO (Jaccard) thay vì chỉ đếm
    OPTIONAL MATCH (me)-[sim:SIMILAR_TO]-(other:User)
    WHERE other <> me
    OPTIONAL MATCH (other)-[their_int:INTERACTED]->(l_collab:Location)
    WHERE NOT (me)-[:INTERACTED]->(l_collab) AND NOT (me)-[:LIKED]->(l_collab)
    WITH me, l_collab, 
         count(DISTINCT other) AS num_similar_users,
         avg(their_int.weight) AS avg_weight,
         avg(sim.score) AS avg_similarity  // Điểm Jaccard similarity
    WITH me, 
         collect({
             loc: l_collab, 
             // Công thức mới: kết hợp số users + trọng số + similarity
             score: num_similar_users * coalesce(avg_weight, 1) * (1 + coalesce(avg_similarity, 0)),
             type: 'collab',
             common_users: num_similar_users,
             similarity: coalesce(avg_similarity, 0)
         }) AS collab_list

    // BƯỚC 2: CONTENT-BASED FILTERING
    OPTIONAL MATCH (me)-[:INTERACTED]->(liked_loc:Location)
    OPTIONAL MATCH (liked_loc)-[:HAS_CATEGORY]->(cat:Category)<-[:HAS_CATEGORY]-(l_content:Location)
    WHERE NOT (me)-[:INTERACTED]->(l_content) AND NOT (me)-[:LIKED]->(l_content)
    OPTIONAL MATCH (liked_loc)-[r:RELATED_TO]-(l_content)
    WITH me, collab_list, l_content, 
         sum(1 + coalesce(r.weight, 0)) AS score_content
    WITH me, collab_list,
         collect({loc: l_content, score: score_content, type: 'content'}) AS content_list

    // BƯỚC 3: GỘP CANDIDATES VÀ TÍNH ĐIỂM CUỐI CÙNG
    WITH me, collab_list + content_list AS all_candidates
    UNWIND all_candidates AS c
    WITH me, c.loc AS l, c.score AS s, c.type AS t, 
         CASE WHEN c.common_users IS NOT NULL THEN c.common_users ELSE 0 END AS common
    WHERE l IS NOT NULL
    AND NOT (me)-[:INTERACTED]->(l) AND NOT (me)-[:LIKED]->(l)
    
    WITH me, l,
         sum(CASE WHEN t = 'collab' THEN s ELSE 0 END) AS score_collab_raw,
         sum(CASE WHEN t = 'content' THEN s ELSE 0 END) AS score_content_raw,
         max(common) AS common_users

    OPTIONAL MATCH (l)-[:HAS_CATEGORY]->(cat_node:Category)
    OPTIONAL MATCH ()-[all_reviews:REVIEWED]->(l)
    WITH me, l, collect(cat_node.name)[0] as category, score_collab_raw, score_content_raw, common_users,
         avg(all_reviews.rating) AS avg_rating,
         count(all_reviews) AS review_count

    WITH l, category, common_users, avg_rating, review_count,
         score_collab_raw * 3.0 AS final_collab,
         score_content_raw * 1.0 AS final_content,
         (coalesce(l.pagerankNorm, 0) * 0.6 + 
          coalesce(l.pagerankConnectNorm, 0) * 0.3 + 
          (coalesce(avg_rating, l.rating, 0) / 5.0) * 0.1) * 10.0 AS final_pagerank
    
    WITH l, category, common_users, avg_rating, review_count,
         final_collab, final_content, final_pagerank,
         (final_collab + final_content + final_pagerank) AS final_score

    RETURN l.name AS name, 
           l.desc AS description, 
           coalesce(avg_rating, l.rating, 0) AS rating,
           l.lat AS lat,      
           l.lng AS lng,
           l.image AS image, 
           category,
           coalesce(l.pagerankNorm, 0) AS score,
           review_count AS reviewCount,
           final_score,
           common_users,
           0 AS score_personal,
           final_collab AS score_collab,
           final_content AS score_content,
           final_pagerank AS score_pagerank
           
    ORDER BY final_score DESC
    LIMIT 12
    """
    try:
        results = run_query(cypher_query, {"name": user_name})

        # Fallback for New Users (Cold Start)
        if not results:
            fallback_query = """
            OPTIONAL MATCH (me:User {name: $name})-[:LIKED|INTERACTED]->(liked:Location)
            WITH collect(liked) AS liked_locations
            MATCH (l:Location)
            WHERE NOT l IN liked_locations
            OPTIONAL MATCH (l)-[:HAS_CATEGORY]->(cat:Category)
            OPTIONAL MATCH ()-[r:REVIEWED]->(l)
            WITH l, cat, avg(r.rating) AS avg_rating, count(r) AS review_count
            RETURN l.name AS name, l.desc AS description, 
                   coalesce(avg_rating, l.rating, 0) AS rating, 
                   l.lat AS lat, l.lng AS lng, l.image as image, collect(cat.name)[0] as category,
                   (coalesce(l.pagerankNorm, 0) * 0.6 + 
                    coalesce(l.pagerankConnectNorm, 0) * 0.3 + 
                    (coalesce(avg_rating, l.rating, 0) / 5.0) * 0.1) AS score,
                   review_count AS reviewCount,
                   (coalesce(l.pagerankNorm, 0) * 0.6 + 
                    coalesce(l.pagerankConnectNorm, 0) * 0.3 + 
                    (coalesce(avg_rating, l.rating, 0) / 5.0) * 0.1) * 10.0 AS final_score,
                   0 as common_users, 0 as score_personal, 0 as score_collab, 0 as score_content,
                   (coalesce(l.pagerankNorm, 0) * 0.6 + 
                    coalesce(l.pagerankConnectNorm, 0) * 0.3 + 
                    (coalesce(avg_rating, l.rating, 0) / 5.0) * 0.1) * 10.0 AS score_pagerank
            ORDER BY final_score DESC
            LIMIT 12
            """
            results = run_query(fallback_query, {"name": user_name})

        processed_results = []
        for loc in results or []:
            s_collab = loc.get("score_collab", 0) or 0
            s_content = loc.get("score_content", 0) or 0
            s_pagerank = loc.get("score_pagerank", 0) or 0
            common_users = loc.get("common_users", 0) or 0

            # Calculate percentages
            total = s_collab + s_content + s_pagerank  # Personal removed
            if total > 0:
                pct_collab = (s_collab / total) * 100
                pct_content = (s_content / total) * 100
                pct_pagerank = (s_pagerank / total) * 100
            else:
                pct_collab = pct_content = pct_pagerank = 0

            reason = ""
            reason_icon = "🤖"
            reason_type = "default"

            if s_collab > 0.5 and common_users >= 1:
                reason = f"{int(common_users)} người có sở thích giống bạn đã thích địa điểm này"
                reason_icon = "👥"
                reason_type = "collab"
            elif s_content > 0.1:
                cat = loc.get("category", "").lower()
                icon_map = {
                    "thực": "🍜",
                    "uống": "☕",
                    "chùa": "🛕",
                    "thờ": "🛕",
                    "biển": "🏖️",
                    "thiên nhiên": "🌳",
                    "lăng": "🏯",
                    "di tích": "🏛️",
                    "chợ": "🛍️",
                }
                reason_icon = "🎯"
                for k, v in icon_map.items():
                    if k in cat:
                        reason_icon = v
                        break
                reason = f"Gợi ý phù hợp vì bạn hay ghé {loc.get('category', '')}"
                reason_type = "content"
            elif s_pagerank > 0:
                reason = "Địa điểm đang rất Hot trong cộng đồng du lịch Huế"
                reason_icon = "🔥"
                reason_type = "pagerank"
            else:
                reason = "Được gợi ý bởi hệ thống AI"
                reason_icon = "🤖"
                reason_type = "default"

            # Create details
            reason_details = {
                "personal": {
                    "score": 0,
                    "percent": 0,
                    "label": "Personalized Rating",
                    "desc": "Đánh giá cá nhân của bạn",
                },
                "collab": {
                    "score": round(s_collab, 2),
                    "percent": round(pct_collab, 1),
                    "label": "Collaborative Filtering",
                    "desc": f"{int(common_users)} người dùng tương đồng",
                },
                "content": {
                    "score": round(s_content, 2),
                    "percent": round(pct_content, 1),
                    "label": "Content-based",
                    "desc": "Tương tự địa điểm đã thích",
                },
                "pagerank": {
                    "score": round(s_pagerank, 2),
                    "percent": round(pct_pagerank, 1),
                    "label": "PageRank",
                    "desc": "Độ nổi tiếng toàn hệ thống",
                },
            }

            loc["reason"] = reason
            loc["reason_icon"] = reason_icon
            loc["reason_type"] = reason_type
            loc["reason_details"] = reason_details
            processed_results.append(loc)

        return jsonify(processed_results)
    except Exception as e:
        print(f"❌ Lỗi Recommend: {e}")
        return jsonify({"error": str(e)}), 500


@bp.route("/api/like", methods=["POST"])
@login_required
def api_toggle_like():
    data = request.json
    location_name = data.get("location_name")

    if not location_name:
        return jsonify({"error": "Thiếu tên địa điểm"}), 400

    is_liked, msg = toggle_like_location(current_user.id, location_name)
    return jsonify({"liked": is_liked, "message": msg}), 200


@bp.route("/api/review", methods=["POST"])
@login_required
def api_add_review():
    data = request.json
    loc_name = data.get("location_name")
    rating = data.get("rating")
    comment = data.get("comment", "")
    review_id = data.get("review_id")  # New Optional ID for editing

    # Allow rating to be 0, so check explicitly for None if needed, but 'rating' comes from json .get()
    if not loc_name:
        return jsonify({"error": "Thiếu thông tin địa điểm"}), 400

    if rating is None:
        rating = 0

    sentiment = analyze_sentiment(comment)
    topics = classify_comment_topic(comment)
    success, result = add_review(
        current_user.id, loc_name, rating, comment, sentiment, review_id, topics
    )

    if success:
        return (
            jsonify(
                {
                    "success": True,
                    "message": "Đánh giá thành công!",
                    "stats": result,
                    "sentiment": sentiment,
                }
            ),
            200,
        )
    else:
        return jsonify({"success": False, "error": result}), 500


@bp.route("/api/reviews/<location_name>", methods=["GET"])
def api_get_reviews(location_name):
    reviews = get_location_reviews(location_name)
    return jsonify(reviews if reviews else [])


@bp.route("/api/review", methods=["DELETE"])
@login_required
def api_delete_review():
    data = request.json
    loc_name = data.get("location_name")
    review_id = data.get("review_id")

    if not loc_name:
        return jsonify({"error": "Thiếu tên địa điểm"}), 400
    success, result = delete_review(current_user.id, loc_name, review_id)
    if success:
        return (
            jsonify({"success": True, "message": "Đã xóa đánh giá!", "stats": result}),
            200,
        )
    else:
        return jsonify({"success": False, "error": result}), 500


@bp.route("/api/similar/<location_name>", methods=["GET"])
def get_similar_locations(location_name):
    """
    Tìm địa điểm tương tự sử dụng:
    1. LOC_SIMILAR (Jaccard Similarity) nếu có
    2. Fallback: cùng Category
    """
    # Query ưu tiên LOC_SIMILAR (được tính từ setup_algo.py)
    query = """
    MATCH (current:Location {name: $name})
    
    // Tìm các địa điểm tương tự qua quan hệ LOC_SIMILAR (được tạo bởi GDS Node Similarity)
    OPTIONAL MATCH (current)-[sim:LOC_SIMILAR]-(similar:Location)
    
    // Lấy category của địa điểm tương tự
    OPTIONAL MATCH (similar)-[:HAS_CATEGORY]->(cat_node:Category)
    
    WITH similar, sim, collect(cat_node.name)[0] as category
    WHERE similar IS NOT NULL
    
    RETURN similar.name AS name,
           similar.desc AS description,
           similar.lat AS lat,
           similar.lng AS lng,
           similar.image AS image,
           coalesce(similar.avgRating, similar.rating, 0) AS rating,
           category,
           (coalesce(similar.pagerankNorm, 0) * 0.6 + 
            coalesce(similar.pagerankConnectNorm, 0) * 0.3 + 
            (coalesce(similar.avgRating, 0) / 5.0) * 0.1) AS score,
           coalesce(sim.score, 0) AS similarity
    ORDER BY similarity DESC, score DESC
    LIMIT 6
    """
    try:
        results = run_query(query, {"name": location_name})

        # Fallback: Nếu không có LOC_SIMILAR, dùng Category
        if not results:
            fallback_query = """
            MATCH (current:Location {name: $name})-[:HAS_CATEGORY]->(cat:Category)
            MATCH (similar:Location)-[:HAS_CATEGORY]->(cat)
            WHERE similar.name <> $name
            WITH similar, collect(cat.name)[0] as category
            RETURN similar.name AS name,
                   similar.desc AS description,
                   similar.lat AS lat,
                   similar.lng AS lng,
                   similar.image AS image,
                   similar.rating AS rating,
                   category,
                   coalesce(similar.pagerankNorm, 0) AS score,
                   0 AS similarity
            ORDER BY score DESC
            LIMIT 6
            """
            results = run_query(fallback_query, {"name": location_name})

        return jsonify(results if results else [])
    except Exception as e:
        print(f"❌ Lỗi get_similar_locations: {e}")
        return jsonify({"error": str(e)}), 500


@bp.route("/api/similar-users/<username>", methods=["GET"])
def get_similar_users(username):
    """
    Lấy danh sách users tương tự dựa trên Jaccard Similarity.
    Được tính bởi setup_algo.py (Neo4j GDS nodeSimilarity)
    """
    query = """
    MATCH (me:User {name: $name})-[sim:SIMILAR_TO]-(other:User)
    
    // Lấy thông tin về địa điểm chung
    OPTIONAL MATCH (me)-[:INTERACTED]->(common:Location)<-[:INTERACTED]-(other)
    
    WITH other, sim.score AS similarity, collect(common.name) AS common_locations
    
    RETURN other.name AS username,
           round(similarity * 100, 1) AS similarity_percent,
           size(common_locations) AS common_count,
           common_locations[0..3] AS sample_locations
    ORDER BY similarity DESC
    LIMIT 10
    """
    try:
        results = run_query(query, {"name": username})
        return jsonify(
            {
                "success": True,
                "user": username,
                "similar_users": results if results else [],
                "algorithm": "Jaccard Similarity (Neo4j GDS)",
            }
        )
    except Exception as e:
        print(f"❌ Lỗi get_similar_users: {e}")
        return jsonify({"error": str(e)}), 500


# ==========================================================
# 6. AI PLANNER API
# ==========================================================
@bp.route("/api/planner/generate", methods=["POST"])
def api_generate_itinerary():
    data = request.json
    username = current_user.id if current_user.is_authenticated else "Guest"

    days = int(data.get("days", 1))
    preferences = data.get("preferences", [])
    use_liked = data.get("use_liked", False)

    if days < 1:
        days = 1
    if days > 5:
        days = 5

    # Kiểm tra trước: Nếu user chọn "Từ danh sách đã thích", kiểm tra xem có địa điểm nào không
    if use_liked and current_user.is_authenticated:
        from db import get_user_likes

        likes = get_user_likes(username)
        if not likes or len(likes) == 0:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Bạn chưa thích địa điểm nào! Hãy thả tim ❤️ một vài nơi trước, hoặc chọn chế độ 'AI gợi ý mới'.",
                        "error_type": "no_likes",
                    }
                ),
                400,
            )

    try:
        plan = generate_itinerary(username, days, preferences, use_liked=use_liked)

        # Kiểm tra xem plan có rỗng không
        if not plan or all(len(day.get("activities", [])) == 0 for day in plan):
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Không tìm thấy địa điểm phù hợp với tiêu chí bạn chọn. Hãy thử bỏ bớt bộ lọc.",
                        "error_type": "no_results",
                    }
                ),
                400,
            )

        return jsonify({"success": True, "plan": plan})
    except ValueError as e:
        # Lỗi validation (thiếu likes, etc.)
        print(f"Planner Validation Error: {e}")
        return (
            jsonify({"success": False, "error": str(e), "error_type": "validation"}),
            400,
        )
    except Exception as e:
        print(f"Planner Error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/api/planner/suggest-replacement", methods=["POST"])
def api_suggest_replacement():
    """Gợi ý địa điểm thay thế cho một activity trong lộ trình"""
    data = request.json
    exclude_names = data.get("exclude", [])  # Danh sách địa điểm đã dùng
    activity_type = data.get("type", "visit")  # "visit" hoặc "food"
    category = data.get("category", "")

    # Xây dựng query
    food_keywords = [
        "ẩm thực",
        "bún",
        "chè",
        "cơm",
        "bánh",
        "cafe",
        "cà phê",
        "quán",
        "nhà hàng",
        "chợ",
    ]

    if activity_type == "food":
        # Tìm địa điểm ăn uống
        category_filter = " OR ".join(
            [f"toLower(cat.name) CONTAINS '{kw}'" for kw in food_keywords]
        )
        query = f"""
        MATCH (l:Location)
        OPTIONAL MATCH (l)-[:HAS_CATEGORY]->(cat:Category)
        WHERE NOT l.name IN $exclude
        AND ({category_filter})
        WITH l, cat, coalesce(l.pagerankNorm, 0) as score, rand() as r
        // Lấy top 10 rồi chọn ngẫu nhiên (có trọng số)
        ORDER BY (score * 0.3 + r * 0.7) DESC
        LIMIT 1
        RETURN l.name as name, cat.name as category, 
               l.lat as lat, l.lng as lng, l.image as image, l.desc as description,
               score
        """
    else:
        # Tìm địa điểm tham quan (không phải ăn uống)
        food_exclude = " AND ".join(
            [f"NOT toLower(cat.name) CONTAINS '{kw}'" for kw in food_keywords]
        )
        query = f"""
        MATCH (l:Location)
        OPTIONAL MATCH (l)-[:HAS_CATEGORY]->(cat:Category)
        WHERE NOT l.name IN $exclude
        AND ({food_exclude} OR cat IS NULL)
        WITH l, cat, coalesce(l.pagerankNorm, 0) as score, rand() as r
        // Lấy ngẫu nhiên có trọng số (70% random + 30% score)
        ORDER BY (score * 0.3 + r * 0.7) DESC
        LIMIT 1
        RETURN l.name as name, cat.name as category, 
               l.lat as lat, l.lng as lng, l.image as image, l.desc as description,
               score
        """

    try:
        result = run_query(query, {"exclude": exclude_names})
        if result and len(result) > 0:
            return jsonify({"success": True, "location": result[0]})
        else:
            return jsonify(
                {"success": False, "error": "Không còn địa điểm phù hợp để thay thế."}
            )
    except Exception as e:
        print(f"Replacement Error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/api/user/activity")
@login_required
def api_user_activity():
    username = current_user.id
    try:
        likes = get_user_likes(username)
        reviews = get_user_reviews(username)
        return jsonify({"success": True, "likes": likes, "reviews": reviews})
    except Exception as e:
        print(f"Error fetching user activity: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/api/itineraries", methods=["GET"])
@login_required
def api_get_itineraries():
    data = get_user_itineraries(current_user.id)
    return jsonify({"success": True, "data": data})


@bp.route("/api/itineraries", methods=["POST"])
@login_required
def api_save_itinerary():
    data = request.json
    itinerary = data.get("itinerary")
    if not itinerary:
        return jsonify({"error": "Dữ liệu trống"}), 400

    success, msg = save_user_itinerary(current_user.id, itinerary)
    if success:
        return jsonify({"success": True, "message": msg})
    else:
        return jsonify({"success": False, "error": msg}), 500


@bp.route("/api/itineraries/<id>", methods=["DELETE"])
@login_required
def api_delete_itinerary(id):
    delete_user_itinerary(current_user.id, id)
    return jsonify({"success": True})
