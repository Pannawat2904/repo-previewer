"""
โมดูลสำหรับแยกแยะ ตรวจสอบ และแปลงลิงก์ GitHub รูปแบบต่าง ๆ
ให้อยู่ในรูปแบบมาตรฐาน (Canonical format)
"""

import re
from dataclasses import dataclass
from typing import List, Optional, Tuple
from urllib.parse import urlparse, parse_qs


@dataclass
class RepoItem:
    raw_input: str
    owner: str
    repo: str
    student_name: str
    canonical_url: str
    archive_url: str
    original_url: str
    is_valid: bool = True
    error_message: Optional[str] = None

    @property
    def key(self) -> str:
        """คีย์เอกลักษณ์สำหรับใช้เป็น Cache / Dict (ตัวพิมพ์เล็กเสมอ)"""
        return f"{self.owner.lower()}/{self.repo.lower()}"


# Regex สำหรับจับ GitHub owner และ repository
GITHUB_PATTERN = re.compile(
    r"^(?:https?://)?(?:www\.)?github\.com/([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+?)(?:\.git)?(?:/.*)?$",
    re.IGNORECASE,
)


def normalize_github_url(url_str: str) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """
    แยก owner และ repo จาก URL
    ตัด .git, /tree/..., /blob/..., hash, query parameter และ slash ท้าย
    
    คืนค่า (owner, repo, error_message)
    """
    clean_url = url_str.strip()
    if not clean_url:
        return None, None, "ลิงก์ว่างเปล่า"

    # ถ้าไม่มี schema ให้เติม https:// เพื่อการ parse
    if not clean_url.startswith(("http://", "https://")):
        clean_url = "https://" + clean_url

    try:
        parsed = urlparse(clean_url)
    except Exception:
        return None, None, "รูปแบบ URL ไม่ถูกต้อง"

    # ตรวจสอบว่าเป็นโดเมน github.com
    hostname = (parsed.hostname or "").lower()
    if hostname not in ("github.com", "www.github.com"):
        return None, None, "ไม่ใช่ลิงก์ GitHub"

    # แยก path: /owner/repo/...
    path_parts = [p for p in parsed.path.strip("/").split("/") if p]
    if len(path_parts) < 2:
        return None, None, "ลิงก์ต้องระบุทั้ง owner และ repository"

    owner = path_parts[0].strip()
    repo = path_parts[1].strip()

    # ตัด .git ที่ท้ายชื่อ repo
    if repo.endswith(".git"):
        repo = repo[:-4]

    if not owner or not repo:
        return None, None, "ชื่อ owner หรือ repository ไม่ถูกต้อง"

    # ป้องกัน path traversal ในชื่อ owner/repo
    if ".." in owner or ".." in repo or "/" in owner or "/" in repo or "\\" in owner or "\\" in repo:
        return None, None, "ชื่อ repository มีอักขระที่ไม่อนุญาต"

    return owner, repo, None


def parse_input_line(line: str) -> Optional[RepoItem]:
    """
    แปลงบรรทัดข้อความ 1 บรรทัด
    รองรับทั้ง:
    1. 'https://github.com/owner/repo'
    2. 'ชื่อนักเรียน\thttps://github.com/owner/repo' (คั่นด้วย Tab)
    3. 'ชื่อนักเรียน, https://github.com/owner/repo' (คั่นด้วย Comma)
    """
    raw_line = line.strip()
    if not raw_line or raw_line.startswith("#"):
        return None

    student_name = ""
    url_part = raw_line

    # ตรวจสอบการคั่นด้วย Tab หรือ Comma
    if "\t" in raw_line:
        parts = raw_line.split("\t", 1)
        student_name = parts[0].strip()
        url_part = parts[1].strip()
    elif "," in raw_line:
        parts = raw_line.split(",", 1)
        # ตรวจสอบว่าฝั่งซ้ายหรือฝั่งขวาเป็น URL
        left = parts[0].strip()
        right = parts[1].strip()
        if "github.com" in right:
            student_name = left
            url_part = right
        elif "github.com" in left:
            url_part = left
            student_name = right
        else:
            student_name = left
            url_part = right

    owner, repo, err = normalize_github_url(url_part)

    if err or not owner or not repo:
        display_name = student_name or url_part
        return RepoItem(
            raw_input=raw_line,
            owner="",
            repo="",
            student_name=display_name,
            canonical_url=url_part,
            archive_url="",
            original_url=url_part,
            is_valid=False,
            error_message=err or "ไม่สามารถประมวลผลลิงก์ได้",
        )

    canonical_url = f"https://github.com/{owner}/{repo}"
    archive_url = f"https://github.com/{owner}/{repo}/archive/HEAD.zip"
    display_name = student_name if student_name else f"{owner}/{repo}"

    return RepoItem(
        raw_input=raw_line,
        owner=owner,
        repo=repo,
        student_name=display_name,
        canonical_url=canonical_url,
        archive_url=archive_url,
        original_url=url_part,
        is_valid=True,
        error_message=None,
    )


def parse_bulk_links(text: str) -> List[RepoItem]:
    """
    รับข้อความหลายบรรทัด แปลงเป็นรายการ RepoItem
    ตัดรายการซ้ำ (Deduplication) โดยใช้ owner/repo เป็นหลัก
    หากซ้ำแต่มีชื่อนักเรียน ให้เก็บชื่อที่มีอยู่
    """
    seen_keys = set()
    results: List[RepoItem] = []

    for line in text.splitlines():
        item = parse_input_line(line)
        if item is None:
            continue

        if not item.is_valid:
            # รายการที่เสียให้ใส่มาด้วย เพื่อแจ้งผู้ใช้ใน UI
            results.append(item)
            continue

        key = item.key
        if key in seen_keys:
            # อัปเดตชื่อนักเรียนหากของเดิมไม่มีแต่รายการใหม่มี
            for existing in results:
                if existing.key == key:
                    if existing.student_name == f"{existing.owner}/{existing.repo}" and item.student_name != f"{item.owner}/{item.repo}":
                        existing.student_name = item.student_name
                    break
            continue

        seen_keys.add(key)
        results.append(item)

    return results
