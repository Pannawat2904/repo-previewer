"""
โมดูลสำหรับดาวน์โหลด แตกไฟล์ zip ตรวจสอบความปลอดภัย (Zip-Slip)
และจัดการระบบแคชของ repository ในเครื่อง
"""

import asyncio
import io
import json
import logging
import os
import re
import shutil
import zipfile
from datetime import datetime
from pathlib import Path
from typing import Callable, Dict, Optional, Tuple

import httpx

from previewer.links import RepoItem

logger = logging.getLogger(__name__)

# ข้อจำกัดด้านความปลอดภัยและทรัพยากร
MAX_FILE_SIZE = 50 * 1024 * 1024  # สูงสุด 50 MB
DEFAULT_TIMEOUT_SECONDS = 30.0

BASE_DIR = Path(__file__).resolve().parent.parent


def get_base_data_dir() -> Path:
    """
    คืนค่าโฟลเดอร์สำหรับจัดเก็บข้อมูลและแคช
    หากรันบน Vercel (Serverless) ระบบไฟล์จะ Read-Only ยกเว้นโฟลเดอร์ /tmp
    """
    if os.environ.get("VERCEL"):
        p = Path("/tmp") / "repo_previewer_data"
        p.mkdir(parents=True, exist_ok=True)
        return p

    default_dir = BASE_DIR / "data"
    try:
        default_dir.mkdir(parents=True, exist_ok=True)
        # ทดสอบการเขียนไฟล์
        test_file = default_dir / ".write_test"
        test_file.touch()
        test_file.unlink()
        return default_dir
    except Exception:
        # Fallback ไป /tmp หากไม่มีสิทธิ์เขียนในโฟลเดอร์โปรเจกต์
        fallback_dir = Path("/tmp") / "repo_previewer_data"
        fallback_dir.mkdir(parents=True, exist_ok=True)
        return fallback_dir


DEFAULT_CACHE_DIR = get_base_data_dir() / "cache"


