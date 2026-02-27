"""
=============================================================================
db/planner.py - AI Itinerary Planner (Lập lộ trình du lịch thông minh)
db/planner.py - AI Itinerary Planner (Smart travel itinerary generation)
=============================================================================
Mô tả / Description:
    - Tạo lộ trình du lịch thông minh cho N ngày.
      Generate smart travel itineraries for N days.
    - Hỗ trợ 2 chế độ: (a) từ danh sách Đã thích, (b) AI gợi ý mới.
      Supports 2 modes: (a) from Liked list, (b) AI new suggestions.
    - Sử dụng thuật toán Nearest Neighbor (Greedy) để tối ưu khoảng cách.
      Uses Nearest Neighbor (Greedy) algorithm for distance optimization.
    - Phân chia hoạt động: Sáng (tham quan), Trưa (ăn), Chiều (tham quan), Tối (ăn/dạo).
      Activity schedule: Morning (visit), Noon (food), Afternoon (visit), Evening (food/walk).

Phụ thuộc / Dependencies:
    - db.connection (run_query)

Thuật toán / Algorithm:
    1. Candidate Selection: Lọc ứng viên theo chế độ + preferences
       Candidate Selection: Filter candidates by mode + preferences
    2. Category Splitting: Tách thành pool_sightseeing và pool_food
       Category Splitting: Split into sightseeing and food pools
    3. Nearest Neighbor: Chọn địa điểm gần nhất từ vị trí hiện tại
       Nearest Neighbor: Pick nearest location from current position
    4. Day Planning: Sắp lịch 4 buổi/ngày (Sáng-Trưa-Chiều-Tối)
       Day Planning: Schedule 4 slots/day (Morning-Noon-Afternoon-Evening)
=============================================================================
"""

import logging
from .connection import run_query

logger = logging.getLogger(__name__)


