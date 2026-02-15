"""
db/user.py - Các hàm xử lý User (đăng ký, đăng nhập, profile)
"""

import logging
from werkzeug.security import generate_password_hash, check_password_hash
from .connection import run_query, ConstraintViolationError

logger = logging.getLogger(__name__)


def register_user(username, password):
    """Đăng ký tài khoản mới (lưu hash password)"""
    # 1. Kiểm tra user đã tồn tại chưa
    check_query = "MATCH (u:User {name: $name}) RETURN u"
    existing = run_query(check_query, {"name": username})

    if existing:
        return False, "Tài khoản đã tồn tại"

    # 2. Hash mật khẩu và lưu
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


def get_user_info(username):
    """Lấy thông tin chi tiết người dùng"""
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


def update_user_info(username, fullname, email, new_password=None):
    """Cập nhật thông tin người dùng"""
    params = {"name": username, "fullname": fullname, "email": email}

    query = """
    MATCH (u:User {name: $name})
    SET u.fullname = $fullname,
        u.email = $email
    """

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


def verify_user(username, password):
    """Xác thực đăng nhập"""
    query = "MATCH (u:User {name: $name}) RETURN u"
    result = run_query(query, {"name": username})

    if not result:
        return False, None, None, "Tài khoản không tồn tại"

    user_data = result[0]["u"]
    stored_hash = user_data.get("password")

    # Nếu user cũ chưa có pass (hoặc import từ file), có thể check text thường (tùy chọn)
    if not stored_hash:
        return False, None, None, "Tài khoản lỗi (chưa có mật khẩu)"

    if check_password_hash(stored_hash, password):
        return (
            True,
            user_data.get("role", "user"),
            user_data.get("fullname", ""),
            "Đăng nhập thành công",
        )
    else:
        return False, None, None, "Sai mật khẩu"


def verify_user_account(username, email):
    """Kiểm tra xem username và email có khớp không"""
    query = (
        "MATCH (u:User {name: $name}) WHERE toLower(u.email) = toLower($email) RETURN u"
    )
    result = run_query(query, {"name": username, "email": email})
    return True if result else False


def reset_user_password(username, email, new_password):
    """
    Đặt lại mật khẩu nếu username và email trùng khớp.
    """
    # 1. Kiểm tra khớp thông tin
    check_query = (
        "MATCH (u:User {name: $name}) WHERE toLower(u.email) = toLower($email) RETURN u"
    )
    user = run_query(check_query, {"name": username, "email": email})

    if not user:
        return False, "Thông tin tài khoản hoặc email không chính xác."

    # 2. Cập nhật mật khẩu mới
    new_hash = generate_password_hash(new_password)
    update_query = """
    MATCH (u:User {name: $name})
    SET u.password = $pass
    """
    run_query(update_query, {"name": username, "pass": new_hash})

    return True, "Đổi mật khẩu thành công! Hãy đăng nhập lại."


def get_user_reviews(username):
    """Lấy danh sách đánh giá của người dùng"""
    query = """
    MATCH (u:User {name: $username})-[r:REVIEWED]->(l:Location)
    OPTIONAL MATCH (l)-[:HAS_CATEGORY]->(c:Category)
    RETURN l.name as location, l.lat as lat, l.lng as lng, l.image as image, c.name as category,
           r.rating as rating, r.comment as comment, r.sentiment as sentiment, toString(r.timestamp) as timestamp
    ORDER BY r.timestamp DESC
    """
    return run_query(query, {"username": username})


def get_user_likes(username):
    """Lấy danh sách địa điểm người dùng đã thích"""
    query = """
    MATCH (u:User {name: $username})-[:LIKED]->(l:Location)
    OPTIONAL MATCH (l)-[:HAS_CATEGORY]->(c:Category)
    RETURN l.name as location, l.lat as lat, l.lng as lng, l.image as image, c.name as category
    ORDER BY l.name ASC
    """
    return run_query(query, {"username": username})
