from db import (
    generate_itinerary,
    close_driver,
    run_query,
    register_user,
    delete_user_by_name,
)
import sys

# Force UTF-8 encoding
try:
    sys.stdout.reconfigure(encoding="utf-8")
except:
    pass

TEST_USER = "test_planner_user"

try:
    print("\n" + "=" * 50)
    print("--- TESTING AI PLANNER (INTEGRATION) ---")
    print("=" * 50)

    # 1. Setup: Ensure user exists
    print(f"\n[SETUP] Creating temporary user: {TEST_USER}")
    # Delete if exists to be clean
    delete_user_by_name(TEST_USER)
    success, msg = register_user(TEST_USER, "123456")
    if success:
        print("User created successfully.")
    else:
        print(f"User creation failed: {msg}")

    # 2. Test 1: Basic (Fallback likely, unless we add history)
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

    # 3. Test 2: With Preferences (Accented)
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

    # 4. Teardown
    print(f"\n[TEARDOWN] Deleting user: {TEST_USER}")
    delete_user_by_name(TEST_USER)
    print("Clean up complete.")

except Exception as e:
    print(f"CRITICAL ERROR: {e}")
    import traceback

    traceback.print_exc()
finally:
    close_driver()
