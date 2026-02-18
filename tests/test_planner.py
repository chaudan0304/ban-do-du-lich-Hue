"""
=============================================================================
tests/test_planner.py - Test lộ trình AI (AI Planner Integration Tests)
tests/test_planner.py - AI Planner Integration Tests
=============================================================================
Mô tả / Description:
    Kiểm tra tích hợp của hàm generate_itinerary() trong db/planner.py.
    Integration tests for generate_itinerary() function in db/planner.py.

    Test 1: Tạo lộ trình 1 ngày, không có preferences (fallback mode)
            Generate 1-day itinerary, no preferences (fallback mode)
    Test 2: Tạo lộ trình 2 ngày với preferences 'Ẩm thực' và 'Di tích'
            Generate 2-day itinerary with 'Ẩm thực' and 'Di tích' preferences

Phụ thuộc / Dependencies:
    - db (generate_itinerary, register_user, delete_user_by_name)

Cách chạy / How to run:
    python tests/test_planner.py

Lưu ý / Notes:
    - Tạo user tạm thời và xóa sau khi test xong.
      Creates temporary user and deletes after test.
    - User mới không có likes → planner sẽ dùng fallback/AI gợi ý.
      New user has no likes → planner will use fallback/AI suggestion.
=============================================================================
"""

from db import (
    generate_itinerary,
    close_driver,
    run_query,
    register_user,
    delete_user_by_name,
)
import sys

# Fix encoding cho Windows / Fix encoding for Windows
try:
    sys.stdout.reconfigure(encoding="utf-8")
except:
    pass

# User test tạm thời / Temporary test user
TEST_USER = "test_planner_user"

try:
    print("\n" + "=" * 50)
    print("--- TESTING AI PLANNER (INTEGRATION) ---")
    print("=" * 50)

    # ─── SETUP: Tạo user test / Create test user ───
    print(f"\n[SETUP] Creating temporary user: {TEST_USER}")
    delete_user_by_name(TEST_USER)  # Dọn dẹp nếu còn / Clean if exists
    success, msg = register_user(TEST_USER, "123456")
    if success:
        print("User created successfully.")
    else:
        print(f"User creation failed: {msg}")

    # ═══════════════════════════════════════════════════════
    # TEST 1: Lộ trình cơ bản (1 ngày, không preferences)
    # TEST 1: Basic itinerary (1 day, no preferences)
    # User mới → không có likes → sẽ dùng fallback query
    # New user → no likes → will use fallback query
    # ═══════════════════════════════════════════════════════
    print("\n[TEST 1] 1 Day, No Prefs")
    plan1 = generate_itinerary(TEST_USER, 1, [])
    print(f"Plan 1 Result: {len(plan1)} days")
    if len(plan1) > 0:
        print(f"Day 1 Activities: {len(plan1[0]['activities'])}")
        for act in plan1[0]["activities"]:
            loc = act["location"]
            print(f"  - {loc['name']} ({loc.get('category', 'Unknown')})")
    else:
        print("❌ Test 1 Failed: No plan generated")

    # ═══════════════════════════════════════════════════════
    # TEST 2: Lộ trình với preferences (2 ngày, 'Ẩm thực' + 'Di tích')
    # TEST 2: Itinerary with preferences (2 days, 'Ẩm thực' + 'Di tích')
    # Kiểm tra lọc theo category có hoạt động đúng
    # Verify category filtering works correctly
    # ═══════════════════════════════════════════════════════
    print("\n[TEST 2] 2 Days, Preferences: 'Ẩm thực', 'Di tích'")
    plan2 = generate_itinerary(TEST_USER, 2, ["Ẩm thực", "Di tích"])
    print(f"Plan 2 Result: {len(plan2)} days")
    if len(plan2) > 0:
        for i, day in enumerate(plan2):
            print(f"Day {i+1} Activities: {len(day['activities'])}")
            for act in day["activities"]:
                loc = act["location"]
                print(f"  - {loc['name']} ({loc.get('category', 'Unknown')})")
    else:
        print("❌ Test 2 Failed: No plan generated")

    # ─── TEARDOWN: Xóa user test / Delete test user ───
    print(f"\n[TEARDOWN] Deleting user: {TEST_USER}")
    delete_user_by_name(TEST_USER)
    print("Clean up complete.")

except Exception as e:
    print(f"CRITICAL ERROR: {e}")
    import traceback

    traceback.print_exc()
finally:
    close_driver()
