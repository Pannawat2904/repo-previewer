"""
Vercel Serverless Entrypoint with Diagnostic Inspector
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
            query_bytes = scope.get("query_string", b"")
            if b"test=1" in query_bytes:
                headers_dict = {
                    k.decode("latin1", "replace"): v.decode("latin1", "replace")
                    for k, v in scope.get("headers", [])
                }
                data = json.dumps({
                    "path": scope.get("path"),
                    "raw_path": scope.get("raw_path", b"").decode("latin1", "replace"),
                    "query_string": query_bytes.decode("latin1", "replace"),
                    "headers": headers_dict,
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
