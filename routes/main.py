"""
=============================================================================
routes/main.py - Route trang chủ (Homepage Route)
routes/main.py - Homepage Route
=============================================================================
Mô tả / Description:
    - Serve trang chủ (index.html) khi truy cập URL gốc "/".
      Serves the homepage (index.html) when accessing root URL "/".
    - Đây là điểm vào chính của ứng dụng trên trình duyệt.
      This is the main entry point of the application in the browser.

Phụ thuộc / Dependencies:
    - Flask (Blueprint, render_template)
=============================================================================
"""

from flask import Blueprint, render_template

# Đăng ký Blueprint "main" — xử lý route trang chủ
# Register "main" Blueprint — handles homepage route
bp = Blueprint("main", __name__)


# -----------------------------------------------------------
# ROUTE TRANG CHỦ — Serve file index.html
# HOMEPAGE ROUTE — Serve index.html file
# Tất cả logic UI được xử lý bởi JavaScript phía client
# All UI logic is handled by client-side JavaScript
# -----------------------------------------------------------
@bp.route("/")
def index():
    return render_template("index.html")
