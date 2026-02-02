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

bp = Blueprint("auth", __name__)


# --- ROUTE API ---
@bp.route("/api/register", methods=["POST"])
def api_register():
    data = request.get_json()
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()

    if not username or not password:
        return jsonify({"error": "Vui lòng nhập đầy đủ tài khoản và mật khẩu"}), 400

    if len(username) < 3:
        return jsonify({"error": "Tên tài khoản phải có ít nhất 3 ký tự"}), 400

    if len(password) < 3:
        return jsonify({"error": "Mật khẩu phải có ít nhất 3 ký tự"}), 400

    success, message = register_user(username, password)
    if success:
        return jsonify({"success": True, "message": message}), 201
    else:
        return jsonify({"success": False, "error": message}), 400


@bp.route("/api/login", methods=["POST"])
def api_login():
    data = request.json
    username = data.get("username")
    password = data.get("password")

    success, role, fullname, message = verify_user(username, password)

    if success:
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


@bp.route("/api/logout", methods=["POST"])
@login_required
def api_logout():
    logout_user()
    return jsonify({"message": "Đã đăng xuất"}), 200


@bp.route("/api/current_user", methods=["GET"])
def get_current_user():
    if current_user.is_authenticated:
        info = get_user_info(current_user.id)
        fullname = info.get("fullname", "") if info else ""
        return jsonify(
            {
                "is_logged_in": True,
                "username": current_user.id,
                "fullname": fullname or current_user.id,
            }
        )
    else:
        return jsonify({"is_logged_in": False})


@bp.route("/api/profile", methods=["GET", "POST"])
@login_required
def api_profile_handler():
    # GET: Lấy thông tin
    if request.method == "GET":
        info = get_user_info(current_user.id)
        if info:
            return jsonify(info)
        return jsonify({"error": "Không tìm thấy thông tin"}), 404

    # POST: Cập nhật
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
