"""
=============================================================================
app.py - Điểm khởi chạy chính của ứng dụng Flask
app.py - Main entry point for the Flask application
=============================================================================
Mô tả / Description:
    - Khởi tạo ứng dụng Flask và cấu hình các thành phần cốt lõi.
      Initializes the Flask application and configures core components.
    - Thiết lập Flask-Login để quản lý phiên người dùng (session).
      Sets up Flask-Login for user session management.
    - Đăng ký các Blueprint (auth, admin, api, main) để tổ chức route.
      Registers Blueprints (auth, admin, api, main) for route organization.
    - Đóng kết nối Neo4j khi ứng dụng tắt (cleanup).
      Closes Neo4j connection on application shutdown (cleanup).

Phụ thuộc / Dependencies:
    - Flask, Flask-Login, python-dotenv
    - Module db (kết nối Neo4j / Neo4j connection)
    - Module models (model User / User model)
    - Các Blueprint trong routes/ (route Blueprints in routes/)
=============================================================================
"""

from flask import Flask, jsonify, request, redirect, url_for
from flask_login import LoginManager
from dotenv import load_dotenv
import os
import atexit
import logging
import signal
from db import close_driver, get_user_info
from models import User

# -----------------------------------------------------------
# Import các Blueprint từ thư mục routes/
# Import Blueprints from routes/ directory
# -----------------------------------------------------------
from routes.auth import bp as auth_bp
from routes.admin import bp as admin_bp
from routes.api import bp as api_bp
from routes.main import bp as main_bp

# -----------------------------------------------------------
# Cấu hình logging cho toàn bộ ứng dụng
# Configure logging for the entire application
# -----------------------------------------------------------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ======================================================
# TẢI BIẾN MÔI TRƯỜNG & CẤU HÌNH ỨNG DỤNG
# LOAD ENVIRONMENT VARIABLES & APP CONFIGURATION
# ======================================================
load_dotenv()

# Lấy secret key từ file .env — bắt buộc phải có
# Get secret key from .env file — required
secret = os.getenv("FLASK_SECRET_KEY")
if not secret:
    raise RuntimeError("FLASK_SECRET_KEY chưa được cấu hình!")

# Khởi tạo ứng dụng Flask
# Initialize Flask application
app = Flask(__name__)
app.config["JSON_AS_ASCII"] = (
    False  # Hỗ trợ Unicode tiếng Việt / Support Vietnamese Unicode
)
app.secret_key = secret

# ======================================================
# CẤU HÌNH FLASK-LOGIN (Quản lý phiên đăng nhập)
# FLASK-LOGIN CONFIGURATION (Session management)
# ======================================================
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = "main.index"  # Redirect về trang chủ nếu chưa login / Redirect to homepage if not logged in


# -----------------------------------------------------------
# Xử lý trường hợp người dùng chưa xác thực (unauthorized)
# Handle unauthorized access (unauthenticated users)
# Nếu là API request → trả JSON 401
# If API request → return JSON 401
# Nếu không phải API → redirect về trang chủ
# If not API → redirect to homepage
# -----------------------------------------------------------
@login_manager.unauthorized_handler
def unauthorized_callback():
    # Kiểm tra xem request có phải là API call không
    # Check if the request is an API call
    if request.path.startswith("/api/"):
        return jsonify({"error": "Unauthorized - Vui lòng đăng nhập"}), 401
    # Nếu không phải API, redirect về trang login (index)
    # If not API, redirect to login page (index)
    return redirect(url_for("main.index"))


# -----------------------------------------------------------
# Đóng driver Neo4j khi ứng dụng kết thúc (cleanup)
# Close Neo4j driver on application exit (cleanup)
# Sử dụng cả atexit VÀ signal handler để đảm bảo driver
# luôn được đóng — kể cả khi bị Ctrl+C hoặc tắt terminal đột ngột.
# Uses both atexit AND signal handlers to ensure driver
# is always closed — even on Ctrl+C or sudden terminal close.
# -----------------------------------------------------------
atexit.register(close_driver)

def _cleanup_signal(signum, frame):
    """Xử lý tín hiệu tắt: đóng Neo4j driver rồi thoát / Signal handler: close driver then exit"""
    logger.info(f"⚠️ Nhận tín hiệu {signum}, đang đóng kết nối Neo4j...")
    close_driver()
    raise SystemExit(0)

signal.signal(signal.SIGINT, _cleanup_signal)
signal.signal(signal.SIGTERM, _cleanup_signal)


# -----------------------------------------------------------
# Hàm tải thông tin user từ session (Flask-Login callback)
# Load user info from session (Flask-Login callback)
# Được gọi tự động mỗi request để khôi phục current_user
# Auto-called on every request to restore current_user
# -----------------------------------------------------------
@login_manager.user_loader
def load_user(user_id):
    info = get_user_info(user_id)
    if info:
        return User(id=user_id, role=info.get("role", "user"))
    return None


# ======================================================
# ĐĂNG KÝ CÁC BLUEPRINT (Tổ chức route theo module)
# REGISTER BLUEPRINTS (Organize routes by module)
# ======================================================
# auth_bp: Đăng ký, đăng nhập, đăng xuất, đổi mật khẩu
#           Registration, login, logout, password reset
# admin_bp: Quản trị hệ thống (CRUD địa điểm, quản lý user)
#            System administration (location CRUD, user management)
# api_bp: API chính (gợi ý AI, đánh giá, lộ trình, like)
#          Main API (AI recommendations, reviews, itineraries, likes)
# main_bp: Trang chủ (serve index.html)
#           Homepage (serve index.html)
# -----------------------------------------------------------
app.register_blueprint(auth_bp)
app.register_blueprint(admin_bp)
app.register_blueprint(api_bp)
app.register_blueprint(main_bp)

# ======================================================
# KHỞI CHẠY SERVER (Development mode)
# START SERVER (Development mode)
# ======================================================
if __name__ == "__main__":
    logging.info("🚀 Server đang chạy tại: http://127.0.0.1:5000")
    app.run(port=5000, debug=True)
