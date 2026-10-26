"""
โมดูลสำหรับจัดเก็บบันทึก (Notes) และสถานะ "ดูแล้ว" (Viewed) ของนักเรียนแต่ละคน
บันทึกลงไฟล์ JSON ในเครื่อง (data/reviews.json) เพื่อให้รีเฟรชหรือเปิดใหม่แล้วข้อมูลไม่หาย
"""

import json
import logging
import threading
from pathlib import Path
from typing import Dict, Optional

from previewer.fetch import get_base_data_dir

logger = logging.getLogger(__name__)

STORAGE_FILE = get_base_data_dir() / "reviews.json"
_lock = threading.Lock()


def load_all_reviews() -> Dict[str, dict]:
    """โหลดข้อมูลการตรวจและบันทึกทั้งหมด"""
    with _lock:
        if not STORAGE_FILE.exists():
            return {}
        try:
            with open(STORAGE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f"Error loading review storage: {e}")
            return {}


def get_review(repo_key: str) -> dict:
    """ดึงข้อมูลบันทึกของ repo นั้น ๆ (เช่น 'viewed': True, 'note': '...')"""
    reviews = load_all_reviews()
    return reviews.get(repo_key.lower(), {"viewed": False, "note": ""})


def save_review(repo_key: str, viewed: Optional[bool] = None, note: Optional[str] = None) -> dict:
    """บันทึกหรืออัปเดตสถานะ 'ดูแล้ว' และโน้ตย่อของ repo"""
    clean_key = repo_key.lower()
    with _lock:
        STORAGE_FILE.parent.mkdir(parents=True, exist_ok=True)
        data = {}
        if STORAGE_FILE.exists():
            try:
                with open(STORAGE_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
            except Exception:
                data = {}

        current = data.get(clean_key, {"viewed": False, "note": ""})
        if viewed is not None:
            current["viewed"] = bool(viewed)
        if note is not None:
            current["note"] = str(note)

        data[clean_key] = current

        # เขียนไฟล์แบบ atomic ปลอดภัย
        temp_file = STORAGE_FILE.with_suffix(".tmp")
        with open(temp_file, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        temp_file.replace(STORAGE_FILE)

        return current
