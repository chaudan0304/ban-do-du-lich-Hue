"""
=============================================================================
routes/__init__.py - Package khởi tạo cho Routes (Routes Package Init)
routes/__init__.py - Routes Package Init
=============================================================================
Mô tả / Description:
    Package rỗng — đánh dấu thư mục `routes/` là Python package.
    Empty package — marks the `routes/` directory as a Python package.
    Cho phép import các Blueprint từ bên ngoài.
    Allows importing Blueprints from outside.

Cấu trúc / Structure:
    routes/
    ├── __init__.py    ← File này / This file
    ├── main.py        → Blueprint "main"  (trang chủ / homepage)
    ├── auth.py        → Blueprint "auth"  (xác thực / authentication)
    ├── admin.py       → Blueprint "admin" (quản trị / administration)
    └── api.py         → Blueprint "api"   (API dữ liệu / data APIs)
=============================================================================
"""
