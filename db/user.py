"""
=============================================================================
db/user.py - Các hàm xử lý User (Đăng ký, Đăng nhập, Hồ sơ)
db/user.py - User functions (Registration, Login, Profile)
=============================================================================
Mô tả / Description:
    - Đăng ký tài khoản mới với mật khẩu được hash (bcrypt).
      Register new accounts with hashed passwords (bcrypt).
    - Xác thực đăng nhập (verify username + password).
      Verify login credentials (verify username + password).
    - Quản lý hồ sơ người dùng (cập nhật tên, email, mật khẩu).
      Manage user profiles (update name, email, password).
    - Đặt lại mật khẩu khi quên (cần xác nhận email).
      Password reset when forgotten (requires email verification).
    - Lấy danh sách đánh giá và lượt thích của người dùng.
      Get user's reviews and likes lists.

Phụ thuộc / Dependencies:
    - werkzeug.security (hash & verify password)
    - db.connection (run_query, ConstraintViolationError)

Bảo mật / Security:
    - Mật khẩu LUÔN được hash trước khi lưu (generate_password_hash).
      Passwords are ALWAYS hashed before storing (generate_password_hash).
    - Xác thực bằng check_password_hash, KHÔNG so sánh text thường.
      Verification uses check_password_hash, NEVER plain text comparison.
=============================================================================
"""

import logging
from werkzeug.security import generate_password_hash, check_password_hash
from .connection import run_query, ConstraintViolationError

logger = logging.getLogger(__name__)


# =============================================================
# ĐĂNG KÝ TÀI KHOẢN MỚI (User Registration)
# Quy trình / Process:
#   1. Kiểm tra user đã tồn tại chưa
#      Check if user already exists
#   2. Hash mật khẩu bằng Werkzeug
#      Hash password using Werkzeug
#   3. Tạo node User mới trong Neo4j
#      Create new User node in Neo4j
# =============================================================
def register_user(username, password):
    """Đăng ký tài khoản mới (lưu hash password) / Register new account (stores hashed password)"""
    # 1. Kiểm tra user đã tồn tại chưa / Check if user already exists
    check_query = "MATCH (u:User {name: $name}) RETURN u"
    existing = run_query(check_query, {"name": username})

    if existing:
        return False, "Tài khoản đã tồn tại"

    # 2. Hash mật khẩu và lưu vào database / Hash password and save to database
    hashed_pw = generate_password_hash(password)
    create_query = """
    CREATE (u:User {name: $name, password: $password, role: 'user', created_at: datetime()})
    RETURN u
    """
    try:
        result = run_query(create_query, {"name": username, "password": hashed_pw})
        if result:
            return True, "Đăng ký thành công"
        return False, "Lỗi khi tạo tài khoản"
    except ConstraintViolationError:
        return False, "Tài khoản đã tồn tại"


# =============================================================
# LẤY THÔNG TIN NGƯỜI DÙNG (Get User Info)
# Trả về dict chứa: username, fullname, email, role, created_at
# Returns dict containing: username, fullname, email, role, created_at
# =============================================================
def get_user_info(username):
    """Lấy thông tin chi tiết người dùng / Get detailed user information"""
    query = """
    MATCH (u:User {name: $name})
    RETURN u.name as username, 
           u.fullname as fullname, 
           u.email as email, 
           u.role as role, 
           coalesce(toString(u.created_at), toString(datetime())) as created_at
    """
    result = run_query(query, {"name": username})
    return result[0] if result else None


# =============================================================
# CẬP NHẬT THÔNG TIN NGƯỜI DÙNG (Update User Profile)
# Hỗ trợ cập nhật: họ tên, email, mật khẩu (tùy chọn)
# Supports updating: fullname, email, password (optional)
# =============================================================
def update_user_info(username, fullname, email, new_password=None):
    """Cập nhật thông tin người dùng / Update user information"""
    params = {"name": username, "fullname": fullname, "email": email}

    query = """
    MATCH (u:User {name: $name})
    SET u.fullname = $fullname,
        u.email = $email
    """

    # Nếu có mật khẩu mới → hash và cập nhật
    # If new password provided → hash and update
    if new_password:
        hashed_pw = generate_password_hash(new_password)
        query += ", u.password = $password"
        params["password"] = hashed_pw

    query += " RETURN u"

    try:
        run_query(query, params)
        return True, "Cập nhật thành công"
    except Exception as e:
        return False, str(e)


