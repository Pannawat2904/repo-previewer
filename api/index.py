"""
Vercel Serverless Entrypoint with ASGI Path Rewriter
"""

import sys
from pathlib import Path
from urllib.parse import parse_qs

# เพิ่ม Root directory ของโปรเจกต์เข้า sys.path
root_dir = Path(__file__).resolve().parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from app import app as original_app


class VercelPathFixer:
    """
    ASGI Middleware สำหรับแก้ไข scope['path'] เมื่อรันบน Vercel:
    เมื่อ Vercel ทำการ Rewrite มายัง /api/index.py ค่า scope['path'] อาจเพี้ยนเป็น /api/index.py
    ทำให้ FastAPI หา route ไม่เจอ (404 Not Found)
    Middleware นี้จะดึง Path ดั้งเดิมจาก Header 'x-matched-path' หรือ query param '__vercel_path'
    """
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] in ("http", "websocket"):
            headers = dict(scope.get("headers", []))

            # 1. ดึง path จริงจาก Header 'x-matched-path' ของ Vercel
            raw_matched = headers.get(b"x-matched-path")
            if raw_matched:
                matched_str = raw_matched.decode("utf-8").split("?")[0]
                if matched_str:
                    scope["path"] = matched_str
            else:
                # 2. ดึงจาก query parameter '__vercel_path' ถ้ามี
                query_string = scope.get("query_string", b"").decode("utf-8")
                if "__vercel_path=" in query_string:
                    params = parse_qs(query_string)
                    if "__vercel_path" in params:
                        v_path = params["__vercel_path"][0]
                        scope["path"] = "/" + v_path.lstrip("/")

            # 3. ถ้า scope['path'] ยังคงเป็น /api/index.py, /api/index หรือ /api ให้ชี้ไปที่ Root (/)
            current_path = scope.get("path", "")
            if current_path in ("/api/index.py", "/api/index", "/api", "/api/", ""):
                scope["path"] = "/"

        await self.app(scope, receive, send)


# Vercel Python Serverless runtime จะเรียกใช้ตัวแปร app นี้
app = VercelPathFixer(original_app)
