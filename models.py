"""
=============================================================================
models.py - Định nghĩa Model người dùng (User Model)
models.py - User Model definition
=============================================================================
Mô tả / Description:
    - Định nghĩa class User kế thừa UserMixin của Flask-Login.
      Defines the User class inheriting from Flask-Login's UserMixin.
    - Cung cấp các thuộc tính cần thiết cho hệ thống xác thực:
      Provides required properties for the authentication system:
        + id: Tên đăng nhập (username)
        + role: Vai trò ('user' hoặc 'admin') / Role ('user' or 'admin')
        + is_admin: Kiểm tra quyền admin / Check admin permission

Phụ thuộc / Dependencies:
    - flask_login.UserMixin

Ghi chú / Notes:
    - UserMixin tự động cung cấp: is_authenticated, is_active, is_anonymous
      UserMixin auto-provides: is_authenticated, is_active, is_anonymous
    - Không lưu password trong model — chỉ lưu trong Neo4j database
      Password is NOT stored in model — only stored in Neo4j database
=============================================================================
"""

from flask_login import UserMixin


class User(UserMixin):
    """
    Model đại diện cho một người dùng trong hệ thống.
    Represents a user in the system.

    Attributes:
        id (str): Tên đăng nhập duy nhất / Unique username
        role (str): Vai trò — 'user' (mặc định) hoặc 'admin'
                    Role — 'user' (default) or 'admin'
    """

    def __init__(self, id, role=None):
        self.id = id
        self.role = role or "user"

    def get_id(self):
        """Trả về ID người dùng (Flask-Login yêu cầu) / Return user ID (required by Flask-Login)"""
        return self.id

    @property
    def is_admin(self):
        """Kiểm tra xem user có phải admin không / Check if user is admin"""
        return self.role == "admin"

    def __repr__(self):
        """Biểu diễn chuỗi cho debug / String representation for debugging"""
        return f"<User {self.id} role={self.role}>"
