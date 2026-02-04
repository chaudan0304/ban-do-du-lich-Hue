"""
Test Suite: User Authentication
Tests user registration, login, and profile functionality.
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db import (
    run_query,
    close_driver,
    register_user,
    verify_user,
    get_user_info,
    update_user_info,
    delete_user_by_name,
)

# Force UTF-8 encoding
try:
    sys.stdout.reconfigure(encoding="utf-8")
except:
    pass

TEST_USER = "test_auth_user"
TEST_PASS = "SecurePass123"


def test_register_user():
    """Test user registration"""
    print("\n[TEST 1] User Registration")

    # Cleanup first
    delete_user_by_name(TEST_USER)

    # Register
    success, msg = register_user(TEST_USER, TEST_PASS)
    assert success, f"Registration failed: {msg}"
    print(f"   ✅ User '{TEST_USER}' registered successfully")

    # Try duplicate registration
    success2, msg2 = register_user(TEST_USER, TEST_PASS)
    assert not success2, "Duplicate registration should fail!"
    print(f"   ✅ Duplicate registration correctly rejected")


def test_login_user():
    """Test user login verification"""
    print("\n[TEST 2] User Login")

    # Correct password - returns (success, role, fullname, message)
    success, role, fullname, msg = verify_user(TEST_USER, TEST_PASS)
    assert success, f"Login with correct password should succeed: {msg}"
    print(f"   ✅ Login successful for '{TEST_USER}'")

    # Wrong password
    success_wrong, _, _, _ = verify_user(TEST_USER, "WrongPassword")
    assert not success_wrong, "Login with wrong password should fail"
    print(f"   ✅ Login with wrong password correctly rejected")


def test_get_user_info():
    """Test getting user profile info"""
    print("\n[TEST 3] Get User Info")

    info = get_user_info(TEST_USER)
    assert info is not None, "User info should be returned"
    assert info.get("username") == TEST_USER, "Username mismatch"
    print(f"   ✅ User info retrieved: {info.get('username')}")


def test_update_user_info():
    """Test updating user profile"""
    print("\n[TEST 4] Update User Info")

    new_fullname = "Test User Fullname"
    new_email = "test@example.com"

    success = update_user_info(TEST_USER, new_fullname, new_email)
    assert success, "Update should succeed"

    # Verify update
    info = get_user_info(TEST_USER)
    assert info.get("fullname") == new_fullname, "Fullname not updated"
    assert info.get("email") == new_email, "Email not updated"
    print(f"   ✅ Profile updated: {new_fullname}, {new_email}")


def test_cleanup():
    """Cleanup test user"""
    print("\n[CLEANUP] Deleting test user")
    delete_user_by_name(TEST_USER)

    # Verify deletion
    info = get_user_info(TEST_USER)
    assert info is None, "User should be deleted"
    print(f"   ✅ Test user '{TEST_USER}' deleted")


if __name__ == "__main__":
    try:
        print("\n" + "=" * 50)
        print("--- TESTING USER AUTHENTICATION ---")
        print("=" * 50)

        test_register_user()
        test_login_user()
        test_get_user_info()
        test_update_user_info()
        test_cleanup()

        print("\n" + "=" * 50)
        print("✅ ALL AUTHENTICATION TESTS PASSED")
        print("=" * 50)

    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}")
    except Exception as e:
        print(f"\n❌ CRITICAL ERROR: {e}")
        import traceback

        traceback.print_exc()
    finally:
        close_driver()
