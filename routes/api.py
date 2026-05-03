"""
=============================================================================
routes/api.py - API chính của ứng dụng (Core Application APIs)
routes/api.py - Core Application APIs
=============================================================================
Mô tả / Description:
    File API lớn nhất — chứa tất cả endpoint dữ liệu chính:
    Largest API file — contains all main data endpoints:

    1. Locations: Lấy danh sách địa điểm (hỗ trợ lọc theo category).
       Locations: Get location list (supports category filtering).
    2. History: Xem lịch sử tương tác (địa điểm đã thích).
       History: View interaction history (liked locations).
    3. Recommend (CORE AI): Gợi ý thông minh Hybrid v2.0
       Recommend (CORE AI): Smart Hybrid Recommendation v2.0
       - Collaborative Filtering: Tìm user tương đồng qua Jaccard Similarity
       - Content-Based Filtering: Gợi ý theo category đã thích
       - PageRank Diversity Pool: Top địa điểm nổi bật
       - Explainable AI: Giải thích chi tiết lý do gợi ý
    4. Like: Thích/Bỏ thích địa điểm (toggle).
       Like: Like/Unlike location (toggle).
    5. Reviews: CRUD đánh giá + tự động phân tích cảm xúc.
       Reviews: Review CRUD + auto sentiment analysis.
    6. Similar: Tìm địa điểm/user tương tự (Jaccard).
       Similar: Find similar locations/users (Jaccard).
    7. AI Planner: Tạo lộ trình + gợi ý thay thế hoạt động.
       AI Planner: Generate itinerary + suggest activity replacements.
    8. User Activity: Tổng hợp hoạt động (likes, reviews).
       User Activity: Aggregate activity (likes, reviews).
    9. Itineraries: CRUD lộ trình đã lưu.
       Itineraries: Saved itinerary CRUD.

Phụ thuộc / Dependencies:
    - Flask, Flask-Login
    - db (run_query, toggle_like_location, add_review, generate_itinerary, ...)
    - utils (analyze_sentiment, classify_comment_topic)

Bảo mật / Security:
    - API có /api/ prefix → trả JSON 401 nếu chưa đăng nhập.
      APIs with /api/ prefix → return JSON 401 if not logged in.
    - Kiểm tra quyền sở hữu dữ liệu (chỉ xem dữ liệu của mình).
      Checks data ownership (can only view own data).
    - Admin có thể xóa review của bất kỳ user nào.
      Admin can delete any user's review.
=============================================================================
"""

from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
import logging
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

logger = logging.getLogger(__name__)

# Đăng ký Blueprint "api" — xử lý tất cả API dữ liệu
# Register "api" Blueprint — handles all data APIs
bp = Blueprint("api", __name__)


