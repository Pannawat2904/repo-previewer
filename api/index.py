"""
Vercel Serverless Entrypoint with ASGI Path Rewriter
"""

import sys
from pathlib import Path
from urllib.parse import parse_qs, urlencode

# เพิ่ม Root directory ของโปรเจกต์เข้า sys.path
root_dir = Path(__file__).resolve().parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from app import app as original_app


class VercelPathFixer:
    """
    ASGI Middleware สำหรับแก้ไข scope['path'] เมื่อรันบน Vercel:
    vercel.json ส่ง __vercel_path มากับ query string เพื่อระบุ path ต้นฉบับที่แท้จริง
    Middleware นี้จะดึง __vercel_path มาตั้งค่า scope['path'] ให้ FastAPI match route ถูกต้อง
    และล้าง __vercel_path ออกจาก query_string เพื่อไม่ให้ปนกับพารามิเตอร์ของแอป
    """
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] in ("http", "websocket"):
            query_string = scope.get("query_string", b"").decode("utf-8")
            if "__vercel_path=" in query_string:
                params = parse_qs(query_string, keep_blank_values=True)
                if "__vercel_path" in params:
                    v_path = params.pop("__vercel_path")[0]
                    # ตั้ง path ให้ตรงกับที่ client เรียกจริง เช่น /api/links/parse หรือ /static/app.css
                    scope["path"] = "/" + v_path.lstrip("/")
                    # ทำความสะอาด query_string ไม่ให้มี __vercel_path ตกค้าง
                    scope["query_string"] = urlencode(params, doseq=True).encode("utf-8")

            # หาก scope['path'] ยังคงเป็นไฟล์ entrypoint หรือว่างเปล่า ให้ชี้ไปที่ Root (/)
            current_path = scope.get("path", "")
            if current_path in ("/api/index.py", "/api/index", "/api", "/api/", ""):
                scope["path"] = "/"

        await self.app(scope, receive, send)


# Vercel Python Serverless runtime จะเรียกใช้ตัวแปร app นี้
app = VercelPathFixer(original_app)
