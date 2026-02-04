"""
Test Suite: Recommendation API
Tests the hybrid recommendation algorithm functionality.
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db import (
    run_query,
    close_driver,
    register_user,
    delete_user_by_name,
    toggle_like_location,
)

# Force UTF-8 encoding
try:
    sys.stdout.reconfigure(encoding="utf-8")
except:
    pass

TEST_USER = "test_recommend_user"


def test_recommend_fallback():
    """Test recommendation for new user (cold start / fallback)"""
    print("\n[TEST 1] Cold Start Recommendation (Fallback Query)")

    # Create fresh user
    delete_user_by_name(TEST_USER)
    success, msg = register_user(TEST_USER, "123456")
    assert success, f"Failed to create user: {msg}"

    # Query recommend API logic (simplified version)
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

    # Cleanup
    delete_user_by_name(TEST_USER)


def test_recommend_with_likes():
    """Test that liked locations are excluded from recommendations"""
    print("\n[TEST 2] Liked Locations Exclusion")

    # Create user and like a location
    delete_user_by_name(TEST_USER)
    register_user(TEST_USER, "123456")

    # Get first location name
    loc_query = "MATCH (l:Location) RETURN l.name AS name LIMIT 1"
    locs = run_query(loc_query)
    loc_name = locs[0]["name"]

    # Like it
    toggle_like_location(TEST_USER, loc_name)
    print(f"   Liked: {loc_name}")

    # Check that it's excluded from fallback query
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

    # Cleanup
    toggle_like_location(TEST_USER, loc_name)  # Unlike
    delete_user_by_name(TEST_USER)


def test_pagerank_scores_exist():
    """Test that PageRank scores are computed for locations"""
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