# =============================================================
# XÁC THỰC ĐĂNG NHẬP (Login Verification)
# Returns: (success, role, fullname, message)
# - success: True/False
# - role: 'user' hoặc 'admin'
# - fullname: Họ tên đầy đủ (nếu có)
# - message: Thông báo kết quả
# =============================================================
def verify_user(username, password):
    """Xác thực đăng nhập / Verify login credentials"""
    query = "MATCH (u:User {name: $name}) RETURN u"
    result = run_query(query, {"name": username})

    if not result:
        return False, None, None, "Tài khoản không tồn tại"

    user_data = result[0]["u"]
    stored_hash = user_data.get("password")

    # Nếu user cũ chưa có pass (hoặc import từ file)
    # If old user has no password (or imported from file)
    if not stored_hash:
        return False, None, None, "Tài khoản lỗi (chưa có mật khẩu)"

    # So sánh hash password / Compare password hash
    if check_password_hash(stored_hash, password):
        return (
            True,
            user_data.get("role", "user"),
            user_data.get("fullname", ""),
            "Đăng nhập thành công",
        )
    else:
        return False, None, None, "Sai mật khẩu"


# =============================================================
# XÁC MINH TÀI KHOẢN (Account Verification — cho Quên mật khẩu)
# Kiểm tra username + email có khớp không
# Check if username + email match (for Forgot Password flow)
# =============================================================
def verify_user_account(username, email):
    """Kiểm tra xem username và email có khớp không / Check if username and email match"""
    query = (
        "MATCH (u:User {name: $name}) WHERE toLower(u.email) = toLower($email) RETURN u"
    )
    result = run_query(query, {"name": username, "email": email})
    return True if result else False


# =============================================================
# ĐẶT LẠI MẬT KHẨU (Password Reset)
# Quy trình / Process:
#   1. Xác minh username + email khớp nhau
#      Verify username + email match
#   2. Hash mật khẩu mới và cập nhật
#      Hash new password and update
# =============================================================
def reset_user_password(username, email, new_password):
    """
    Đặt lại mật khẩu nếu username và email trùng khớp.
    Reset password if username and email match.
    """
    # 1. Kiểm tra khớp thông tin / Verify matching info
    check_query = (
        "MATCH (u:User {name: $name}) WHERE toLower(u.email) = toLower($email) RETURN u"
    )
    user = run_query(check_query, {"name": username, "email": email})

    if not user:
        return False, "Thông tin tài khoản hoặc email không chính xác."

    # 2. Cập nhật mật khẩu mới (đã hash) / Update new password (hashed)
    new_hash = generate_password_hash(new_password)
    update_query = """
    MATCH (u:User {name: $name})
    SET u.password = $pass
    """
    run_query(update_query, {"name": username, "pass": new_hash})

    return True, "Đổi mật khẩu thành công! Hãy đăng nhập lại."


# =============================================================
# LẤY DANH SÁCH ĐÁNH GIÁ CỦA NGƯỜI DÙNG (Get User Reviews)
# Trả về: location, lat, lng, image, category, rating, comment, sentiment, timestamp
# Returns: location, lat, lng, image, category, rating, comment, sentiment, timestamp
# =============================================================
def get_user_reviews(username):
    """Lấy danh sách đánh giá của người dùng / Get list of user's reviews"""
    query = """
    MATCH (u:User {name: $username})-[r:REVIEWED]->(l:Location)
    OPTIONAL MATCH (l)-[:HAS_CATEGORY]->(c:Category)
    RETURN l.name as location, l.lat as lat, l.lng as lng, l.image as image, c.name as category,
           r.rating as rating, r.comment as comment, r.sentiment as sentiment, toString(r.timestamp) as timestamp
    ORDER BY r.timestamp DESC
    """
    return run_query(query, {"username": username})


# =============================================================
# LẤY DANH SÁCH ĐỊA ĐIỂM ĐÃ THÍCH (Get User Likes)
# Trả về: location, lat, lng, image, category
# Returns: location, lat, lng, image, category
# =============================================================
def get_user_likes(username):
    """Lấy danh sách địa điểm người dùng đã thích / Get list of user's liked locations"""
    query = """
    MATCH (u:User {name: $username})-[:LIKED]->(l:Location)
    OPTIONAL MATCH (l)-[:HAS_CATEGORY]->(c:Category)
    RETURN l.name as location, l.lat as lat, l.lng as lng, l.image as image, c.name as category
    ORDER BY l.name ASC
    """
    return run_query(query, {"username": username})
