"""
db/planner.py - AI Itinerary Planner (Lập lộ trình thông minh)
"""

from .connection import run_query


def generate_itinerary(username, days=1, preferences=[], use_liked=False):
    """
    Tạo lộ trình du lịch thông minh.
    :param use_liked: Nếu True, chỉ chọn từ danh sách Đã thích.
    """
    print(
        f"DEBUG: Generating {days}-day itinerary. Prefs: {preferences}. Using Liked: {use_liked}"
    )

    # 1. Tìm ứng viên (Candidate Selection)
    # Lọc theo Category nếu có
    category_match = ""
    category_where = ""

    pref_list = str(preferences)
    if preferences and len(preferences) > 0:
        category_match = "MATCH (l)-[:HAS_CATEGORY]->(cat:Category)"
        category_where = f"AND cat.name IN {pref_list}"
    else:
        category_match = "OPTIONAL MATCH (l)-[:HAS_CATEGORY]->(cat:Category)"

    if use_liked:
        # --- CHẾ ĐỘ: LẤY TỪ DANH SÁCH ĐÃ THÍCH ---
        query = f"""
        MATCH (u:User {{name: $name}})-[:LIKED]->(l:Location)
        {category_match}
        WHERE 1=1
        {category_where}
        
        WITH l, cat
        // Vẫn lấy score để sắp xếp ưu tiên
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
        # --- CHẾ ĐỘ: GỢI Ý MỚI (AI RECOMMENDATION) ---
        query = f"""
        MATCH (u:User {{name: $name}})
        MATCH (l:Location)
        {category_match}
        // Chỉ lấy địa điểm CHƯA đi (chưa interacted/reviewed)
        WHERE NOT (u)-[:INTERACTED]->(l) AND NOT (u)-[:REVIEWED]->(l)
        {category_where}
        
        OPTIONAL MATCH (l)<-[i:INTERACTED]-(other:User)
        WITH l, cat, count(i) as popularity, coalesce(l.pagerankNorm, l.pagerankScore, 0.15) as pr
        
        // Scoring: PageRank + Popularity
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
        print(f"DEBUG: Running Planner Query for user={username}...")

        candidates = run_query(query, {"name": username})
        print(f"DEBUG: Candidates found: {len(candidates) if candidates else 0}")

        if not candidates:
            # NẾU CHẾ ĐỘ "USE LIKED" NHƯNG KHÔNG CÓ ĐỊA ĐIỂM NÀO ĐÃ THÍCH
            # → Trả về lỗi rõ ràng, KHÔNG FALLBACK
            if use_liked:
                raise ValueError(
                    "Bạn chưa thích địa điểm nào! Hãy thả tim một vài nơi trước khi tạo lộ trình theo sở thích."
                )

            # Chỉ fallback khi ở chế độ AI gợi ý thông thường
            print("DEBUG: No candidates found, running fallback...")

            # Fix fallback query tương tự
            fallback_where = ""
            if preferences and len(preferences) > 0:
                fallback_where = f"WHERE cat.name IN {str(preferences)}"

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
            candidates = run_query(fallback_query, {})
            print(f"DEBUG: Fallback candidates: {len(candidates) if candidates else 0}")

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

        pool_sightseeing = []
        pool_food = []

        for item in candidates:
            cat = item.get("category", "")
            if not cat:
                cat = ""
            cat_lower = cat.lower()

            # Check keyword (Case Insensitive)
            is_food = any(k in cat_lower for k in food_keywords)

            if is_food:
                pool_food.append(item)
            else:
                pool_sightseeing.append(item)

        # 3. Sắp xếp lộ trình (Thuật toán Nearest Neighbor - Greedy)
        # Helper: Tính bình phương khoảng cách (đủ để so sánh, không cần căn bậc 2)
        def dist_sq(loc1, loc2):
            try:
                lat1, lng1 = float(loc1.get("lat", 0)), float(loc1.get("lng", 0))
                lat2, lng2 = float(loc2.get("lat", 0)), float(loc2.get("lng", 0))
                return (lat1 - lat2) ** 2 + (lng1 - lng2) ** 2
            except:
                return float("inf")

        # Helper: Lấy địa điểm gần nhất từ pool so với vị trí hiện tại
        def pop_nearest(current_location, pool):
            if not pool:
                return None

            # Nếu chưa có vị trí (đầu ngày), lấy địa điểm điểm cao nhất (đầu list)
            if not current_location:
                return pool.pop(0)

            # Tìm địa điểm gần nhất trong pool
            nearest_idx = 0
            min_dist = float("inf")

            for i, loc in enumerate(pool):
                d = dist_sq(current_location, loc)
                if d < min_dist:
                    min_dist = d
                    nearest_idx = i

            return pool.pop(nearest_idx)

        print(
            f"DEBUG: Sightseeing pool: {len(pool_sightseeing)}, Food pool: {len(pool_food)}"
        )

        itinerary = []

        for day in range(1, days + 1):
            day_plan = {"day": day, "activities": []}

            # Biến lưu vị trí hiện tại để tìm điểm tiếp theo gần đó
            current_loc = None

            # SÁNG: Tham quan (Điểm Neo - Chọn nơi Hot nhất còn lại)
            loc = pop_nearest(None, pool_sightseeing)
            if loc:
                day_plan["activities"].append(
                    {"time": "Sáng", "type": "visit", "location": loc}
                )
                current_loc = loc

            # TRƯA: Ăn uống (Tìm quán gần địa điểm sáng nhất)
            loc = pop_nearest(current_loc, pool_food)
            # Nếu hết quán ăn thì thôi, hoặc fallback (logic cũ)
            if loc:
                day_plan["activities"].append(
                    {"time": "Trưa", "type": "food", "location": loc}
                )
                current_loc = loc

            # CHIỀU: Tham quan (Tìm nơi gần quán ăn trưa nhất)
            # Nếu trưa ko ăn, thì tìm gần địa điểm sáng
            loc = pop_nearest(current_loc, pool_sightseeing)
            if loc:
                day_plan["activities"].append(
                    {"time": "Chiều", "type": "visit", "location": loc}
                )
                current_loc = loc

            # TỐI: Ăn uống / Chill (Tìm nơi gần địa điểm chiều nhất)
            loc = pop_nearest(current_loc, pool_food)

            # Nếu hết đồ ăn, thử tìm chỗ đi dạo tối (pool sightseeing)
            if not loc:
                loc = pop_nearest(current_loc, pool_sightseeing)

            if loc:
                # Check type để gán label đúng
                act_type = "food"
                cat_lower = loc.get("category", "").lower()
                if not any(k in cat_lower for k in food_keywords):
                    act_type = "visit"

                day_plan["activities"].append(
                    {"time": "Tối", "type": act_type, "location": loc}
                )

            itinerary.append(day_plan)

        print("DEBUG: Itinerary generated successfully with Spatial Optimization")
        return itinerary

    except Exception as e:
        print(f"[ERROR] Generating itinerary: {e}")
        import traceback

        traceback.print_exc()
        return []