# =============================================================
# 1. API: LẤY DANH SÁCH ĐỊA ĐIỂM (Get Locations — có lọc theo Category)
# GET /api/locations?category=<category_name>
#
# Công thức tính điểm hiển thị (Display Score):
# Display Score formula:
#   score = PageRank_Norm * 0.6
#         + PageRank_Connect_Norm * 0.3
#         + (AvgRating / 5.0) * 0.1
#
# Sắp xếp: Theo score giảm dần → rồi theo khoảng cách đến trung tâm Huế
# Sorting: By score DESC → then by distance to Hue center
# =============================================================
@bp.route("/api/locations", methods=["GET"])
def get_locations():
    category_filter = request.args.get("category")
    logger.debug(f"Filtering locations by category: '{category_filter}'")

    query = """
    MATCH (l:Location)
    OPTIONAL MATCH (l)-[:HAS_CATEGORY]->(cat:Category)
    """

    params = {}  # Dictionary chứa tham số / Parameter dictionary
    if category_filter and category_filter != "All":
        # Sử dụng CONTAINS để tìm kiếm linh hoạt (và trim khoảng trắng)
        # Uses CONTAINS for flexible search (with whitespace trimming)
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
    ORDER BY score DESC, point.distance(point({latitude: l.lat, longitude: l.lng}), point({latitude: 16.4698, longitude: 107.5784})) ASC           
    """

    try:
        data = run_query(query, params)
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =============================================================
# 2. API: LẤY LỊCH SỬ TƯƠNG TÁC (Get User History)
# GET /api/history/<user_name>
# Bảo mật: Chỉ cho phép xem lịch sử của chính mình
# Security: Only allows viewing own history
# =============================================================
@bp.route("/api/history/<user_name>", methods=["GET"])
@login_required
def get_user_history(user_name):
    # Kiểm tra quyền sở hữu / Verify ownership
    if current_user.id != user_name:
        return jsonify({"error": "Không có quyền truy cập"}), 403

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


# =============================================================
# 3. API: GỢI Ý THÔNG MINH — HYBRID RECOMMENDATION V2.0 (CORE AI)
# GET /api/recommend/<user_name>
#
# Chiến lược 3-tầng / 3-Layer Strategy:
# ┌─────────────────────────────────────────────────────────┐
# │ Layer 1: COLLABORATIVE FILTERING (Weight: x3)          │
# │   Tìm user tương đồng (SIMILAR_TO) bằng Jaccard       │
# │   → Lấy địa điểm họ đã thích mà user chưa ghé        │
# │   Find similar users (SIMILAR_TO) via Jaccard          │
# │   → Get places they liked that user hasn't visited     │
# ├─────────────────────────────────────────────────────────┤
# │ Layer 2: CONTENT-BASED FILTERING (Weight: x1)          │
# │   Lấy category của địa điểm user đã thích             │
# │   → Tìm địa điểm cùng category chưa ghé              │
# │   Get categories from user's liked places              │
# │   → Find unvisited places in same categories           │
# ├─────────────────────────────────────────────────────────┤
# │ Layer 3: PAGERANK DIVERSITY POOL (Weight: x10)         │
# │   Top 20 địa điểm nổi tiếng nhất (tránh kẹt category) │
# │   Top 20 most popular places (avoid category trap)     │
# └─────────────────────────────────────────────────────────┘
#
# Kết quả được merge và tính final_score để xếp hạng.
# Results are merged and final_score is computed for ranking.
#
# EXPLAINABLE AI: Mỗi gợi ý kèm theo:
# EXPLAINABLE AI: Each suggestion includes:
#   - reason: Lý do chính (text) / Main reason (text)
#   - reason_icon: Emoji tương ứng / Corresponding emoji
#   - reason_type: collab | content | pagerank | default
#   - reason_details: {personal, collab, content, pagerank, chart}
#                     Dữ liệu chi tiết cho UI Breakdown
#                     Detailed data for UI Breakdown
# =============================================================
@bp.route("/api/recommend/<user_name>", methods=["GET"])
@login_required
def recommend(user_name):
    # Bảo mật: Chỉ xem gợi ý của chính mình
    # Security: Only view own recommendations
    if current_user.id != user_name:
        return jsonify({"error": "Không có quyền truy cập"}), 403

    """
    CHIẾN THUẬT: HYBRID RECOMMENDATION V2.0 với 3 thành phần chính:
    STRATEGY: HYBRID RECOMMENDATION V2.0 with 3 main components:
    1. PERSONALIZED RATING (x5)
    2. COLLABORATIVE FILTERING (x3)
    3. GLOBAL PAGERANK (x10)
    """

    cypher_query = """
    MATCH (me:User {name: $name})
    
    // ═══════════════════════════════════════════════════════
    // BƯỚC 1: COLLABORATIVE FILTERING với SIMILARITY SCORE
    // STEP 1: COLLABORATIVE FILTERING with SIMILARITY SCORE
    // Sử dụng quan hệ SIMILAR_TO (Jaccard) thay vì chỉ đếm
    // Uses SIMILAR_TO relationship (Jaccard) instead of just counting
    // ═══════════════════════════════════════════════════════
    OPTIONAL MATCH (me)-[sim:SIMILAR_TO]->(other:User)
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
             // Công thức: số_users × trọng_số × (1 + similarity)
             // Formula: num_users × weight × (1 + similarity)
             score: num_similar_users * coalesce(avg_weight, 1) * (1 + coalesce(avg_similarity, 0)),
             type: 'collab',
             common_users: num_similar_users,
             similarity: coalesce(avg_similarity, 0)
         }) AS collab_list

    // ═══════════════════════════════════════════════════════
    // BƯỚC 2: CONTENT-BASED FILTERING
    // STEP 2: CONTENT-BASED FILTERING
    // Tìm địa điểm cùng category với nơi user đã tương tác
    // Find locations in same category as user's interacted places
    // ═══════════════════════════════════════════════════════
    OPTIONAL MATCH (me)-[:INTERACTED]->(liked_loc:Location)
    OPTIONAL MATCH (liked_loc)-[:HAS_CATEGORY]->(cat:Category)<-[:HAS_CATEGORY]-(l_content:Location)
    WHERE NOT (me)-[:INTERACTED]->(l_content) AND NOT (me)-[:LIKED]->(l_content)
    OPTIONAL MATCH (liked_loc)-[r:RELATED_TO]-(l_content)
    WITH me, collab_list, l_content, 
         sum(1 + coalesce(r.weight, 0)) AS score_content
    WITH me, collab_list,
         collect({loc: l_content, score: score_content, type: 'content'}) AS content_list

    // ═══════════════════════════════════════════════════════
    // BƯỚC 2.5: PAGERANK DIVERSITY POOL (Đa dạng hóa kết quả)
    // STEP 2.5: PAGERANK DIVERSITY POOL (Result diversification)
    // Top 20 nổi tiếng nhất → tránh kẹt trong 1 category
    // Top 20 most popular → avoid getting stuck in 1 category
    // ═══════════════════════════════════════════════════════
    WITH me, collab_list, content_list
    MATCH (l_global:Location)
    WHERE NOT (me)-[:INTERACTED]->(l_global) AND NOT (me)-[:LIKED]->(l_global)
    WITH me, collab_list, content_list, l_global
    ORDER BY coalesce(l_global.pagerankNorm, 0) DESC
    LIMIT 20
    WITH me, collab_list, content_list,
         collect({loc: l_global, score: 0, type: 'pagerank', common_users: 0, similarity: 0}) AS pagerank_list

    // ═══════════════════════════════════════════════════════
    // BƯỚC 3: GỘP TẤT CẢ & TÍNH ĐIỂM CUỐI CÙNG
    // STEP 3: MERGE ALL & COMPUTE FINAL SCORE
    // ═══════════════════════════════════════════════════════
    WITH me, collab_list + content_list + pagerank_list AS all_candidates
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

    // Áp trọng số cuối cùng (sử dụng log10 để tránh điểm quá cao lấn át PageRank)
    // Apply final weights (using log10 to prevent overpowering PageRank)
    WITH l, category, common_users, avg_rating, review_count, score_collab_raw, score_content_raw,
         (coalesce(l.pagerankNorm, 0) * 0.6 + 
          coalesce(l.pagerankConnectNorm, 0) * 0.3 + 
          (coalesce(avg_rating, l.avgRating, l.rating, 0) / 5.0) * 0.1) * 10.0 AS final_pagerank
    
    WITH l, category, common_users, avg_rating, review_count, final_pagerank,
         log10(1 + score_collab_raw) * 4.0 AS final_collab,
         log10(1 + score_content_raw) * 3.0 AS final_content

    WITH l, category, common_users, avg_rating, review_count,
         final_collab, final_content, final_pagerank,
         (final_collab + final_content + final_pagerank) AS final_score

    RETURN l.name AS name, 
           l.desc AS description, 
           coalesce(avg_rating, l.avgRating, l.rating, 0) AS rating,
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
           
    ORDER BY final_score DESC, point.distance(point({latitude: l.lat, longitude: l.lng}), point({latitude: 16.4698, longitude: 107.5784})) ASC
    LIMIT 12
    """
    try:
        # ─── PRE-CHECK: User có tương tác nào không? ───
        # ─── PRE-CHECK: Does user have any interactions? ───
        # Nếu không có LIKED/INTERACTED → SIMILAR_TO cũ không ý nghĩa → dùng fallback
        # If no LIKED/INTERACTED → old SIMILAR_TO meaningless → use fallback
        has_activity = run_query(
            """MATCH (u:User {name: $name})
               OPTIONAL MATCH (u)-[:LIKED|INTERACTED]->(l:Location)
               RETURN count(l) AS activity_count""",
            {"name": user_name},
        )
        user_has_activity = (
            has_activity and has_activity[0].get("activity_count", 0) > 0
        )

        results = None
        if user_has_activity:
            results = run_query(cypher_query, {"name": user_name})

        # ─── FALLBACK: New Users (Cold Start) hoặc user chưa tương tác ───
        # ─── FALLBACK: New Users (Cold Start) or users with no interactions ───
        # Chỉ dùng PageRank score — không có Collab hay Content-Based
        # Only uses PageRank score — no Collab or Content-Based
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
                   coalesce(avg_rating, l.avgRating, l.rating, 0) AS rating, 
                   l.lat AS lat, l.lng AS lng, l.image as image, collect(cat.name)[0] as category,
                   (coalesce(l.pagerankNorm, 0) * 0.6 + 
                    coalesce(l.pagerankConnectNorm, 0) * 0.3 + 
                    (coalesce(avg_rating, l.avgRating, l.rating, 0) / 5.0) * 0.1) AS score,
                   review_count AS reviewCount,
                   (coalesce(l.pagerankNorm, 0) * 0.6 + 
                    coalesce(l.pagerankConnectNorm, 0) * 0.3 + 
                    (coalesce(avg_rating, l.avgRating, l.rating, 0) / 5.0) * 0.1) * 10.0 AS final_score,
                   0 as common_users, 0 as score_personal, 0 as score_collab, 0 as score_content,
                   (coalesce(l.pagerankNorm, 0) * 0.6 + 
                    coalesce(l.pagerankConnectNorm, 0) * 0.3 + 
                    (coalesce(avg_rating, l.avgRating, l.rating, 0) / 5.0) * 0.1) * 10.0 AS score_pagerank
            ORDER BY final_score DESC, point.distance(point({latitude: l.lat, longitude: l.lng}), point({latitude: 16.4698, longitude: 107.5784})) ASC
            LIMIT 12
            """
            results = run_query(fallback_query, {"name": user_name})

        # ═══════════════════════════════════════════════════════
        # EXPLAINABLE AI: Lấy thêm dữ liệu chi tiết để giải thích gợi ý
        # EXPLAINABLE AI: Fetch additional data to explain recommendations
        # ═══════════════════════════════════════════════════════
        similar_users_map = {}  # {location_name: [{name, score}]}
        matched_likes_map = {}  # {location_name: [liked_loc_name]}

        if user_has_activity:
            # 1. Lấy danh sách users tương đồng đã thích từng địa điểm gợi ý
            #    Get similar users who liked each recommended location
            loc_names = [r["name"] for r in (results or [])]
            if loc_names:
                sim_query = run_query(
                    """
                    MATCH (me:User {name: $name})-[sim:SIMILAR_TO]->(other:User)-[:INTERACTED|LIKED]->(l:Location)
                    WHERE l.name IN $locations AND other <> me
                    RETURN DISTINCT l.name AS loc_name, other.name AS user_name, round(sim.score * 100) AS similarity
                    ORDER BY similarity DESC
                """,
                    {"name": user_name, "locations": loc_names},
                )
                for r in sim_query or []:
                    ln = r["loc_name"]
                    if ln not in similar_users_map:
                        similar_users_map[ln] = []
                    if (
                        len(similar_users_map[ln]) < 5
                    ):  # Giới hạn 5 users / Limit 5 users
                        raw_name = r["user_name"]
                        # Che tên user để bảo mật quyền riêng tư (Vd: u***2)
                        anon_name = raw_name[0] + "***" + raw_name[-1] if len(raw_name) > 2 else raw_name[0] + "***"
                        similar_users_map[ln].append(
                            {"name": anon_name, "similarity": int(r["similarity"])}
                        )

                # 2. Lấy danh sách địa điểm đã like cùng category
                #    Get liked locations in same category
                match_query = run_query(
                    """
                    MATCH (me:User {name: $name})-[:LIKED|INTERACTED]->(liked:Location)-[:HAS_CATEGORY]->(cat:Category)
                    WITH collect({name: liked.name, category: cat.name}) AS liked_cats
                    UNWIND $locations AS loc_name
                    MATCH (l:Location {name: loc_name})-[:HAS_CATEGORY]->(c:Category)
                    WITH l, c, liked_cats
                    UNWIND liked_cats AS lc
                    WITH l, lc WHERE lc.category = c.name
                    RETURN l.name AS loc_name, collect(DISTINCT lc.name) AS matched_likes
                """,
                    {"name": user_name, "locations": loc_names},
                )
                for r in match_query or []:
                    matched_likes_map[r["loc_name"]] = r["matched_likes"][
                        :3
                    ]  # Giới hạn 3 / Limit 3

        # ═══════════════════════════════════════════════════════
        # XỬ LÝ KẾT QUẢ: Tính phần trăm & xác định reason chính
        # PROCESS RESULTS: Calculate percentages & determine main reason
        # ═══════════════════════════════════════════════════════
        processed_results = []
        for loc in results or []:
            s_collab = loc.get("score_collab", 0) or 0
            s_content = loc.get("score_content", 0) or 0
            s_pagerank = loc.get("score_pagerank", 0) or 0
            common_users = loc.get("common_users", 0) or 0
            loc_name = loc.get("name", "")

            # ─── TÍNH % TƯƠNG ĐỒNG (Calculate similarity percentages) ───
            # 1. Content-Based: Baseline = 5.0 (5+ matches = 100%)
            if s_content > 0:
                pct_content = min(100, (s_content / 5.0) * 100)
            else:
                pct_content = 0

            # 2. Collaborative: Baseline = 5 users = 100%
            if common_users > 0:
                pct_collab = min(100, (common_users / 5.0) * 100)
            else:
                pct_collab = 0

            # 3. PageRank: thang 0-10 → 0-100% / scale 0-10 → 0-100%
            pct_pagerank = min(100, (s_pagerank / 10.0) * 100)

            # ─── BIỂU ĐỒ TRÒN: Tỷ lệ đóng góp (Pie Chart: Contribution ratio) ───
            total_raw = s_collab + s_content + s_pagerank
            if total_raw > 0:
                chart_collab = round((s_collab / total_raw) * 100)
                chart_content = round((s_content / total_raw) * 100)
                chart_pagerank = (
                    100 - chart_collab - chart_content
                )  # Đảm bảo tổng = 100 / Ensure sum = 100
            else:
                chart_collab = 0
                chart_content = 0
                chart_pagerank = 100

            # ─── XÁC ĐỊNH REASON CHÍNH (Determine main reason) ───
            reason = ""
            reason_icon = "🤖"
            reason_type = "default"

            if s_collab > 0.5 and common_users >= 1:
                # Collaborative: Có user giống bạn đã thích
                # Collaborative: Similar users liked this
                reason = f"{int(common_users)} người có sở thích giống bạn đã thích địa điểm này"
                reason_icon = "👥"
                reason_type = "collab"
            elif s_content > 0.1:
                # Content-Based: Cùng category với nơi đã thích
                # Content-Based: Same category as liked places
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
                matched = matched_likes_map.get(loc_name, [])
                if matched:
                    reason = f"Gợi ý vì bạn đã thích {matched[0]}"
                else:
                    reason = f"Gợi ý phù hợp vì bạn hay ghé {loc.get('category', '')}"
                reason_type = "content"
            elif s_pagerank > 0:
                # PageRank: Địa điểm nổi tiếng
                # PageRank: Popular location
                reason = "Địa điểm đang rất Hot trong cộng đồng du lịch Huế"
                reason_icon = "🔥"
                reason_type = "pagerank"
            else:
                # Default: AI gợi ý chung
                # Default: General AI suggestion
                reason = "Được gợi ý bởi hệ thống AI"
                reason_icon = "🤖"
                reason_type = "default"

            # ─── EXPLAINABLE AI DATA (Dữ liệu giải thích chi tiết) ───
            sim_users = similar_users_map.get(loc_name, [])
            matched_likes = matched_likes_map.get(loc_name, [])

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
                    "similar_users": sim_users,  # [{name, similarity}]
                },
                "content": {
                    "score": round(s_content, 2),
                    "percent": round(pct_content, 1),
                    "label": "Content-based",
                    "desc": "Tương tự địa điểm đã thích",
                    "matched_likes": matched_likes,  # [loc_name]
                },
                "pagerank": {
                    "score": round(s_pagerank, 2),
                    "percent": round(pct_pagerank, 1),
                    "label": "PageRank",
                    "desc": "Độ nổi tiếng toàn hệ thống",
                },
                "chart": {
                    "collab": chart_collab,
                    "content": chart_content,
                    "pagerank": chart_pagerank,
                },
            }

            loc["reason"] = reason
            loc["reason_icon"] = reason_icon
            loc["reason_type"] = reason_type
            loc["reason_details"] = reason_details
            processed_results.append(loc)

        return jsonify(processed_results)
    except Exception as e:
        logger.error(f"Lỗi Recommend: {e}")
        return jsonify({"error": str(e)}), 500


