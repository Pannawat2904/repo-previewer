"""
Vercel Serverless Entrypoint with ASGI Inspector
"""

import json
import sys
from pathlib import Path

# เพิ่ม Root directory ของโปรเจกต์เข้า sys.path
root_dir = Path(__file__).resolve().parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from app import app as original_app


class VercelPathFixer:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            raw_path = scope.get("path", "")
            query_str = scope.get("query_string", b"").decode("latin1")

            # Endpoint พิเศษตรวจสอบ Scope และ Headers จาก Vercel จริง
            if "_whoami" in raw_path or "_whoami" in query_str:
                headers = {k.decode("latin1"): v.decode("latin1") for k, v in scope.get("headers", [])}
                data = json.dumps({
                    "scope_path": raw_path,
                    "scope_query": query_str,
                    "headers": headers,
                }, indent=2).encode("utf-8")

                await send({
                    "type": "http.response.start",
                    "status": 200,
                    "headers": [
                        (b"content-type", b"application/json"),
                        (b"content-length", str(len(data)).encode()),
                    ],
                })
                await send({
                    "type": "http.response.body",
                    "body": data,
                    "more_body": False,
                })
                return

        await self.app(scope, receive, send)


app = VercelPathFixer(original_app)
