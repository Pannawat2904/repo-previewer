"""
โมดูลสำหรับวิเคราะห์และตรวจหาข้อสังเกตของ repository เช่น:
1. ไฟล์ที่ index.html อ้างถึง (src/href) แต่หาไม่เจอ พร้อมแนะนำ path ที่ถูกต้อง
2. ตรวจสอบว่า index.html อยู่ในโฟลเดอร์ย่อยหรือไม่
3. ข้อมูล commit และ metadata
"""

import json
import logging
import os
import re
from html.parser import HTMLParser
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple
from urllib.parse import unquote, urlparse

logger = logging.getLogger(__name__)


class HTMLRefParser(HTMLParser):
    """Parser สกัดแท็กและแอตทริบิวต์ src/href จาก HTML"""
    def __init__(self):
        super().__init__()
        self.references: List[Tuple[str, str, str, int]] = []  # (tag, attr, url, lineno)

    def handle_starttag(self, tag, attrs):
        lineno = self.getpos()[0]
        for attr, val in attrs:
            if not val:
                continue
            if attr.lower() in ("src", "href"):
                self.references.append((tag.lower(), attr.lower(), val.strip(), lineno))


def is_external_or_special_url(url: str) -> bool:
    """ตรวจสอบว่าเป็น URL ภายนอกหรือ URL พิเศษที่ไม่ใช่ไฟล์ในเครื่อง"""
    lower = url.lower()
    if lower.startswith(("http://", "https://", "//", "mailto:", "tel:", "#", "javascript:", "data:")):
        return True
    return False


def build_repo_file_index(repo_dir: Path) -> Dict[str, List[Path]]:
    """
    สร้างดัชนีชื่อไฟล์ทั้งหมดใน repo (key คือชื่อไฟล์แบบตัวพิมพ์เล็ก)
    ใช้สำหรับค้นหาไฟล์ชื่อเดียวกันที่อยู่ผิดโฟลเดอร์เพื่อแนะนำ path ที่ถูก
    """
    index: Dict[str, List[Path]] = {}
    for p in repo_dir.glob("**/*"):
        if p.is_file():
            # ข้ามไฟล์ใน .git, .vscode, .repo_meta.json
            rel = p.relative_to(repo_dir)
            if any(part.startswith(".") for part in rel.parts):
                continue
            fname_lower = p.name.lower()
            if fname_lower not in index:
                index[fname_lower] = []
            index[fname_lower].append(p)
    return index


def inspect_repository(repo_dir: Path, original_url: str = "") -> dict:
    """
    วิเคราะห์ repository คืนค่าข้อมูลข้อสังเกตทั้งหมด
    """
    observations: List[dict] = []
    meta_info: dict = {}

    # 1. อ่าน metadata ที่บันทึกไว้
    meta_file = repo_dir / ".repo_meta.json"
    if meta_file.exists():
        try:
            with open(meta_file, "r", encoding="utf-8") as f:
                meta_info = json.load(f)
        except Exception:
            pass

    # 2. ตรวจสอบตำแหน่ง index.html
    root_index = repo_dir / "index.html"
    index_file = None
    if root_index.is_file():
        index_file = root_index
    else:
        # หา index.html ในโฟลเดอร์ย่อย
        for ext in ("index.html", "index.htm", "Index.html"):
            candidates = [
                p for p in repo_dir.glob(f"**/{ext}")
                if not any(part.startswith(".") for part in p.relative_to(repo_dir).parts)
            ]
            if candidates:
                index_file = candidates[0]
                rel_path = str(index_file.relative_to(repo_dir)).replace("\\", "/")
                observations.append({
                    "category": "structure",
                    "type": "warning",
                    "title": "index.html ไม่อยู่ที่โฟลเดอร์หลัก (Root)",
                    "detail": f"พบ index.html อยู่ในโฟลเดอร์ย่อย: '{rel_path}'",
                })
                break

    if not index_file:
        observations.append({
            "category": "structure",
            "type": "info",
            "title": "ไม่พบไฟล์ index.html",
            "detail": "repository นี้อาจไม่ใช่เว็บสถิต (ไม่มีหน้าเว็บเริ่มต้น HTML)",
        })
        return {
            "has_web": False,
            "observations": observations,
            "meta": meta_info,
        }

    # 3. อ่านและ parse index.html เพื่อตรวจหา Broken Links (src/href)
    content = ""
    for enc in ("utf-8", "utf-8-sig", "tis-620", "cp874", "latin1"):
        try:
            content = index_file.read_text(encoding=enc)
            break
        except Exception:
            continue

    if not content:
        observations.append({
            "category": "html",
            "type": "error",
            "title": "อ่านไฟล์ index.html ไม่สำเร็จ",
            "detail": "ไม่สามารถถอดรหัสข้อความไฟล์ index.html ได้",
        })
        return {
            "has_web": True,
            "observations": observations,
            "meta": meta_info,
        }

    parser = HTMLRefParser()
    try:
        parser.feed(content)
    except Exception as e:
        logger.warning(f"Error parsing HTML: {e}")

    file_index = build_repo_file_index(repo_dir)
    index_dir = index_file.parent

    for tag, attr, ref_url, lineno in parser.references:
        if is_external_or_special_url(ref_url):
            continue

        # ตัด query string และ hash fragment ออกก่อนตรวจไฟล์ในเครื่อง
        clean_ref = ref_url.split("?")[0].split("#")[0]
        clean_ref = unquote(clean_ref)
        if not clean_ref:
            continue

        # คำนวณ path ของไฟล์ปลายทาง
        if clean_ref.startswith("/"):
            # Absolute path relative to repo root
            target_path = repo_dir / clean_ref.lstrip("/")
        else:
            # Relative path relative to index.html directory
            target_path = (index_dir / clean_ref).resolve()

        # ตรวจสอบว่าไฟล์มีอยู่จริงหรือไม่
        if not target_path.is_file():
            # ไม่พบไฟล์! หาคำแนะนำจากไฟล์ที่มีชื่อเดียวกันใน repo
            target_filename = Path(clean_ref).name
            target_filename_lower = target_filename.lower()
            matching_files = file_index.get(target_filename_lower, [])

            suggestion = None
            if matching_files:
                # คำนวณ relative path จาก index_dir ไปยังไฟล์ที่พบ
                best_match = matching_files[0]
                try:
                    rel_to_index = os.path.relpath(best_match, index_dir).replace("\\", "/")
                    suggestion = rel_to_index
                except ValueError:
                    rel_to_repo = str(best_match.relative_to(repo_dir)).replace("\\", "/")
                    suggestion = rel_to_repo

            observations.append({
                "category": "missing_file",
                "type": "error",
                "tag": tag,
                "attr": attr,
                "raw_ref": ref_url,
                "lineno": lineno,
                "title": f"ไม่พบไฟล์ที่อ้างถึง: {attr}=\"{ref_url}\"",
                "detail": f"แท็ก <{tag}> บรรทัดที่ {lineno} อ้างอิง '{ref_url}' แต่ไม่พบไฟล์บนดิสก์",
                "suggestion": suggestion,
            })

    return {
        "has_web": True,
        "observations": observations,
        "meta": meta_info,
    }