# =============================================================
# 4. API: THÍCH/BỎ THÍCH ĐỊA ĐIỂM (Toggle Like)
# POST /api/like
# Body: {"location_name": "..."}
# Trả về: {liked: true/false, message: "..."}
# =============================================================
@bp.route("/api/like", methods=["POST"])
@login_required
def api_toggle_like():
    data = request.json
    location_name = data.get("location_name")

    if not location_name:
        return jsonify({"error": "Thiếu tên địa điểm"}), 400

    is_liked, msg = toggle_like_location(current_user.id, location_name)

    # Chạy lại thuật toán AI trong nền khi có thay đổi tương tác (Like/Unlike)
    # Run AI algorithm in background thread on interaction change
    import threading
    from setup_algo import run_hybrid_algo
    
    threading.Thread(target=run_hybrid_algo).start()
    logger.info(f"Thay đổi Like ('{location_name}'). Đang chạy lại thuật toán AI...")

    return jsonify({"liked": is_liked, "message": msg}), 200


# =============================================================
# 5. API: THÊM/SỬA ĐÁNH GIÁ (Add/Edit Review)
# POST /api/review
# Body: {location_name, rating, comment, review_id? (for editing)}
# Tự động: Phân tích cảm xúc + Phân loại chủ đề
# Auto: Sentiment analysis + Topic classification
# =============================================================
@bp.route("/api/review", methods=["POST"])
@login_required
def api_add_review():
    data = request.json
    loc_name = data.get("location_name")
    rating = data.get("rating")
    comment = data.get("comment", "")
    review_id = data.get(
        "review_id"
    )  # ID review khi sửa (tùy chọn) / Review ID for editing (optional)

    if not loc_name:
        return jsonify({"error": "Thiếu thông tin địa điểm"}), 400

    # Validate rating range (0-5) / Kiểm tra khoảng giá trị rating
    if rating is None:
        rating = 0
    else:
        try:
            rating = float(rating)
            if rating < 0 or rating > 5:
                return jsonify({"error": "Điểm đánh giá phải từ 0 đến 5"}), 400
        except (ValueError, TypeError):
            return jsonify({"error": "Điểm đánh giá không hợp lệ"}), 400

    # Tự động phân tích cảm xúc và chủ đề
    # Auto-analyze sentiment and topics
    sentiment = analyze_sentiment(comment)
    topics = classify_comment_topic(comment)
    success, result = add_review(
        current_user.id, loc_name, rating, comment, sentiment, review_id, topics
    )

    if success:
        # Chạy lại thuật toán AI trong nền khi có đánh giá mới/cập nhật
        import threading
        from setup_algo import run_hybrid_algo
        threading.Thread(target=run_hybrid_algo).start()
        logger.info(f"Thêm/sửa đánh giá '{loc_name}'. Đang chạy lại thuật toán AI...")

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


