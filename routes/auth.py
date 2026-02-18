"""
=============================================================================
routes/auth.py - Route xác thực người dùng (Authentication Routes)
routes/auth.py - Authentication Routes
=============================================================================
Mô tả / Description:
    - API đăng ký tài khoản mới (POST /api/register).
      API for new account registration (POST /api/register).
    - API đăng nhập (POST /api/login).
      API for login (POST /api/login).
    - API đăng xuất (POST /api/logout).
      API for logout (POST /api/logout).
    - API xác minh tài khoản + đặt lại mật khẩu.
      API for account verification + password reset.
    - API lấy/cập nhật thông tin người dùng hiện tại.
      API for getting/updating current user info.

Phụ thuộc / Dependencies:
    - Flask, Flask-Login
    - models.User
    - db (register_user, verify_user, get_user_info, ...)

Bảo mật / Security:
    - Validate input (độ dài username, password) trước khi xử lý.
      Validates input (username/password length) before processing.
    - Sử dụng Flask-Login session-based authentication.
      Uses Flask-Login session-based authentication.
    - @login_required bảo vệ các route cần xác thực.
      @login_required protects routes requiring authentication.
=============================================================================
"""

from flask import Blueprint, jsonify, request
from flask_login import login_user, logout_user, login_required, current_user
from models import User
from db import (
    register_user,
    verify_user,
    verify_user_account,
    reset_user_password,
    get_user_info,
    update_user_info,
)

# Đăng ký Blueprint "auth" — xử lý xác thực
# Register "auth" Blueprint — handles authentication
bp = Blueprint("auth", __name__)


# =============================================================
# API ĐĂNG KÝ TÀI KHOẢN (User Registration)
# POST /api/register
# Body: {"username": "...", "password": "..."}
# Validation: username >= 3 ký tự, password >= 6 ký tự
# =============================================================
@bp.route("/api/register", methods=["POST"])
def api_register():
    data = request.get_json()
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()

    # Validate input / Kiểm tra dữ liệu đầu vào
    if not username or not password:
        return jsonify({"error": "Vui lòng nhập đầy đủ tài khoản và mật khẩu"}), 400

    if len(username) < 3:
        return jsonify({"error": "Tên tài khoản phải có ít nhất 3 ký tự"}), 400

    if len(password) < 6:
        return jsonify({"error": "Mật khẩu phải có ít nhất 6 ký tự"}), 400

    # Gọi hàm đăng ký trong db / Call registration function in db
    success, message = register_user(username, password)
    if success:
        return jsonify({"success": True, "message": message}), 201
    else:
        return jsonify({"success": False, "error": message}), 400


# =============================================================
# API ĐĂNG NHẬP (User Login)
# POST /api/login
# Body: {"username": "...", "password": "..."}
# Trả về: username, fullname, role nếu thành công
# Returns: username, fullname, role if successful
# =============================================================
@bp.route("/api/login", methods=["POST"])
def api_login():
    data = request.json
    username = data.get("username")
    password = data.get("password")

    # Xác thực tài khoản / Verify credentials
    success, role, fullname, message = verify_user(username, password)

    if success:
        # Tạo session đăng nhập qua Flask-Login
        # Create login session via Flask-Login
        user = User(id=username, role=role)
        login_user(user)
        return (
            jsonify(
                {
                    "success": True,
                    "message": "Đăng nhập thành công!",
                    "username": username,
                    "fullname": fullname or username,
                    "role": role,
                }
            ),
            200,
        )
    else:
        return jsonify({"error": message}), 401


# =============================================================
# API XÁC MINH TÀI KHOẢN (Account Verification — Bước 1 Quên mật khẩu)
# POST /api/verify-account
# Body: {"username": "...", "email": "..."}
# Kiểm tra username + email có khớp trong database không
# Checks if username + email match in database
# =============================================================
@bp.route("/api/verify-account", methods=["POST"])
def api_verify_account():
    data = request.json
    username = data.get("username", "").strip()
    email = data.get("email", "").strip()

    if not username or not email:
        return jsonify({"success": False, "error": "Vui lòng nhập đủ thông tin"}), 400

    is_valid = verify_user_account(username, email)
    if is_valid:
        return jsonify({"success": True})
    else:
        return (
            jsonify({"success": False, "error": "Thông tin tài khoản không chính xác"}),
            200,
        )


# =============================================================
# API ĐẶT LẠI MẬT KHẨU (Password Reset — Bước 2)
# POST /api/reset-password
# Body: {"username": "...", "email": "...", "new_password": "..."}
# Yêu cầu: new_password >= 6 ký tự
# =============================================================
@bp.route("/api/reset-password", methods=["POST"])
def api_reset_password():
    data = request.json
    username = data.get("username", "").strip()
    email = data.get("email", "").strip()
    new_password = data.get("new_password", "").strip()

    if not username or not email or not new_password:
        return jsonify({"success": False, "error": "Vui lòng nhập đủ thông tin"}), 400

    if len(new_password) < 6:
        return jsonify({"success": False, "error": "Mật khẩu mới quá ngắn"}), 400

    success, message = reset_user_password(username, email, new_password)

    if success:
        return jsonify({"success": True, "message": message})
    else:
        return jsonify({"success": False, "error": message}), 400


# =============================================================
# API ĐĂNG XUẤT (Logout)
# POST /api/logout
# Yêu cầu: Phải đăng nhập (login_required)
# Xóa session Flask-Login
# =============================================================
@bp.route("/api/logout", methods=["POST"])
@login_required
def api_logout():
    logout_user()
    return jsonify({"message": "Đã đăng xuất"}), 200


# =============================================================
# API LẤY THÔNG TIN NGƯỜI DÙNG HIỆN TẠI (Get Current User)
# GET /api/current_user
# Không cần login_required — trả về is_logged_in: false nếu chưa đăng nhập
# No login_required — returns is_logged_in: false if not logged in
# =============================================================
@bp.route("/api/current_user", methods=["GET"])
def get_current_user():
    if current_user.is_authenticated:
        info = get_user_info(current_user.id)
        fullname = info.get("fullname", "") if info else ""
        role = info.get("role", "user") if info else "user"
        return jsonify(
            {
                "is_logged_in": True,
                "username": current_user.id,
                "fullname": fullname or current_user.id,
                "role": role,
            }
        )
    else:
        return jsonify({"is_logged_in": False})


# =============================================================
# API HỒ SƠ NGƯỜI DÙNG (User Profile — GET/POST)
# GET /api/profile — Lấy thông tin hồ sơ / Get profile info
# POST /api/profile — Cập nhật hồ sơ / Update profile
# Body POST: {"fullname": "...", "email": "...", "password": "..." (optional)}
# =============================================================
@bp.route("/api/profile", methods=["GET", "POST"])
@login_required
def api_profile_handler():
    # GET: Lấy thông tin / Get info
    if request.method == "GET":
        info = get_user_info(current_user.id)
        if info:
            return jsonify(info)
        return jsonify({"error": "Không tìm thấy thông tin"}), 404

    # POST: Cập nhật / Update
    if request.method == "POST":
        data = request.json
        fullname = data.get("fullname", "").strip()
        email = data.get("email", "").strip()
        password = data.get("password", "").strip()

        success, msg = update_user_info(
            current_user.id, fullname, email, password if password else None
        )
        if success:
            return jsonify({"success": True, "message": msg})
        else:
            return jsonify({"success": False, "error": msg}), 400
