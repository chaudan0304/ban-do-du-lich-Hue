from flask_login import UserMixin


class User(UserMixin):
    def __init__(self, id, role=None):
        self.id = id
        self.role = role or "user"

    def get_id(self):
        return self.id

    @property
    def is_admin(self):
        return self.role == "admin"

    def __repr__(self):
        return f"<User {self.id} role={self.role}>"