# =============================================================
# 5b. API: LẤY DANH SÁCH REVIEW CỦA ĐỊA ĐIỂM (Get Location Reviews)
# GET /api/reviews/<location_name>
# Không cần đăng nhập (public) / No login required (public)
# =============================================================
@bp.route("/api/reviews/<location_name>", methods=["GET"])
def api_get_reviews(location_name):
    reviews = get_location_reviews(location_name)
    return jsonify(reviews if reviews else [])


# =============================================================
# 5c. API: XÓA ĐÁNH GIÁ (Delete Review)
# DELETE /api/review
# Body: {location_name, review_id?, review_user? (admin only)}
# Admin: Có thể xóa review của bất kỳ user nào
# Admin: Can delete any user's review
# =============================================================
@bp.route("/api/review", methods=["DELETE"])
@login_required
def api_delete_review():
    data = request.json
    loc_name = data.get("location_name")
    review_id = data.get("review_id")

    if not loc_name:
        return jsonify({"error": "Thiếu tên địa điểm"}), 400

    # Admin có thể xóa đánh giá bất kỳ user / Admin can delete any user's review
    if current_user.is_admin and data.get("review_user"):
        target_user = data.get("review_user")
    else:
        target_user = current_user.id

    success, result = delete_review(target_user, loc_name, review_id)
    if success:
        # Chạy lại thuật toán AI trong nền khi xóa đánh giá
        import threading
        from setup_algo import run_hybrid_algo
        threading.Thread(target=run_hybrid_algo).start()
        logger.info(f"Xóa đánh giá tại '{loc_name}'. Đang chạy lại thuật toán AI...")

        return (
            jsonify({"success": True, "message": "Đã xóa đánh giá!", "stats": result}),
            200,
        )
    else:
        return jsonify({"success": False, "error": result}), 500


