from flask import Flask, jsonify, request, redirect, url_for
from flask_login import LoginManager
from dotenv import load_dotenv
import os
import atexit
import logging
from db import close_driver, get_user_info
from models import User

# Blueprints
from routes.auth import bp as auth_bp
from routes.admin import bp as admin_bp
from routes.api import bp as api_bp
from routes.main import bp as main_bp

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Ẩn log HTTP request từ werkzeug (quá nhiều noise)
logging.getLogger("werkzeug").setLevel(logging.WARNING)

# ======================================================
# LOAD ENV & APP CONFIG
# ======================================================
load_dotenv()

secret = os.getenv("FLASK_SECRET_KEY")
if not secret:
    raise RuntimeError("FLASK_SECRET_KEY chưa được cấu hình!")

app = Flask(__name__)
app.config["JSON_AS_ASCII"] = False
app.secret_key = secret

# ======================================================
# FLASK LOGIN CONFIG
# ======================================================
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = "main.index"  # Redirect về trang chủ nếu chưa login


# Custom unauthorized handler để trả về JSON cho API requests
@login_manager.unauthorized_handler
def unauthorized_callback():
    # Kiểm tra xem request có phải là API call không
    if request.path.startswith("/api/"):
        return jsonify({"error": "Unauthorized - Vui lòng đăng nhập"}), 401
    # Nếu không phải API, redirect về trang login (index)
    return redirect(url_for("main.index"))


# Đóng driver Neo4j khi ứng dụng kết thúc
atexit.register(close_driver)


# Hàm tải user từ session
@login_manager.user_loader
def load_user(user_id):
    info = get_user_info(user_id)
    if info:
        return User(id=user_id, role=info.get("role", "user"))
    return None


# ======================================================
# REGISTER BLUEPRINTS
# ======================================================
app.register_blueprint(auth_bp)
app.register_blueprint(admin_bp)
app.register_blueprint(api_bp)
app.register_blueprint(main_bp)

if __name__ == "__main__":
    logging.info("🚀 Server đang chạy tại: http://127.0.0.1:5000")
    app.run(port=5000, debug=True)
