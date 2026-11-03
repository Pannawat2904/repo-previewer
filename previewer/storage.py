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
ASSIGNMENTS_FILE = get_base_data_dir() / "assignments.json"
CONFIG_FILE = get_base_data_dir() / "config.json"
_lock = threading.RLock()


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


DEFAULT_ASSIGNMENT_PROMPT = """คำชี้แจง ให้นักเรียนพัฒนาโปรแกรมภาษา Python สำหรับจัดการข้อมูลสินค้า โดยใช้ Class เป็นแม่แบบในการสร้าง Object และใช้ Method สำหรับแสดงข้อมูลและคำนวณราคารวม

งานนี้เป็นการต่อยอดจากใบงานที่ 3 ซึ่งใช้ตัวแปรและฟังก์ชัน มาเป็นการจัดเก็บข้อมูลและพฤติกรรมไว้ภายในคลาส

ข้อกำหนดของโปรแกรม
• สร้างคลาสชื่อ Product
• กำหนด Property ได้แก่ name, price และ quantity
• สร้าง Method ชื่อ show_info() สำหรับแสดงรายละเอียดสินค้า
• คำนวณราคารวมด้วยสูตร ราคาต่อชิ้น x จำนวนสินค้า
• สร้าง Object อย่างน้อย 2 รายการ โดยให้มีข้อมูลสินค้าแตกต่างกัน
• เรียกใช้ Method เพื่อแสดงข้อมูลของ Object แต่ละรายการ
• จัด Indentation ของ Class และ Method ให้ถูกต้อง
• ตรวจสอบว่าโปรแกรมสามารถทำงานและแสดงผลลัพธ์ได้ถูกต้อง

สิ่งที่ต้องส่ง
• ไฟล์โปรแกรม Python ชื่อ work4_product_class.py
• ภาพหน้าจอผลลัพธ์หลังจากรันโปรแกรมสำเร็จ

** นักเรียนสามารถเลือกชื่อสินค้าและกำหนดราคาเองได้ โดยต้องสร้าง Object อย่างน้อย 2 รายการ และคำนวณผลลัพธ์ได้ถูกต้อง"""


DEFAULT_OOP_ASSIGNMENTS = [
    {
        "id": "work-1",
        "title": "งานที่ 1 การประกาศฟังก์ชันและคำนวณเบื้องต้น",
        "prompt": "คำชี้แจง ให้นักเรียนพัฒนาฟังก์ชัน Python คำนวณผลลัพธ์และแสดงผลให้ถูกต้อง",
        "max_score": 10,
    },
    {
        "id": "work-2",
        "title": "งานที่ 2 การสร้าง Class และ Object พื้นฐาน",
        "prompt": "ข้อกำหนดของโปรแกรม\n• สร้างคลาสชื่อ Student\n• กำหนด Property ได้แก่ student_id, name, score\n• สร้าง Method ชื่อ show_student() เพื่อแสดงข้อมูลนักเรียน\n• สร้าง Object อย่างน้อย 2 รายการ",
        "max_score": 10,
    },
    {
        "id": "work-3",
        "title": "งานที่ 3 การจัดการข้อมูลบัญชี (BankAccount Class)",
        "prompt": "ข้อกำหนดของโปรแกรม\n• สร้างคลาสชื่อ BankAccount\n• กำหนด Property ได้แก่ account_id, owner_name, balance\n• สร้าง Method ชื่อ show_balance() สำหรับแสดงยอดเงิน\n• สร้าง Object อย่างน้อย 2 รายการ",
        "max_score": 10,
    },
    {
        "id": "work-4",
        "title": "งานที่ 4 โปรแกรมจัดการข้อมูลสินค้า (Product Class)",
        "prompt": DEFAULT_ASSIGNMENT_PROMPT,
        "max_score": 10,
    },
]


def load_all_assignments() -> Dict[str, dict]:
    """โหลดข้อมูลโจทย์และเกณฑ์ตรวจทั้งหมด"""
    with _lock:
        if not ASSIGNMENTS_FILE.exists():
            return {}
        try:
            with open(ASSIGNMENTS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f"Error loading assignments storage: {e}")
            return {}


