"""
=============================================================================
tests/test_auth.py - Test xác thực người dùng (Authentication Test Suite)
tests/test_auth.py - Authentication Test Suite
=============================================================================
Mô tả / Description:
    Kiểm tra tất cả chức năng xác thực người dùng:
    Tests all user authentication functionality:

    Test 1: Đăng ký tài khoản mới + kiểm tra trùng lặp
            Register new account + check duplicate
    Test 2: Đăng nhập (đúng/sai mật khẩu)
            Login (correct/wrong password)
    Test 3: Xem thông tin hồ sơ
            View profile info
    Test 4: Cập nhật hồ sơ (fullname, email)
            Update profile (fullname, email)
    Cleanup: Xóa user test sau khi hoàn tất
             Delete test user after completion

Phụ thuộc / Dependencies:
    - db (register_user, verify_user, get_user_info, update_user_info, delete_user_by_name)

Cách chạy / How to run:
    python tests/test_auth.py
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
    verify_user,
    get_user_info,
    update_user_info,
    delete_user_by_name,
)

# Fix encoding cho Windows / Fix encoding for Windows
try:
    sys.stdout.reconfigure(encoding="utf-8")
except:
    pass

# User test tạm thời — sẽ bị xóa sau khi test xong
# Temporary test user — will be deleted after test completes
TEST_USER = "test_auth_user"
TEST_PASS = "SecurePass123"


def test_register_user():
    """
    Test 1: Đăng ký tài khoản / Register Account
    - Tạo user mới → phải thành công / Create new user → should succeed
    - Thử đăng ký trùng → phải thất bại / Try duplicate → should fail
    """
    print("\n[TEST 1] User Registration")

    # Dọn dẹp trước / Cleanup first
    delete_user_by_name(TEST_USER)

    # Đăng ký / Register
    success, msg = register_user(TEST_USER, TEST_PASS)
    assert success, f"Registration failed: {msg}"
    print(f"   ✅ User '{TEST_USER}' registered successfully")

    # Thử đăng ký trùng / Try duplicate registration
    success2, msg2 = register_user(TEST_USER, TEST_PASS)
    assert not success2, "Duplicate registration should fail!"
    print(f"   ✅ Duplicate registration correctly rejected")


def test_login_user():
    """
    Test 2: Đăng nhập / Login
    - Mật khẩu đúng → thành công / Correct password → succeed
    - Mật khẩu sai → thất bại / Wrong password → fail
    """
    print("\n[TEST 2] User Login")

    # Mật khẩu đúng / Correct password
    success, role, fullname, msg = verify_user(TEST_USER, TEST_PASS)
    assert success, f"Login with correct password should succeed: {msg}"
    print(f"   ✅ Login successful for '{TEST_USER}'")

    # Mật khẩu sai / Wrong password
    success_wrong, _, _, _ = verify_user(TEST_USER, "WrongPassword")
    assert not success_wrong, "Login with wrong password should fail"
    print(f"   ✅ Login with wrong password correctly rejected")


def test_get_user_info():
    """
    Test 3: Xem thông tin user / Get User Info
    - User tồn tại → trả về thông tin / User exists → returns info
    - Username khớp / Username matches
    """
    print("\n[TEST 3] Get User Info")

    info = get_user_info(TEST_USER)
    assert info is not None, "User info should be returned"
    assert info.get("username") == TEST_USER, "Username mismatch"
    print(f"   ✅ User info retrieved: {info.get('username')}")


def test_update_user_info():
    """
    Test 4: Cập nhật hồ sơ / Update Profile
    - Thay đổi fullname và email / Change fullname and email
    - Kiểm tra giá trị đã cập nhật / Verify updated values
    """
    print("\n[TEST 4] Update User Info")

    new_fullname = "Test User Fullname"
    new_email = "test@example.com"

    success, msg = update_user_info(TEST_USER, new_fullname, new_email)
    assert success, f"Update should succeed: {msg}"

    # Xác nhận cập nhật / Verify update
    info = get_user_info(TEST_USER)
    assert info.get("fullname") == new_fullname, "Fullname not updated"
    assert info.get("email") == new_email, "Email not updated"
    print(f"   ✅ Profile updated: {new_fullname}, {new_email}")


def test_cleanup():
    """
    Cleanup: Xóa user test / Delete test user
    - Xóa user → phải thành công / Delete user → should succeed
    - Kiểm tra user đã bị xóa / Verify user is deleted
    """
    print("\n[CLEANUP] Deleting test user")
    delete_user_by_name(TEST_USER)

    # Xác nhận đã xóa / Verify deletion
    info = get_user_info(TEST_USER)
    assert info is None, "User should be deleted"
    print(f"   ✅ Test user '{TEST_USER}' deleted")


# ═══════════════════════════════════════════════════════
# ENTRY POINT — Chạy tất cả test theo thứ tự
# ENTRY POINT — Run all tests in order
# ═══════════════════════════════════════════════════════
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
