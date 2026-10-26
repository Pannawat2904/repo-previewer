"""
โมดูลสำหรับสร้าง File Tree และอ่านเนื้อหาไฟล์ใน repository
รองรับการแสดงผลโค้ดพร้อมสีไวยากรณ์ ตรวจสอบ encoding ภาษาไทยไม่ให้เพี้ยน
และแสดงตัวอย่างรูปภาพ
"""

import base64
import mimetypes
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

TEXT_EXTENSIONS = {
    ".html", ".htm", ".css", ".js", ".mjs", ".jsx", ".ts", ".tsx",
    ".json", ".md", ".txt", ".py", ".pyw", ".sh", ".bash", ".zsh",
    ".yaml", ".yml", ".xml", ".svg", ".sql", ".ini", ".conf", ".env",
    ".gitignore", ".gitattributes", ".editorconfig",
}

IMAGE_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico", ".bmp"
}


def build_file_tree(repo_dir: Path) -> List[Dict[str, Any]]:
    """
    สร้างโครงสร้างต้นไม้โฟลเดอร์ (File Tree) ของ repository
    เรียงโฟลเดอร์ขึ้นก่อน แล้วตามด้วยไฟล์ตามลำดับตัวอักษร
    ข้าม hidden directories เช่น .git, .vscode, .repo_meta.json
    """
    repo_dir = repo_dir.resolve()

    def scan_dir(current_dir: Path) -> List[Dict[str, Any]]:
        entries = []
        try:
            items = list(current_dir.iterdir())
        except Exception:
            return []

        # กรองรายการที่ไม่ต้องการ
        filtered = []
        for item in items:
            name = item.name
            if name.startswith(".") and name not in (".gitignore", ".env"):
                continue
            if name == ".repo_meta.json":
                continue
            filtered.append(item)

        # แยกเป็นโฟลเดอร์และไฟล์ เรียงตามตัวอักษร
        dirs = sorted([x for x in filtered if x.is_dir()], key=lambda x: x.name.lower())
        files = sorted([x for x in filtered if x.is_file()], key=lambda x: x.name.lower())

        for d in dirs:
            rel = str(d.relative_to(repo_dir)).replace("\\", "/")
            children = scan_dir(d)
            entries.append({
                "name": d.name,
                "path": rel,
                "type": "directory",
                "children": children,
            })

        for f in files:
            rel = str(f.relative_to(repo_dir)).replace("\\", "/")
            suffix = f.suffix.lower()
            size = f.stat().st_size
            is_image = suffix in IMAGE_EXTENSIONS
            is_text = suffix in TEXT_EXTENSIONS or is_likely_text(f)

            file_type = "image" if is_image else ("text" if is_text else "binary")

            entries.append({
                "name": f.name,
                "path": rel,
                "type": "file",
                "file_type": file_type,
                "extension": suffix.lstrip("."),
                "size": size,
            })

        return entries

    return scan_dir(repo_dir)


def is_likely_text(file_path: Path) -> bool:
    """ตรวจสอบว่าไฟล์มีแนวโน้มเป็นไฟล์ข้อความหรือไม่โดยอ่านไบต์ส่วนหัว"""
    try:
        with open(file_path, "rb") as f:
            chunk = f.read(1024)
            if b"\x00" in chunk:
                return False
            return True
    except Exception:
        return False


def get_file_details(repo_dir: Path, rel_path: str) -> dict:
    """
    อ่านข้อมูลและเนื้อหาของไฟล์แบบปลอดภัย ป้องกัน Path Traversal
    ถอดรหัสข้อความด้วย utf-8, tis-620, cp874 เพื่อให้ภาษาไทยไม่เพี้ยน
    """
    repo_dir = repo_dir.resolve()
    target_file = (repo_dir / rel_path.lstrip("/")).resolve()

    # ตรวจสอบความปลอดภัย Path Traversal
    if not target_file.is_relative_to(repo_dir):
        return {"error": "ไม่ได้รับอนุญาตให้เข้าถึงไฟล์นอก repository"}

    if not target_file.is_file():
        return {"error": "ไม่พบไฟล์ที่ระบุ"}

    size = target_file.stat().st_size
    suffix = target_file.suffix.lower()
    name = target_file.name

    # 1. รูปภาพ
    if suffix in IMAGE_EXTENSIONS:
        mime_type, _ = mimetypes.guess_type(str(target_file))
        if not mime_type:
            mime_type = "image/png"
        try:
            with open(target_file, "rb") as f:
                b64 = base64.b64encode(f.read()).decode("utf-8")
            return {
                "name": name,
                "path": rel_path,
                "type": "image",
                "mime_type": mime_type,
                "size": size,
                "data_url": f"data:{mime_type};base64,{b64}",
            }
        except Exception as e:
            return {"error": f"อ่านไฟล์รูปภาพไม่สำเร็จ: {e}"}

    # 2. ไฟล์ข้อความ
    if suffix in TEXT_EXTENSIONS or is_likely_text(target_file):
        # จำกัดขนาดไฟล์ที่เปิดอ่านเพื่อความรวดเร็ว (ไม่เกิน 2MB)
        if size > 2 * 1024 * 1024:
            return {
                "name": name,
                "path": rel_path,
                "type": "binary",
                "size": size,
                "message": f"ไฟล์มีขนาดใหญ่เกินไป ({size // 1024} KB) เกินขีดจำกัดการเปิดอ่านในเบราว์เซอร์",
            }

        raw_bytes = target_file.read_bytes()
        content = None
        used_enc = "utf-8"

        for enc in ("utf-8", "utf-8-sig", "tis-620", "cp874", "latin1"):
            try:
                content = raw_bytes.decode(enc)
                used_enc = enc
                break
            except UnicodeDecodeError:
                continue

        if content is None:
            content = raw_bytes.decode("utf-8", errors="replace")
            used_enc = "utf-8 (lossy)"

        lines_count = content.count("\n") + 1
        return {
            "name": name,
            "path": rel_path,
            "type": "text",
            "extension": suffix.lstrip("."),
            "size": size,
            "content": content,
            "lines": lines_count,
            "encoding": used_enc,
        }

    # 3. ไฟล์ไบนารีอื่น ๆ
    return {
        "name": name,
        "path": rel_path,
        "type": "binary",
        "size": size,
        "message": f"ไฟล์ไบนารี ({name}, ขนาด {size} ไบต์)",
    }