class FetchError(Exception):
    """ข้อผิดพลาดที่ระบุสาเหตุเป็นภาษาไทยสำหรับแสดงให้ครูเห็น"""
    def __init__(self, message: str, status_code: Optional[int] = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def get_repo_cache_dir(owner: str, repo: str, base_cache_dir: Optional[Path] = None) -> Path:
    """คืนค่า Path สำหรับเก็บโฟลเดอร์แคชของ repo นั้น ๆ"""
    cache_root = base_cache_dir or DEFAULT_CACHE_DIR
    safe_folder_name = f"{owner.lower()}_{repo.lower()}"
    return cache_root / safe_folder_name


def is_repo_cached(owner: str, repo: str, base_cache_dir: Optional[Path] = None) -> bool:
    """ตรวจสอบว่า repo มีแคชที่สมบูรณ์อยู่ในเครื่องแล้วหรือไม่"""
    target_dir = get_repo_cache_dir(owner, repo, base_cache_dir)
    meta_file = target_dir / ".repo_meta.json"
    return target_dir.exists() and meta_file.exists()


def read_repo_meta(owner: str, repo: str, base_cache_dir: Optional[Path] = None) -> Optional[dict]:
    """อ่านข้อมูล metadata ของ repo จากไฟล์แคช"""
    target_dir = get_repo_cache_dir(owner, repo, base_cache_dir)
    meta_file = target_dir / ".repo_meta.json"
    if meta_file.exists():
        try:
            with open(meta_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return None
    return None


def extract_commit_hash_from_url(url_str: str) -> Optional[str]:
    """ดึง 40-char commit hash จาก redirect url ของ GitHub ถ้ามี"""
    match = re.search(r"/zip/([a-f0-9]{40})", url_str, re.IGNORECASE)
    if match:
        return match.group(1)
    return None


def safe_extract_zip(zip_bytes: bytes, target_dir: Path) -> Tuple[int, int]:
    """
    แตกไฟล์ zip อย่างปลอดภัย:
    1. ป้องกัน Zip-Slip vulnerability (ห้ามเขียนออกนอก target_dir)
    2. ถ้า zip มี root folder ชั้นเดียวครอบอยู่ (เช่น repo-main/) ให้ strip ออกเพื่อให้เป็น root ของงาน
    
    คืนค่า (จำนวนไฟล์ทั้งหมด, ขนาดรวม bytes)
    """
    target_dir = target_dir.resolve()
    target_dir.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        infolist = zf.infolist()
        if not infolist:
            raise FetchError("ไฟล์ zip ว่างเปล่า")

        # ตรวจสอบว่ามีโฟลเดอร์ชั้นนอกสุดชั้นเดียวครอบอยู่หรือไม่
        # เช่น 'my-repo-main/index.html' -> prefix คือ 'my-repo-main/'
        first_parts = set()
        for info in infolist:
            parts = Path(info.filename).parts
            if parts:
                first_parts.add(parts[0])

        strip_prefix = ""
        if len(first_parts) == 1:
            candidate = list(first_parts)[0]
            # ตรวจสอบว่าทุกรายการเริ่มต้นด้วย candidate หรือไม่
            if all(Path(info.filename).parts[0] == candidate for info in infolist):
                strip_prefix = candidate + "/"

        total_files = 0
        total_size = 0

        for info in infolist:
            rel_path = info.filename
            if strip_prefix and rel_path.startswith(strip_prefix):
                rel_path = rel_path[len(strip_prefix):]

            if not rel_path or rel_path.endswith("/"):
                # ข้ามโฟลเดอร์เปล่า
                continue

            # ตรวจสอบ Path Traversal (Zip-Slip)
            dest_file = (target_dir / rel_path).resolve()
            try:
                # Python 3.9+ is_relative_to
                if not dest_file.is_relative_to(target_dir):
                    raise FetchError(f"ตรวจพบความเสี่ยงด้านความปลอดภัย (Zip-Slip): {info.filename}")
            except AttributeError:
                # กรณี fallback
                if not str(dest_file).startswith(str(target_dir)):
                    raise FetchError(f"ตรวจพบความเสี่ยงด้านความปลอดภัย (Zip-Slip): {info.filename}")

            # ป้องกัน symlink ที่ชี้ออกนอกโฟลเดอร์
            # (ZipInfo.external_attr >> 16 & 0o170000 == 0o120000 คือ symlink ใน POSIX)
            if (info.external_attr >> 16) & 0o170000 == 0o120000:
                continue

            # สร้างโฟลเดอร์ปลายทาง
            dest_file.parent.mkdir(parents=True, exist_ok=True)

            # เขียนไฟล์
            with zf.open(info) as src, open(dest_file, "wb") as dst:
                shutil.copyfileobj(src, dst)

            total_files += 1
            total_size += info.file_size

    return total_files, total_size


async def fetch_and_cache_repo(
    item: RepoItem,
    force_refresh: bool = False,
    base_cache_dir: Optional[Path] = None,
    progress_callback: Optional[Callable[[str, str], None]] = None,
) -> dict:
    """
    ดาวน์โหลด repo จาก GitHub HEAD.zip และบันทึกลงโฟลเดอร์แคช
    คืนค่า dict ข้อมูลของ repo พร้อมสถานะ
    """
    if not item.is_valid:
        raise FetchError(item.error_message or "ลิงก์ไม่ถูกต้อง")

    target_dir = get_repo_cache_dir(item.owner, item.repo, base_cache_dir)

    # 1. เช็คว่ามีแคชเดิมและไม่ได้สั่งโหลดใหม่หรือไม่
    if not force_refresh and is_repo_cached(item.owner, item.repo, base_cache_dir):
        if progress_callback:
            progress_callback(item.key, "ใช้ข้อมูลจากแคชในเครื่อง")
        meta = read_repo_meta(item.owner, item.repo, base_cache_dir) or {}
        return {
            "key": item.key,
            "owner": item.owner,
            "repo": item.repo,
            "student_name": item.student_name,
            "status": "ready",
            "cached": True,
            "path": str(target_dir),
            "meta": meta,
        }

    if progress_callback:
        progress_callback(item.key, "กำลังดาวน์โหลดไฟล์ zip จาก GitHub...")

    # 2. ดาวน์โหลดไฟล์ zip จาก GitHub
    client_limits = httpx.Limits(max_keepalive_connections=10, max_connections=20)
    async with httpx.AsyncClient(
        follow_redirects=True,
        timeout=DEFAULT_TIMEOUT_SECONDS,
        limits=client_limits,
        headers={"User-Agent": "RepoPreviewer/1.0 (Teacher-Checker)"},
    ) as client:
        try:
            response = await client.get(item.archive_url)
        except httpx.TimeoutException:
            raise FetchError("หมดเวลาเชื่อมต่อ (Timeout) ตรวจสอบอินเทอร์เน็ตหรือ GitHub ช้า")
        except httpx.ConnectError:
            raise FetchError("ไม่สามารถเชื่อมต่อไปยัง GitHub ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต")
        except Exception as e:
            raise FetchError(f"เกิดข้อผิดพลาดในการเชื่อมต่อ: {str(e)}")

        # ตรวจสอบ HTTP Status
        if response.status_code == 404:
            raise FetchError("โหลดไม่ได้ อาจเป็น Repository ส่วนตัว (Private) หรือระบุลิงก์ไม่ถูกต้อง", 404)
        elif response.status_code == 403:
            raise FetchError("ถูกจำกัดการเข้าถึงจาก GitHub (Rate Limit เกิน)", 403)
        elif response.status_code != 200:
            raise FetchError(f"GitHub ส่งรหัสข้อผิดพลาด {response.status_code}", response.status_code)

        zip_bytes = response.content
        if len(zip_bytes) > MAX_FILE_SIZE:
            raise FetchError(f"ไฟล์มีขนาดเกิน {MAX_FILE_SIZE // (1024 * 1024)} MB")

    if progress_callback:
        progress_callback(item.key, "กำลังแตกไฟล์และจัดเตรียมพรีวิว...")

    # 3. ลบแคชเดิมออกถ้าเป็นการโหลดใหม่
    if target_dir.exists():
        shutil.rmtree(target_dir, ignore_errors=True)

    # 4. แตกไฟล์อย่างปลอดภัย
    commit_hash = extract_commit_hash_from_url(str(response.url))
    total_files, total_size = safe_extract_zip(zip_bytes, target_dir)

    # 5. บันทึก Metadata
    meta = {
        "owner": item.owner,
        "repo": item.repo,
        "student_name": item.student_name,
        "canonical_url": item.canonical_url,
        "commit_hash": commit_hash,
        "fetched_at": datetime.now().isoformat(),
        "total_files": total_files,
        "total_size_bytes": total_size,
    }
    with open(target_dir / ".repo_meta.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

    if progress_callback:
        progress_callback(item.key, "พร้อมดูงานแล้ว")

    return {
        "key": item.key,
        "owner": item.owner,
        "repo": item.repo,
        "student_name": item.student_name,
        "status": "ready",
        "cached": False,
        "path": str(target_dir),
        "meta": meta,
    }


async def fetch_multiple_repos(
    items: list[RepoItem],
    force_refresh: bool = False,
    concurrency_limit: int = 4,
    base_cache_dir: Optional[Path] = None,
    item_callback: Optional[Callable[[str, dict], None]] = None,
) -> Dict[str, dict]:
    """
    ดาวน์โหลดหลาย repo พร้อมกันโดยจำกัดจำนวนพร้อมกันไม่เกิน 4-5 คอนเนกชัน
    และเรียก item_callback ทันทีที่แต่ละคนเสร็จ เพื่อให้ครูเริ่มดูคนแรกได้ทันที
    """
    semaphore = asyncio.Semaphore(concurrency_limit)
    results: Dict[str, dict] = {}

    async def worker(item: RepoItem):
        async with semaphore:
            try:
                res = await fetch_and_cache_repo(
                    item,
                    force_refresh=force_refresh,
                    base_cache_dir=base_cache_dir,
                )
                results[item.key] = res
                if item_callback:
                    item_callback(item.key, res)
            except FetchError as fe:
                err_res = {
                    "key": item.key,
                    "owner": item.owner,
                    "repo": item.repo,
                    "student_name": item.student_name,
                    "status": "error",
                    "error_message": fe.message,
                    "status_code": fe.status_code,
                }
                results[item.key] = err_res
                if item_callback:
                    item_callback(item.key, err_res)
            except Exception as e:
                err_res = {
                    "key": item.key,
                    "owner": item.owner,
                    "repo": item.repo,
                    "student_name": item.student_name,
                    "status": "error",
                    "error_message": f"เกิดข้อผิดพลาดไม่ทราบสาเหตุ: {str(e)}",
                }
                results[item.key] = err_res
                if item_callback:
                    item_callback(item.key, err_res)

    tasks = [worker(item) for item in items if item.is_valid]
    if tasks:
        await asyncio.gather(*tasks)

    # ใส่รายการที่ invalid เข้าไปด้วย
    for item in items:
        if not item.is_valid:
            invalid_res = {
                "key": item.raw_input,
                "owner": "",
                "repo": "",
                "student_name": item.student_name,
                "status": "error",
                "error_message": item.error_message or "ลิงก์ไม่ถูกต้อง",
            }
            results[item.raw_input] = invalid_res
            if item_callback:
                item_callback(item.raw_input, invalid_res)

    return results


def clear_all_cache(base_cache_dir: Optional[Path] = None) -> int:
    """ล้างแคชทั้งหมดในโฟลเดอร์แคช คืนค่าจำนวน repo ที่ลบไป"""
    cache_root = base_cache_dir or DEFAULT_CACHE_DIR
    count = 0
    if cache_root.exists():
        for item in cache_root.iterdir():
            if item.is_dir():
                shutil.rmtree(item, ignore_errors=True)
                count += 1
    return count
