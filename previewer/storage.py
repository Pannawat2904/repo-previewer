"""
โมดูลสำหรับจัดเก็บบันทึก (Notes) และสถานะ "ดูแล้ว" (Viewed) ของนักเรียนแต่ละคน
บันทึกลงไฟล์ JSON ในเครื่อง (data/reviews.json) เพื่อให้รีเฟรชหรือเปิดใหม่แล้วข้อมูลไม่หาย
"""

import json
import logging
import re
import threading
from pathlib import Path
from typing import Dict, List, Optional

from previewer.fetch import get_base_data_dir

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent.parent
STORAGE_FILE = get_base_data_dir() / "reviews.json"
ASSIGNMENTS_FILE = get_base_data_dir() / "assignments.json"
SEED_ASSIGNMENTS_FILE = BASE_DIR / "data" / "assignments.json"
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


_WORK_KEYWORD_NUM_RE = re.compile(
    r"(?:งานที่|ใบงานที่|งาน|ใบงาน|ข้อที่|ข้อ|แบบฝึกหัดที่|แบบฝึกหัด|สัปดาห์ที่|สัปดาห์|บทที่|lab|assignment|task|hw|week|project|work)\s*[:#.-]?\s*(\d+)",
    re.IGNORECASE,
)
_LEADING_NUM_RE = re.compile(r"^\s*#?(\d+)(?:[\s.):\-]|$)")
_ANY_NUM_RE = re.compile(r"(\d+)")


def _assignment_sort_key(task: dict) -> tuple:
    """คีย์สำหรับเรียงลำดับชิ้นงานตามเลขงาน 1, 2, 3, 4... อย่างเป็นธรรมชาติ"""
    title = str(task.get("title") or "").strip()
    task_id = str(task.get("id") or "").strip()

    m = _WORK_KEYWORD_NUM_RE.search(title)
    if m:
        return (0, int(m.group(1)), title.lower(), task_id.lower())

    m_lead = _LEADING_NUM_RE.match(title)
    if m_lead:
        return (0, int(m_lead.group(1)), title.lower(), task_id.lower())

    m_any = _ANY_NUM_RE.search(title)
    if m_any:
        return (1, int(m_any.group(1)), title.lower(), task_id.lower())

    m_id = _ANY_NUM_RE.search(task_id)
    if m_id:
        return (2, int(m_id.group(1)), title.lower(), task_id.lower())

    return (3, float("inf"), title.lower(), task_id.lower())


def sort_assignments_list(tasks: List[dict]) -> List[dict]:
    """เรียงลำดับรายการชิ้นงานตามหมายเลขงาน (1, 2, 3, 4...)"""
    return sorted(tasks, key=_assignment_sort_key)


def _resolve_course_task_list(course_id: str, course_data: dict) -> List[dict]:
    """คืนค่ารายการชิ้นงานของรายวิชา โดยเคารพกรณีลบงานจนว่างและเรียงลำดับเสมอ"""
    if "assignments" in course_data and isinstance(course_data["assignments"], list):
        return sort_assignments_list([dict(t) for t in course_data["assignments"]])

    if "python" in course_id.lower() or "oop" in course_id.lower():
        return sort_assignments_list([dict(t) for t in DEFAULT_OOP_ASSIGNMENTS])

    return [{
        "id": "task-1",
        "title": course_data.get("title", "งานที่ 1"),
        "prompt": course_data.get("prompt", ""),
        "max_score": course_data.get("max_score", 10),
    }]