def get_assignment(course_id: str) -> dict:
    """ดึงข้อมูลโจทย์ของวิชา/งานนั้น ๆ พร้อมรายการงานย่อยทั้งหมด"""
    assignments = load_all_assignments()
    course_data = assignments.get(course_id, {})

    # สำหรับวิชา Python OOP ให้มีชุดงาน 1-4 เริ่มต้น
    if "python" in course_id.lower() or "oop" in course_id.lower():
        task_list = course_data.get("assignments") or list(DEFAULT_OOP_ASSIGNMENTS)
        active_id = course_data.get("active_assignment_id") or "work-4"
        active_task = next((t for t in task_list if t["id"] == active_id), task_list[-1] if task_list else None)

        if not active_task:
            active_task = {
                "id": "work-4",
                "title": "งานที่ 4 โปรแกรมจัดการข้อมูลสินค้า (Product Class)",
                "prompt": DEFAULT_ASSIGNMENT_PROMPT,
                "max_score": 10,
            }

        return {
            "course_id": course_id,
            "id": active_task.get("id", "work-4"),
            "title": active_task.get("title", "งานที่ 4 โปรแกรมจัดการข้อมูลสินค้า (Product Class)"),
            "prompt": active_task.get("prompt", DEFAULT_ASSIGNMENT_PROMPT),
            "max_score": active_task.get("max_score", 10),
            "active_assignment_id": active_id,
            "assignments": task_list,
        }

    # วิชาทั่วไป
    task_list = course_data.get("assignments", [])
    if not task_list:
        task_list = [{
            "id": "task-1",
            "title": course_data.get("title", "งานที่ 1"),
            "prompt": course_data.get("prompt", ""),
            "max_score": course_data.get("max_score", 10),
        }]
    active_id = course_data.get("active_assignment_id") or task_list[0]["id"]
    active_task = next((t for t in task_list if t["id"] == active_id), task_list[0])

    return {
        "course_id": course_id,
        "id": active_task.get("id", "task-1"),
        "title": active_task.get("title", "โจทย์ประจำงาน"),
        "prompt": active_task.get("prompt", ""),
        "max_score": active_task.get("max_score", 10),
        "active_assignment_id": active_id,
        "assignments": task_list,
    }


def save_assignment(course_id: str, assignment_data: dict) -> dict:
    """บันทึกหรืออัปเดตโจทย์และเกณฑ์ตรวจประจำวิชา"""
    with _lock:
        ASSIGNMENTS_FILE.parent.mkdir(parents=True, exist_ok=True)
        data = {}
        if ASSIGNMENTS_FILE.exists():
            try:
                with open(ASSIGNMENTS_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
            except Exception:
                data = {}

        current_course = data.get(course_id, {})
        existing_list = current_course.get("assignments")
        if not existing_list:
            if "python" in course_id.lower() or "oop" in course_id.lower():
                existing_list = [dict(t) for t in DEFAULT_OOP_ASSIGNMENTS]
            else:
                existing_list = []

        # ตรวจสอบ ID ของงานที่จะบันทึก
        target_id = assignment_data.get("id") or current_course.get("active_assignment_id") or "work-4"
        title = assignment_data.get("title", "").strip() or "โจทย์ประจำงาน"
        prompt = assignment_data.get("prompt", "").strip()
        max_score = assignment_data.get("max_score", 10)

        # หาว่ามีงานนี้ในลิสต์อยู่แล้วหรือไม่
        idx = next((i for i, t in enumerate(existing_list) if t["id"] == target_id), -1)
        item = {
            "id": target_id,
            "title": title,
            "prompt": prompt,
            "max_score": max_score,
        }
        if idx >= 0:
            existing_list[idx] = item
        else:
            existing_list.append(item)

        current_course["course_id"] = course_id
        current_course["active_assignment_id"] = target_id
        current_course["assignments"] = existing_list
        current_course["title"] = title
        current_course["prompt"] = prompt
        current_course["max_score"] = max_score

        data[course_id] = current_course

        temp_file = ASSIGNMENTS_FILE.with_suffix(".tmp")
        with open(temp_file, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        temp_file.replace(ASSIGNMENTS_FILE)

        return get_assignment(course_id)



def load_config() -> dict:
    """โหลดการตั้งค่าระบบ (เช่น API Keys)"""
    with _lock:
        if not CONFIG_FILE.exists():
            return {}
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f"Error loading config: {e}")
            return {}


def save_config(new_config: dict) -> dict:
    """บันทึกการตั้งค่าระบบ"""
    with _lock:
        CONFIG_FILE.parent.mkdir(parents=True, exist_ok=True)
        data = {}
        if CONFIG_FILE.exists():
            try:
                with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
            except Exception:
                data = {}

        data.update(new_config)

        temp_file = CONFIG_FILE.with_suffix(".tmp")
        with open(temp_file, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        temp_file.replace(CONFIG_FILE)

        return data

