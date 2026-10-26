"""
โมดูลสำหรับเสิร์ฟเว็บของแต่ละ repository ผ่าน HTTP จริง (127.0.0.1)
โดยเปิดพอร์ตแยกต่อ repo แบบ Lazy (เปิดเมื่อคลิกดู และปิดเมื่อไม่ใช้)

เหตุผลที่เลือกใช้ Port แยกต่อ Repo:
1. ปัญหา Absolute Path: เว็บนักเรียนที่เขียน path เป็น `/style.css` หรือ `/photo/a.jpg`
   จะสามารถเข้าถึงไฟล์ที่ root ของ repo ตัวเองได้ถูกต้อง ไม่วิ่งไปชนกับ root ของแอปหลัก
2. ความปลอดภัย (Origin Isolation): Origin ของนักเรียนจะเป็น http://127.0.0.1:<port>
   ซึ่งแยกจากแอปหลัก (เช่น http://127.0.0.1:8000) ทำให้ JavaScript ของนักเรียน
   ไม่สามารถเข้าถึง localStorage, Cookies หรือ DOM ของแอปหลักได้
3. ไม่ต้องรัน build tool หรือคอมไพเลอร์ใด ๆ ใช้ http.server ในตัวของ Python
"""

import atexit
import http.server
import logging
import os
import re
import socket
import threading
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# สคริปต์ขนาดเล็กที่ฉีดเข้าไปใน index.html เพื่อส่ง console error/warn
# และ load error (404) กลับมายังหน้าต่างแม่ (ครู)
CONSOLE_INJECT_SCRIPT = """
<!-- Injected by Repo Previewer for Observation Collection -->
<script>
(function() {
    function sendLog(type, data) {
        try {
            window.parent.postMessage({
                source: 'repo-previewer-sandbox',
                type: type,
                payload: data,
                timestamp: new Date().toISOString()
            }, '*');
        } catch (e) {}
    }

    // ดักจับ console.error และ console.warn
    var origError = console.error;
    console.error = function() {
        var args = Array.prototype.slice.call(arguments).map(function(a) {
            return typeof a === 'object' ? JSON.stringify(a) : String(a);
        });
        sendLog('console_error', { message: args.join(' ') });
        origError.apply(console, arguments);
    };

    var origWarn = console.warn;
    console.warn = function() {
        var args = Array.prototype.slice.call(arguments).map(function(a) {
            return typeof a === 'object' ? JSON.stringify(a) : String(a);
        });
        sendLog('console_warn', { message: args.join(' ') });
        origWarn.apply(console, arguments);
    };

    // ดักจับ uncaught javascript errors
    window.addEventListener('error', function(e) {
        if (e.target && (e.target.src || e.target.href)) {
            // โหลด resource ล้มเหลว (รูป, css, script 404)
            var src = e.target.src || e.target.href;
            sendLog('resource_error', {
                tagName: e.target.tagName ? e.target.tagName.toLowerCase() : 'unknown',
                url: src,
                message: 'ไม่สามารถโหลดไฟล์ได้ (404 หรือเชื่อมต่อไม่ได้): ' + src
            });
        } else if (e.message) {
            sendLog('runtime_error', {
                message: e.message,
                filename: e.filename,
                lineno: e.lineno,
                colno: e.colno
            });
        }
    }, true);
})();
</script>
"""