def generate_itinerary(username, days=1, preferences=None, use_liked=False):
    """
    Tạo lộ trình du lịch thông minh.
    Generate a smart travel itinerary.

    Args:
        username (str): Tên người dùng / Username
        days (int): Số ngày lộ trình (1-5) / Number of days (1-5)
        preferences (list): Danh mục ưa thích VD: ['Ẩm thực', 'Di tích']
                            Preferred categories e.g.: ['Cuisine', 'Historical']
        use_liked (bool): True = chỉ lấy từ Đã thích, False = AI gợi ý mới
                          True = from Liked only, False = AI new suggestions

    Returns:
        list[dict]: Lộ trình theo ngày, mỗi ngày chứa danh sách activities
                    Itinerary by day, each day contains list of activities
                    VD / e.g.: [{"day": 1, "activities": [{"time": "Sáng", "type": "visit", "location": {...}}]}]

    Raises:
        ValueError: Khi chế độ use_liked nhưng chưa like địa điểm nào
                    When use_liked mode but no liked locations
    """
    if preferences is None:
        preferences = []

    logger.debug(
        f"Generating {days}-day itinerary. Prefs: {preferences}. Using Liked: {use_liked}"
    )

    # =============================================================
    # BƯỚC 1: TÌM ỨNG VIÊN (Candidate Selection)
    # Lọc theo Category nếu có preferences
    # Filter by Category if preferences provided
    # =============================================================
    category_match = ""
    category_where = ""

    if preferences and len(preferences) > 0:
        category_match = "MATCH (l)-[:HAS_CATEGORY]->(cat:Category)"
        category_where = "AND cat.name IN $preferences"
    else:
        category_match = "OPTIONAL MATCH (l)-[:HAS_CATEGORY]->(cat:Category)"

    if use_liked:
        # ─── CHẾ ĐỘ: LẤY TỪ DANH SÁCH ĐÃ THÍCH ───
        # ─── MODE: FROM LIKED LIST ───
        # Chỉ lấy các địa điểm user đã thả tim ❤️
        # Only get locations the user has hearted ❤️
        query = f"""
        MATCH (u:User {{name: $name}})-[:LIKED]->(l:Location)
        {category_match}
        WHERE 1=1
        {category_where}
        
        WITH l, cat
        // Vẫn lấy score để sắp xếp ưu tiên / Still get score for priority sorting
        RETURN l.name as name, 
               cat.name as category, 
               l.lat as lat, 
               l.lng as lng, 
               l.image as image, 
               l.desc as description,
               coalesce(l.pagerankNorm, 0.1) as score
        ORDER BY score DESC
        """
    else:
        # ─── CHẾ ĐỘ: AI GỢI Ý MỚI (AI Recommendation) ───
        # ─── MODE: AI NEW SUGGESTIONS ───
        # Chỉ lấy địa điểm CHƯA đi (chưa INTERACTED hoặc REVIEWED)
        # Only get locations NOT visited (not INTERACTED or REVIEWED)
        query = f"""
        MATCH (u:User {{name: $name}})
        MATCH (l:Location)
        {category_match}
        // Chỉ lấy địa điểm CHƯA đi / Only get unvisited locations
        WHERE NOT (u)-[:INTERACTED]->(l) AND NOT (u)-[:REVIEWED]->(l)
        {category_where}
        
        OPTIONAL MATCH (l)<-[i:INTERACTED]-(other:User)
        WITH l, cat, count(i) as popularity, coalesce(l.pagerankNorm, l.pagerankScore, 0.15) as pr
        
        // Công thức điểm: PageRank(50%) + Popularity(30%)
        // Scoring formula: PageRank(50%) + Popularity(30%)
        WITH l, cat, (pr * 0.5 + log(popularity + 1) * 0.3) as score
        ORDER BY score DESC
        LIMIT 50
        
        RETURN l.name as name, 
               cat.name as category, 
               l.lat as lat, 
               l.lng as lng, 
               l.image as image, 
               l.desc as description,
               score
        """

    try:
        logger.debug(f"Running Planner Query for user={username}...")

        candidates = run_query(
            query, {"name": username, "preferences": preferences or []}
        )
        logger.debug(f"Candidates found: {len(candidates) if candidates else 0}")

        if not candidates:
            # NẾU CHẾ ĐỘ "USE LIKED" NHƯNG KHÔNG CÓ ĐỊA ĐIỂM NÀO ĐÃ THÍCH
            # IF "USE LIKED" MODE BUT NO LIKED LOCATIONS FOUND
            # → Trả về lỗi rõ ràng, KHÔNG FALLBACK
            # → Return clear error, NO FALLBACK
            if use_liked:
                raise ValueError(
                    "Bạn chưa thích địa điểm nào! Hãy thả tim một vài nơi trước khi tạo lộ trình theo sở thích."
                )

            # Chỉ fallback khi ở chế độ AI gợi ý thông thường
            # Only fallback when in normal AI suggestion mode
            logger.debug("No candidates found, running fallback...")

            fallback_where = ""
            if preferences and len(preferences) > 0:
                fallback_where = "WHERE cat.name IN $preferences"

            fallback_query = f"""
            MATCH (l:Location)
            OPTIONAL MATCH (l)-[:HAS_CATEGORY]->(cat:Category)
            {fallback_where}
            RETURN l.name as name, 
                   cat.name as category, 
                   l.lat as lat, 
                   l.lng as lng, 
                   l.image as image, 
                   l.desc as description, 
                   coalesce(l.rating, 0) as score
            ORDER BY score DESC LIMIT 30
            """
            candidates = run_query(fallback_query, {"preferences": preferences or []})
            logger.debug(f"Fallback candidates: {len(candidates) if candidates else 0}")

        # =============================================================
        # BƯỚC 2: PHÂN LOẠI ỨNG VIÊN (Category Splitting)
        # Tách thành 2 pool: tham quan (sightseeing) và ẩm thực (food)
        # Split into 2 pools: sightseeing and food
        # =============================================================
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
            "món",
            "ăn",
            "uống",
        ]

        pool_sightseeing = []  # Địa điểm tham quan / Sightseeing locations
        pool_food = []  # Quán ăn / Food locations

        for item in candidates:
            cat = item.get("category", "")
            if not cat:
                cat = ""
            cat_lower = cat.lower()

            # Kiểm tra keyword (không phân biệt hoa/thường)
            # Check keyword (case insensitive)
            is_food = any(k in cat_lower for k in food_keywords)

            if is_food:
                pool_food.append(item)
            else:
                pool_sightseeing.append(item)

        # =============================================================
        # BƯỚC 3: SẮP XẾP LỘ TRÌNH (Nearest Neighbor — Greedy Algorithm)
        # Chọn địa điểm gần nhất từ vị trí hiện tại để tối ưu di chuyển
        # Pick nearest location from current position to optimize travel
        # =============================================================

        def dist_sq(loc1, loc2):
            """
            Tính bình phương khoảng cách (đủ để so sánh, không cần căn bậc 2)
            Calculate squared distance (sufficient for comparison, no sqrt needed)
            """
            try:
                lat1, lng1 = float(loc1.get("lat", 0)), float(loc1.get("lng", 0))
                lat2, lng2 = float(loc2.get("lat", 0)), float(loc2.get("lng", 0))
                return (lat1 - lat2) ** 2 + (lng1 - lng2) ** 2
            except (ValueError, TypeError):
                return float("inf")

        def pop_nearest(current_location, pool):
            """
            Lấy và xóa địa điểm gần nhất từ pool so với vị trí hiện tại.
            Pop the nearest location from pool relative to current position.

            Nếu chưa có vị trí (đầu ngày) → lấy địa điểm điểm cao nhất (đầu list)
            If no position yet (start of day) → take highest scored (first in list)
            """
            if not pool:
                return None

            # Nếu chưa có vị trí (đầu ngày) → lấy điểm cao nhất
            # If no position yet (start of day) → take highest scored
            if not current_location:
                return pool.pop(0)

            # Tìm địa điểm gần nhất trong pool / Find nearest in pool
            nearest_idx = 0
            min_dist = float("inf")

            for i, loc in enumerate(pool):
                d = dist_sq(current_location, loc)
                if d < min_dist:
                    min_dist = d
                    nearest_idx = i

            return pool.pop(nearest_idx)

        logger.debug(
            f"Sightseeing pool: {len(pool_sightseeing)}, Food pool: {len(pool_food)}"
        )

        # =============================================================
        # BƯỚC 4: LẬP KẾ HOẠCH THEO NGÀY (Day Planning)
        # Mỗi ngày 4 buổi: Sáng → Trưa → Chiều → Tối
        # Each day has 4 slots: Morning → Noon → Afternoon → Evening
        #
        # SÁNG: Tham quan (điểm Neo — nơi Hot nhất còn lại)
        #        Sightseeing (anchor point — hottest remaining)
        # TRƯA: Ăn uống (quán gần nhất từ điểm sáng)
        #        Food (nearest restaurant from morning point)
        # CHIỀU: Tham quan (gần quán ăn trưa nhất)
        #         Sightseeing (nearest from lunch spot)
        # TỐI:  Ăn uống / Dạo chơi (gần điểm chiều)
        #        Food/Walk (nearest from afternoon point)
        # =============================================================
        itinerary = []

        for day in range(1, days + 1):
            day_plan = {"day": day, "activities": []}

            # Biến lưu vị trí hiện tại để tìm điểm tiếp theo gần đó
            # Variable storing current position to find nearby next point
            current_loc = None

            # SÁNG: Tham quan (Điểm Neo — chọn nơi Hot nhất còn lại)
            # MORNING: Sightseeing (Anchor — pick hottest remaining)
            loc = pop_nearest(None, pool_sightseeing)
            if loc:
                day_plan["activities"].append(
                    {"time": "Sáng", "type": "visit", "location": loc}
                )
                current_loc = loc

            # TRƯA: Ăn uống (Tìm quán gần địa điểm sáng nhất)
            # NOON: Food (Find nearest restaurant from morning point)
            loc = pop_nearest(current_loc, pool_food)
            if loc:
                day_plan["activities"].append(
                    {"time": "Trưa", "type": "food", "location": loc}
                )
                current_loc = loc

            # CHIỀU: Tham quan (Tìm nơi gần quán ăn trưa nhất)
            # AFTERNOON: Sightseeing (Find nearest from lunch spot)
            loc = pop_nearest(current_loc, pool_sightseeing)
            if loc:
                day_plan["activities"].append(
                    {"time": "Chiều", "type": "visit", "location": loc}
                )
                current_loc = loc

            # TỐI: Ăn uống / Chill (Tìm nơi gần địa điểm chiều nhất)
            # EVENING: Food/Chill (Find nearest from afternoon point)
            loc = pop_nearest(current_loc, pool_food)

            # Nếu hết đồ ăn → thử tìm chỗ đi dạo tối (pool sightseeing)
            # If no more food → try finding evening walk spot (sightseeing pool)
            if not loc:
                loc = pop_nearest(current_loc, pool_sightseeing)

            if loc:
                # Kiểm tra type để gán label đúng / Check type for correct label
                act_type = "food"
                cat_lower = loc.get("category", "").lower()
                if not any(k in cat_lower for k in food_keywords):
                    act_type = "visit"

                day_plan["activities"].append(
                    {"time": "Tối", "type": act_type, "location": loc}
                )

            itinerary.append(day_plan)

        logger.info("Itinerary generated successfully with Spatial Optimization")
        return itinerary

    except ValueError:
        raise  # Re-raise ValueError cho API layer xử lý / for API layer to handle
    except Exception as e:
        logger.error(f"Generating itinerary: {e}", exc_info=True)
        return []