def _write_assignments_atomic(data: Dict[str, dict]) -> None:
    """เขียนข้อมูล assignments ลงไฟล์แบบ atomic"""
    ASSIGNMENTS_FILE.parent.mkdir(parents=True, exist_ok=True)
    temp_file = ASSIGNMENTS_FILE.with_suffix(".tmp")
    with open(temp_file, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    temp_file.replace(ASSIGNMENTS_FILE)


def load_all_assignments() -> Dict[str, dict]:
    """โหลดข้อมูลโจทย์และเกณฑ์ตรวจทั้งหมด (รองรับ Seed ข้อมูลเดิมบน Vercel)"""
    with _lock:
        target = ASSIGNMENTS_FILE
        if not target.exists() and SEED_ASSIGNMENTS_FILE.exists():
            target = SEED_ASSIGNMENTS_FILE
        if not target.exists():
            return {}
        try:
            with open(target, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f"Error loading assignments storage: {e}")
            return {}


def get_assignment(course_id: str) -> dict:
    """ดึงข้อมูลโจทย์ของวิชา/งานนั้น ๆ พร้อมรายการงานย่อยทั้งหมด (เรียงตามเลขงาน 1, 2, 3, 4)"""
    assignments = load_all_assignments()
    course_data = assignments.get(course_id, {})
    task_list = _resolve_course_task_list(course_id, course_data)

    if not task_list:
        return {
            "course_id": course_id,
            "id": "",
            "title": "ยังไม่มีชิ้นงาน",
            "prompt": "",
            "max_score": 10,
            "active_assignment_id": "",
            "assignments": [],
        }

    default_active = "work-4" if ("python" in course_id.lower() or "oop" in course_id.lower()) else task_list[0].get("id", "task-1")
    active_id = course_data.get("active_assignment_id") or default_active
    active_task = next((t for t in task_list if t.get("id") == active_id), task_list[0])
    resolved_active_id = active_task.get("id", "")

    return {
        "course_id": course_id,
        "id": resolved_active_id,
        "title": active_task.get("title", "โจทย์ประจำงาน"),
        "prompt": active_task.get("prompt", ""),
        "max_score": active_task.get("max_score", 10),
        "active_assignment_id": resolved_active_id,
        "assignments": task_list,
    }


def save_assignment(course_id: str, assignment_data: dict) -> dict:
    """บันทึกหรืออัปเดตโจทย์และเกณฑ์ตรวจประจำวิชา พร้อมจัดเรียงลำดับตามเลขงาน"""
    with _lock:
        data = load_all_assignments()
        current_course = dict(data.get(course_id, {}))
        existing_list = _resolve_course_task_list(course_id, current_course)

        target_id = (assignment_data.get("id") or "").strip() or current_course.get("active_assignment_id") or "work-1"
        title = (assignment_data.get("title") or "").strip() or "โจทย์ประจำงาน"
        prompt = (assignment_data.get("prompt") or "").strip()
        max_score = assignment_data.get("max_score", 10)

        idx = next((i for i, t in enumerate(existing_list) if t.get("id") == target_id), -1)
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

        sorted_list = sort_assignments_list(existing_list)

        current_course["course_id"] = course_id
        current_course["active_assignment_id"] = target_id
        current_course["assignments"] = sorted_list
        current_course["title"] = title
        current_course["prompt"] = prompt
        current_course["max_score"] = max_score

        data[course_id] = current_course
        _write_assignments_atomic(data)

        return get_assignment(course_id)


def delete_assignment(course_id: str, assignment_id: str) -> dict:
    """ลบชิ้นงานย่อยออกจากรายวิชาและจัดเรียงลำดับงานที่เหลือ"""
    with _lock:
        data = load_all_assignments()
        current_course = dict(data.get(course_id, {}))
        existing_list = _resolve_course_task_list(course_id, current_course)

        new_list = sort_assignments_list([t for t in existing_list if t.get("id") != assignment_id])
        prev_active = current_course.get("active_assignment_id")

        if new_list:
            still_active = next((t for t in new_list if t.get("id") == prev_active), None)
            next_task = still_active if still_active else new_list[0]
            new_active_id = next_task.get("id", "")
            new_title = next_task.get("title", "โจทย์ประจำงาน")
            new_prompt = next_task.get("prompt", "")
            new_max_score = next_task.get("max_score", 10)
        else:
            new_active_id = ""
            new_title = "ยังไม่มีชิ้นงาน"
            new_prompt = ""
            new_max_score = 10

        current_course["course_id"] = course_id
        current_course["active_assignment_id"] = new_active_id
        current_course["assignments"] = new_list
        current_course["title"] = new_title
        current_course["prompt"] = new_prompt
        current_course["max_score"] = new_max_score

        data[course_id] = current_course
        _write_assignments_atomic(data)

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