# =============================================================
# 6a. API: TÌM ĐỊA ĐIỂM TƯƠNG TỰ (Get Similar Locations)
# GET /api/similar/<location_name>
# Dựa trên quan hệ LOC_SIMILAR (Jaccard) + cùng Category
# Based on LOC_SIMILAR relationship (Jaccard) + same Category
# Fallback: Cùng Category, sắp theo PageRank
# Fallback: Same Category, sorted by PageRank
# =============================================================
@bp.route("/api/similar/<location_name>", methods=["GET"])
def get_similar_locations(location_name):
    """
    Tìm địa điểm tương tự CÙNG DANH MỤC, sử dụng:
    Find similar locations in SAME CATEGORY, using:
    1. LOC_SIMILAR (Jaccard Similarity) nếu có — lọc cùng category
       LOC_SIMILAR (Jaccard Similarity) if available — filter same category
    2. Fallback: cùng Category, sắp xếp theo PageRank
       Fallback: same Category, sorted by PageRank
    """
    # Query ưu tiên LOC_SIMILAR + filter cùng category
    # Priority query: LOC_SIMILAR + same category filter
    query = """
    MATCH (current:Location {name: $name})
    OPTIONAL MATCH (current)-[:HAS_CATEGORY]->(current_cat:Category)
    WITH current, collect(current_cat.name) as current_categories
    
    // Tìm các địa điểm tương tự qua quan hệ LOC_SIMILAR
    // Find similar locations via LOC_SIMILAR relationship
    OPTIONAL MATCH (current)-[sim:LOC_SIMILAR]->(similar:Location)
    
    // Lấy category của địa điểm tương tự
    // Get category of similar locations
    OPTIONAL MATCH (similar)-[:HAS_CATEGORY]->(cat_node:Category)
    
    WITH similar, sim, collect(cat_node.name)[0] as category, current_categories
    WHERE similar IS NOT NULL
    // CHỈ lấy địa điểm cùng danh mục / ONLY get same category locations
    AND category IN current_categories
    
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

        # Fallback: Nếu không có LOC_SIMILAR cùng category → tìm theo Category + PageRank
        # Fallback: If no LOC_SIMILAR in same category → search by Category + PageRank
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
                   (coalesce(similar.pagerankNorm, 0) * 0.6 + 
                    coalesce(similar.pagerankConnectNorm, 0) * 0.3 + 
                    (coalesce(similar.rating, 0) / 5.0) * 0.1) AS score,
                   0 AS similarity
            ORDER BY score DESC
            LIMIT 6
            """
            results = run_query(fallback_query, {"name": location_name})

        return jsonify(results if results else [])
    except Exception as e:
        logger.error(f"Lỗi get_similar_locations: {e}")
        return jsonify({"error": str(e)}), 500