def find_free_port() -> int:
    """หาพอร์ตว่างบน 127.0.0.1"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        s.listen(1)
        port = s.getsockname()[1]
        return port


def find_index_html(repo_dir: Path) -> Tuple[bool, Optional[str], Optional[Path]]:
    """
    ค้นหาไฟล์ index.html ใน repository:
    1. ตรวจสอบที่ root ของ repo ก่อน
    2. ถ้าไม่พบ ให้ค้นหาในโฟลเดอร์ย่อย (ข้ามโฟลเดอร์ซ่อน เช่น .git, .vscode)
    
    คืนค่า (has_web, relative_path_to_index, absolute_path_to_index)
    """
    root_index = repo_dir / "index.html"
    if root_index.is_file():
        return True, "index.html", root_index

    # ค้นหา index.htm หรือ index.html ในโฟลเดอร์ย่อย
    candidates = []
    for ext in ("index.html", "index.htm", "Index.html", "INDEX.HTML"):
        for p in repo_dir.glob(f"**/{ext}"):
            # ข้าม hidden directory
            if any(part.startswith(".") for part in p.relative_to(repo_dir).parts):
                continue
            candidates.append(p)

    if candidates:
        # ใช้ไฟล์แรกที่พบ
        first_candidate = candidates[0]
        rel = str(first_candidate.relative_to(repo_dir)).replace("\\", "/")
        return True, rel, first_candidate

    return False, None, None


class RepoRequestHandler(http.server.SimpleHTTPRequestHandler):
    """
    Custom HTTP Request Handler สำหรับเสิร์ฟไฟล์ของนักเรียน
    - ผูกกับไดเรกทอรีของ repo นั้น ๆ
    - เพิ่ม CORS headers
    - ฉีด script เก็บ error เข้าไปใน HTML ตอบกลับ
    - ปิดการแสดงผล default log เพื่อไม่ให้รบกวน terminal
    """
    def __init__(self, *args, directory=None, **kwargs):
        super().__init__(*args, directory=directory, **kwargs)

    def log_message(self, format, *args):
        # ไม่แสดง access log ปกติใน terminal แต่เก็บไว้ใน debug logger
        logger.debug("%s - - [%s] %s\n" % (self.address_string(), self.log_date_time_string(), format % args))

    def end_headers(self):
        # อนุญาต CORS และปิดแคชเบราว์เซอร์ เพื่อให้เห็นผลการแก้ทันที
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def do_GET(self):
        # ตรวจสอบว่าเป็นการขอไฟล์ HTML หรือไม่ เพื่อทำการฉีด logging script
        clean_path = self.path.split("?")[0].split("#")[0]
        file_path = Path(self.directory) / clean_path.lstrip("/")

        if file_path.is_dir():
            file_path = file_path / "index.html"

        if file_path.is_file() and file_path.suffix.lower() in (".html", ".htm"):
            try:
                # อ่านไฟล์ HTML ด้วย encoding หลากหลาย
                content = None
                for enc in ("utf-8", "utf-8-sig", "tis-620", "cp874", "latin1"):
                    try:
                        content = file_path.read_text(encoding=enc)
                        break
                    except Exception:
                        continue

                if content is not None:
                    # ฉีดสคริปต์ไว้ก่อน </head> หรือ </body> หรือหัวไฟล์
                    if "</head>" in content:
                        content = content.replace("</head>", f"{CONSOLE_INJECT_SCRIPT}\n</head>", 1)
                    elif "</body>" in content:
                        content = content.replace("</body>", f"{CONSOLE_INJECT_SCRIPT}\n</body>", 1)
                    else:
                        content = CONSOLE_INJECT_SCRIPT + content

                    encoded = content.encode("utf-8")
                    self.send_response(200)
                    self.send_header("Content-Type", "text/html; charset=utf-8")
                    self.send_header("Content-Length", str(len(encoded)))
                    self.end_headers()
                    self.wfile.write(encoded)
                    return
            except Exception as e:
                logger.warning("Error injecting script into HTML: %s", e)

        # สำหรับไฟล์อื่น ๆ ให้ SimpleHTTPRequestHandler จัดการตามปกติ
        super().do_GET()


class RepoServerInstance:
    """ตัวแทนอินสแตนซ์ของเซิร์ฟเวอร์สำหรับ 1 repo"""
    def __init__(self, owner: str, repo: str, root_dir: Path, port: int, index_rel: str):
        self.owner = owner
        self.repo = repo
        self.root_dir = root_dir
        self.port = port
        self.index_rel = index_rel
        self.last_accessed = time.time()
        self.server: Optional[http.server.ThreadingHTTPServer] = None
        self.thread: Optional[threading.Thread] = None

    @property
    def key(self) -> str:
        return f"{self.owner.lower()}/{self.repo.lower()}"

    @property
    def url(self) -> str:
        """URL สำหรับเปิดพรีวิว"""
        if self.index_rel and self.index_rel != "index.html":
            return f"http://127.0.0.1:{self.port}/{self.index_rel}"
        return f"http://127.0.0.1:{self.port}/"

    def start(self):
        handler_factory = lambda *args, **kwargs: RepoRequestHandler(
            *args, directory=str(self.root_dir), **kwargs
        )
        self.server = http.server.ThreadingHTTPServer(("127.0.0.1", self.port), handler_factory)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        logger.info(f"Started preview server for {self.key} at {self.url}")

    def stop(self):
        if self.server:
            try:
                self.server.shutdown()
                self.server.server_close()
            except Exception as e:
                logger.warning(f"Error closing server for {self.key}: {e}")
            self.server = None
            self.thread = None
            logger.info(f"Stopped preview server for {self.key}")


class ServerManager:
    """
    ผู้จัดการพอร์ตและเซิร์ฟเวอร์พรีวิวทั้งหมด:
    - Lazy Start เมื่อมีการร้องขอ
    - ปิดเซิร์ฟเวอร์เก่าอัตโนมัติหากเกินขีดจำกัด (เช่น เกิน 10 เซิร์ฟเวอร์พร้อมกัน)
    """
    def __init__(self, max_active_servers: int = 10):
        self.active_servers: Dict[str, RepoServerInstance] = {}
        self.lock = threading.Lock()
        self.max_active_servers = max_active_servers

    def get_or_start(self, owner: str, repo: str, repo_dir: Path) -> dict:
        key = f"{owner.lower()}/{repo.lower()}"
        with self.lock:
            # ตรวจสอบว่า repo นี้เป็นเว็บสถิตหรือไม่ (มี index.html หรือไม่)
            has_web, index_rel, index_abs = find_index_html(repo_dir)
            if not has_web:
                return {
                    "key": key,
                    "has_web": False,
                    "message": "ไม่ใช่เว็บสถิต ดูได้เฉพาะโค้ด",
                    "url": None,
                    "port": None,
                    "index_rel": None,
                }

            # กรณีรันบน Vercel (Serverless): ไม่สามารถเปิด TCP Port ในพื้นหลังได้
            # ให้ส่ง URL เป็น Route พิเศษ /preview-site/{owner}/{repo}/{index_rel}
            if os.environ.get("VERCEL"):
                preview_path = index_rel if index_rel and index_rel != "index.html" else "index.html"
                return {
                    "key": key,
                    "has_web": True,
                    "message": "พร้อมพรีวิว (Vercel Serverless)",
                    "url": f"/preview-site/{owner}/{repo}/{preview_path}",
                    "port": None,
                    "index_rel": index_rel,
                    "is_subfolder": index_rel != "index.html",
                }

            # ตรวจสอบว่ามีเซิร์ฟเวอร์ทำงานอยู่แล้วหรือไม่ (Local run)
            instance = self.active_servers.get(key)
            if instance and instance.server:
                instance.last_accessed = time.time()
                return {
                    "key": key,
                    "has_web": True,
                    "message": "พร้อมพรีวิว",
                    "url": instance.url,
                    "port": instance.port,
                    "index_rel": instance.index_rel,
                    "is_subfolder": instance.index_rel != "index.html",
                }

            # ถ้าเปิดเซิร์ฟเวอร์เกิน max_active_servers ให้ปิดตัวที่เก่าที่สุดก่อน
            if len(self.active_servers) >= self.max_active_servers:
                oldest_key = min(self.active_servers.keys(), key=lambda k: self.active_servers[k].last_accessed)
                self.active_servers[oldest_key].stop()
                del self.active_servers[oldest_key]

            # หาพอร์ตว่างและเริ่มเซิร์ฟเวอร์ใหม่
            port = find_free_port()
            instance = RepoServerInstance(owner, repo, repo_dir, port, index_rel or "index.html")
            instance.start()
            self.active_servers[key] = instance

            return {
                "key": key,
                "has_web": True,
                "message": "พร้อมพรีวิว",
                "url": instance.url,
                "port": instance.port,
                "index_rel": instance.index_rel,
                "is_subfolder": instance.index_rel != "index.html",
            }

    def stop(self, owner: str, repo: str):
        key = f"{owner.lower()}/{repo.lower()}"
        with self.lock:
            if key in self.active_servers:
                self.active_servers[key].stop()
                del self.active_servers[key]

    def stop_all(self):
        with self.lock:
            for instance in self.active_servers.values():
                instance.stop()
            self.active_servers.clear()


# อินสแตนซ์กลางสำหรับแอปพลิเคชัน
server_manager = ServerManager()

# ลงทะเบียนปิดเซิร์ฟเวอร์ทั้งหมดเมื่อโปรแกรมสิ้นสุดการทำงาน
atexit.register(server_manager.stop_all)
