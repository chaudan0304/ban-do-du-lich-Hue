from db import run_query, close_driver
from werkzeug.security import generate_password_hash


def create_admin():
    username = "admin"
    password = "123"  # Mật khẩu admin của bạn

    pw_hash = generate_password_hash(password)

    query = """
    MERGE (u:User {name: $name})
    SET u.password = $pw_hash, u.role = 'admin'
    RETURN u.name
    """
    run_query(query, {"name": username, "pw_hash": pw_hash})
    print(f"✅ Đã tạo tài khoản Admin: {username} / {password}")
    close_driver()


if __name__ == "__main__":
    create_admin()