# =============================================================
# 6b. API: TÌM USER TƯƠNG TỰ (Get Similar Users)
# GET /api/similar-users/<username>
# Dựa trên Jaccard Similarity (được tính bởi setup_algo.py + GDS)
# Based on Jaccard Similarity (computed by setup_algo.py + GDS)
# =============================================================
@bp.route("/api/similar-users/<username>", methods=["GET"])
@login_required
def get_similar_users(username):
    """
    Lấy danh sách users tương tự dựa trên Jaccard Similarity.
    Get list of similar users based on Jaccard Similarity.
    Được tính bởi setup_algo.py (Neo4j GDS nodeSimilarity)
    Computed by setup_algo.py (Neo4j GDS nodeSimilarity)
    """
    # Bảo mật: Chỉ xem dữ liệu của chính mình
    # Security: Only view own data
    if current_user.id != username:
        return jsonify({"error": "Không có quyền truy cập"}), 403

    query = """
    MATCH (me:User {name: $name})-[sim:SIMILAR_TO]->(other:User)
    
    // Lấy thông tin về địa điểm chung / Get common locations info
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
        logger.error(f"Lỗi get_similar_users: {e}")
        return jsonify({"error": str(e)}), 500


# =============================================================
# 7. API: AI PLANNER — TẠO LỘ TRÌNH (Generate Itinerary)
# POST /api/planner/generate
# Body: {days: 1-5, preferences: ['Ẩm thực', 'Di tích'], use_liked: true/false}
#
# 2 chế độ / 2 modes:
#   - use_liked=true: Lộ trình từ danh sách Đã thích ❤️ (YÊU CẦU có likes)
#                     Itinerary from Liked list ❤️ (REQUIRES likes)
#   - use_liked=false: AI tự gợi ý (có fallback nếu không có kết quả)
#                      AI auto-suggest (has fallback if no results)
# =============================================================
@bp.route("/api/planner/generate", methods=["POST"])
@login_required
def api_generate_itinerary():
    data = request.json
    username = current_user.id

    days = int(data.get("days", 1))
    preferences = data.get("preferences", [])
    use_liked = data.get("use_liked", False)

    # Clamp days: 1-5
    if days < 1:
        days = 1
    if days > 5:
        days = 5

    # ─── Pre-check: Nếu "Từ danh sách đã thích" nhưng chưa like gì ───
    # ─── Pre-check: If "From Liked list" but hasn't liked anything ───
    if use_liked:

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

        # Kiểm tra plan rỗng / Check empty plan
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
        # Lỗi validation (thiếu likes, etc.) / Validation error (missing likes, etc.)
        logger.warning(f"Planner Validation Error: {e}")
        return (
            jsonify({"success": False, "error": str(e), "error_type": "validation"}),
            400,
        )
    except Exception as e:
        logger.error(f"Planner Error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


# =============================================================
# 7b. API: GỢI Ý HOẠT ĐỘNG THAY THẾ (Suggest Activity Replacement)
# POST /api/planner/suggest-replacement
# Body: {exclude: [...], type: "visit"|"food"}
#
# Trả về 2 phần / Returns 2 sections:
#   - liked: Địa điểm từ danh sách Đã thích (nếu có)
#            Locations from Liked list (if any)
#   - ai: Gợi ý AI mới (Hybrid PageRank + Content-Based bonus)
#          AI new suggestions (Hybrid PageRank + Content-Based bonus)
# =============================================================
@bp.route("/api/planner/suggest-replacement", methods=["POST"])
@login_required
def api_suggest_replacement():
    """Gợi ý địa điểm thay thế: Chia làm 2 phần (Đã thích & AI gợi ý)"""
    data = request.json
    exclude_names = data.get("exclude", [])
    activity_type = data.get("type", "visit")  # "visit" hoặc "food"

    # Validate activity_type / Kiểm tra loại hoạt động
    if activity_type not in ("visit", "food"):
        activity_type = "visit"

    username = current_user.id

    # Keyword ẩm thực — dùng để phân loại food vs visit
    # Food keywords — used to classify food vs visit
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

    is_food = activity_type == "food"

    # ─── Phần 1: Danh sách ĐÃ THÍCH (Liked Candidates) ───
    # ─── Part 1: LIKED List (Liked Candidates) ───
    liked_candidates = []

    liked_query = """
    MATCH (u:User {name: $username})-[:LIKED]->(l:Location)
    OPTIONAL MATCH (l)-[:HAS_CATEGORY]->(cat:Category)
    WHERE NOT l.name IN $exclude
    AND (
        ($is_food = true AND any(kw IN $food_keywords WHERE toLower(cat.name) CONTAINS kw))
        OR
        ($is_food = false AND (none(kw IN $food_keywords WHERE toLower(cat.name) CONTAINS kw) OR cat IS NULL))
    )
    WITH l, cat,
         (coalesce(l.pagerankNorm, 0) * 0.6 +
          coalesce(l.pagerankConnectNorm, 0) * 0.3 +
          (coalesce(l.rating, 0) / 5.0) * 0.1) AS score
    RETURN l.name as name, cat.name as category, 
           l.lat as lat, l.lng as lng, l.image as image, l.desc as description,
           score
    ORDER BY score DESC
    LIMIT 10
    """
    try:
        liked_candidates = run_query(
            liked_query,
            {
                "username": username,
                "exclude": exclude_names,
                "food_keywords": food_keywords,
                "is_food": is_food,
            },
        )
    except Exception as e:
        logger.error(f"Liked Query Error: {e}")

    # ─── Phần 2: AI SUGGESTIONS (Gợi ý AI mới) ───
    # ─── Part 2: AI SUGGESTIONS (New AI suggestions) ───
    # Loại bỏ những cái đã nằm trong list Liked (tránh trùng lặp)
    # Exclude items already in Liked list (avoid duplicates)
    exclude_total = exclude_names + (
        [loc["name"] for loc in liked_candidates] if liked_candidates else []
    )

    # Hybrid Score + Content-Based bonus:
    # Nếu category trùng với sở thích user → +0.2 điểm
    # If category matches user preference → +0.2 bonus points
    ai_query = """
    MATCH (l:Location)
    OPTIONAL MATCH (l)-[:HAS_CATEGORY]->(cat:Category)
    WHERE NOT l.name IN $exclude
    AND (
        ($is_food = true AND any(kw IN $food_keywords WHERE toLower(cat.name) CONTAINS kw))
        OR
        ($is_food = false AND (none(kw IN $food_keywords WHERE toLower(cat.name) CONTAINS kw) OR cat IS NULL))
    )
    OPTIONAL MATCH (me:User {name: $username})-[:INTERACTED]->(:Location)-[:HAS_CATEGORY]->(user_cat:Category)
    WHERE user_cat.name = cat.name
    WITH l, cat, 
         count(DISTINCT user_cat) as category_match,
         rand() as r
    WITH l, cat,
         (coalesce(l.pagerankNorm, 0) * 0.6 +
          coalesce(l.pagerankConnectNorm, 0) * 0.3 +
          (coalesce(l.rating, 0) / 5.0) * 0.1) + CASE WHEN category_match > 0 THEN 0.2 ELSE 0 END as hybrid_score,
         r
    ORDER BY (hybrid_score * 0.7 + r * 0.3) DESC
    LIMIT 15
    RETURN l.name as name, cat.name as category, 
           l.lat as lat, l.lng as lng, l.image as image, l.desc as description,
           hybrid_score as score
    """
    ai_params = {
        "username": username,
        "exclude": exclude_total,
        "food_keywords": food_keywords,
        "is_food": is_food,
    }

    try:
        ai_candidates = run_query(ai_query, ai_params)

        # Luôn trả về success=True dù danh sách rỗng (frontend xử lý empty state)
        # Always return success=True even if lists empty (frontend handles empty state)
        return jsonify(
            {
                "success": True,
                "liked": liked_candidates if liked_candidates else [],
                "ai": ai_candidates if ai_candidates else [],
            }
        )

    except Exception as e:
        logger.error(f"Replacement Error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


# =============================================================
# 8. API: HOẠT ĐỘNG NGƯỜI DÙNG (User Activity)
# GET /api/user/activity
# Trả về: {likes: [...], reviews: [...]}
# =============================================================
@bp.route("/api/user/activity")
@login_required
def api_user_activity():
    username = current_user.id
    try:
        likes = get_user_likes(username)
        reviews = get_user_reviews(username)
        return jsonify({"success": True, "likes": likes, "reviews": reviews})
    except Exception as e:
        logger.error(f"Error fetching user activity: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


# =============================================================
# 9. API: QUẢN LÝ LỘ TRÌNH ĐÃ LƯU (Saved Itinerary CRUD)
# GET    /api/itineraries        → Lấy danh sách / Get list
# POST   /api/itineraries        → Lưu mới / Save new
# DELETE /api/itineraries/<id>   → Xóa / Delete
# =============================================================
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
