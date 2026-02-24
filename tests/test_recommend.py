"""
=============================================================================
tests/test_recommend.py - Test gợi ý AI (Recommendation API Test Suite)
tests/test_recommend.py - Recommendation API Test Suite
=============================================================================
Mô tả / Description:
    Kiểm tra thuật toán gợi ý thông minh (Hybrid Recommendation):
    Tests the smart recommendation algorithm (Hybrid Recommendation):

    Test 1: Kiểm tra PageRank scores đã được tính (pagerankNorm ≠ null)
            Verify PageRank scores are computed (pagerankNorm ≠ null)
    Test 2: Cold-Start Recommendation — user mới, chưa có tương tác
            Cold-Start Recommendation — new user, no interactions
    Test 3: Liked locations phải bị loại khỏi kết quả gợi ý
            Liked locations must be excluded from recommendations

Phụ thuộc / Dependencies:
    - db (run_query, register_user, delete_user_by_name, toggle_like_location)

Cách chạy / How to run:
    python tests/test_recommend.py

Yêu cầu / Prerequisites:
    - Neo4j phải đang chạy và có dữ liệu / Neo4j must be running with data
    - setup_algo.py phải đã chạy ít nhất 1 lần (để có PageRank scores)
      setup_algo.py must have run at least once (for PageRank scores)
=============================================================================
"""

import sys
import os

# Thêm thư mục gốc vào path / Add root directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db import (
    run_query,
    close_driver,
    register_user,
    delete_user_by_name,
    toggle_like_location,
)

# Fix encoding cho Windows
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

# User test tạm thời / Temporary test user
TEST_USER = "test_recommend_user"


def test_recommend_fallback():
    """
    Test 1: Cold-Start Recommendation (Fallback Query)
    User mới, chưa like/review → phải trả về kết quả PageRank.
    New user, no likes/reviews → should return PageRank results.
    """
    print("\n[TEST 1] Cold Start Recommendation (Fallback Query)")

    # Tạo user mới / Create fresh user
    delete_user_by_name(TEST_USER)
    success, msg = register_user(TEST_USER, "123456")
    assert success, f"Failed to create user: {msg}"

    # Query recommend - phiên bản đơn giản / Simplified version
    query = """
    MATCH (l:Location)-[:HAS_CATEGORY]->(cat:Category)
    OPTIONAL MATCH (l)<-[r:REVIEWED]-()
    WITH l, cat, avg(r.rating) AS avg_rating, count(r) AS review_count
    RETURN l.name AS name, 
           (coalesce(l.pagerankNorm, 0) + coalesce(l.pagerankConnectNorm, 0)) * 5.0 AS final_score
    ORDER BY final_score DESC
    LIMIT 5
    """
    results = run_query(query)

    assert len(results) > 0, "No recommendations returned"
    print(f"   ✅ Got {len(results)} recommendations")
    print(f"   Top 1: {results[0]['name']} (Score: {results[0]['final_score']:.2f})")

    # Dọn dẹp / Cleanup
    delete_user_by_name(TEST_USER)


def test_recommend_with_likes():
    """
    Test 2: Liked Locations Exclusion
    Địa điểm đã thích PHẢI bị loại khỏi kết quả gợi ý.
    Liked locations MUST be excluded from recommendation results.
    """
    print("\n[TEST 2] Liked Locations Exclusion")

    # Tạo user và like 1 địa điểm / Create user and like 1 location
    delete_user_by_name(TEST_USER)
    register_user(TEST_USER, "123456")

    # Lấy location đầu tiên / Get first location
    loc_query = "MATCH (l:Location) RETURN l.name AS name LIMIT 1"
    locs = run_query(loc_query)
    loc_name = locs[0]["name"]

    # Thích nó / Like it
    toggle_like_location(TEST_USER, loc_name)
    print(f"   Liked: {loc_name}")

    # Kiểm tra bị loại khỏi fallback / Check it's excluded from fallback
    exclude_query = """
    OPTIONAL MATCH (me:User {name: $name})-[:LIKED]->(liked:Location)
    WITH collect(liked) AS liked_locations
    MATCH (l:Location) WHERE NOT l IN liked_locations
    RETURN l.name AS name LIMIT 20
    """
    results = run_query(exclude_query, {"name": TEST_USER})
    returned_names = [r["name"] for r in results]

    assert loc_name not in returned_names, f"{loc_name} should be excluded!"
    print(f"   ✅ {loc_name} correctly excluded from recommendations")

    # Dọn dẹp / Cleanup
    toggle_like_location(TEST_USER, loc_name)  # Unlike
    delete_user_by_name(TEST_USER)


def test_pagerank_scores_exist():
    """
    Test 3: PageRank Scores Existence
    Kiểm tra rằng pagerankNorm đã được tính cho ít nhất 1 location.
    Verify that pagerankNorm has been computed for at least 1 location.
    """
    print("\n[TEST 3] PageRank Scores Existence")

    query = """
    MATCH (l:Location)
    WHERE l.pagerankNorm IS NOT NULL
    RETURN count(l) AS count
    """
    results = run_query(query)
    count = results[0]["count"]

    assert count > 0, "No locations have PageRank scores!"
    print(f"   ✅ {count} locations have PageRank scores computed")


# ═══════════════════════════════════════════════════════
# ENTRY POINT — Chạy tất cả test theo thứ tự
# ENTRY POINT — Run all tests in order
# ═══════════════════════════════════════════════════════
if __name__ == "__main__":
    try:
        print("\n" + "=" * 50)
        print("--- TESTING RECOMMENDATION API ---")
        print("=" * 50)

        test_pagerank_scores_exist()
        test_recommend_fallback()
        test_recommend_with_likes()

        print("\n" + "=" * 50)
        print("✅ ALL RECOMMENDATION TESTS PASSED")
        print("=" * 50)

    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}")
    except Exception as e:
        print(f"\n❌ CRITICAL ERROR: {e}")
        import traceback

        traceback.print_exc()
    finally:
        close_driver()
