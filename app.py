"""
Repo Previewer - เซิร์ฟเวอร์หลัก (FastAPI)
จุดเริ่มต้นของโปรแกรม: python app.py
"""

import asyncio
import json
import logging
import os
import sys
from pathlib import Path
from typing import List, Optional

import uvicorn
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from previewer.code_viewer import build_file_tree, get_file_details
from previewer.fetch import (
    DEFAULT_CACHE_DIR,
    FetchError,
    clear_all_cache,
    fetch_and_cache_repo,
    get_repo_cache_dir,
    is_repo_cached,
    read_repo_meta,
)
from previewer.inspect import inspect_repository
from previewer.links import RepoItem, normalize_github_url, parse_bulk_links, parse_input_line
from previewer.serve import find_index_html, server_manager
from previewer.storage import get_review, load_all_reviews, save_review

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("repo-previewer")

app = FastAPI(title="Repo Previewer", description="เครื่องมือพรีวิว GitHub Repo สำหรับครู")

# อนุญาต CORS สำหรับการพัฒนาและการเชื่อมต่อภายใน
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "previewer" / "static"


# -------------------------------------------------------------
# Pydantic Request Models
# -------------------------------------------------------------
class ParseLinksRequest(BaseModel):
    text: str


class FetchRequest(BaseModel):
    items: List[dict]
    force_refresh: bool = False


class FetchSingleRequest(BaseModel):
    owner: str
    repo: str
    student_name: Optional[str] = None
    force_refresh: bool = True


class ReviewUpdateRequest(BaseModel):
    viewed: Optional[bool] = None
    note: Optional[str] = None


# -------------------------------------------------------------
# API Endpoints
# -------------------------------------------------------------
@app.post("/api/links/parse")
async def api_parse_links(req: ParseLinksRequest):
    """แปลงข้อความลิงก์หลายบรรทัดเป็นรายการ RepoItem"""
    items = parse_bulk_links(req.text)
    reviews = load_all_reviews()
    results = []
    for item in items:
        key = item.key if item.is_valid else item.raw_input
        cached = is_repo_cached(item.owner, item.repo) if item.is_valid else False
        rev = reviews.get(key.lower(), {"viewed": False, "note": ""})
        meta = read_repo_meta(item.owner, item.repo) if cached else None

        results.append({
            "key": key,
            "raw_input": item.raw_input,
            "owner": item.owner,
            "repo": item.repo,
            "student_name": item.student_name,
            "canonical_url": item.canonical_url,
            "archive_url": item.archive_url,
            "is_valid": item.is_valid,
            "error_message": item.error_message,
            "cached": cached,
            "status": "ready" if cached else ("error" if not item.is_valid else "pending"),
            "viewed": rev.get("viewed", False),
            "note": rev.get("note", ""),
            "meta": meta,
        })
    return {"items": results, "total": len(results)}


@app.post("/api/repos/fetch-stream")
async def api_fetch_stream(req: FetchRequest):
    """
    ดาวน์โหลดหลาย repo แบบ Stream (Server-Sent Events)
    จำกัดการดาวน์โหลดพร้อมกัน 4-5 คอนเนกชัน
    ส่งผลลัพธ์กลับมาทันทีที่แต่ละคนเสร็จ เพื่อให้ครูเริ่มดูคนแรกได้เลย
    """
    items_to_fetch = []
    for raw in req.items:
        if not raw.get("is_valid"):
            continue
        item = RepoItem(
            raw_input=raw.get("raw_input", ""),
            owner=raw.get("owner", ""),
            repo=raw.get("repo", ""),
            student_name=raw.get("student_name", ""),
            canonical_url=raw.get("canonical_url", ""),
            archive_url=raw.get("archive_url", ""),
            original_url=raw.get("canonical_url", ""),
            is_valid=True,
        )
        items_to_fetch.append(item)

    async def event_generator():
        semaphore = asyncio.Semaphore(4)
        queue = asyncio.Queue()

        async def worker(item: RepoItem):
            async with semaphore:
                key = item.key
                # แจ้งเริ่มต้น
                await queue.put({
                    "type": "progress",
                    "key": key,
                    "message": "กำลังเชื่อมต่อไปยัง GitHub...",
                })
                try:
                    res = await fetch_and_cache_repo(
                        item,
                        force_refresh=req.force_refresh,
                        progress_callback=lambda k, msg: queue.put_nowait({
                            "type": "progress",
                            "key": k,
                            "message": msg,
                        }),
                    )
                    await queue.put({
                        "type": "completed",
                        "key": key,
                        "success": True,
                        "data": res,
                    })
                except FetchError as fe:
                    await queue.put({
                        "type": "completed",
                        "key": key,
                        "success": False,
                        "error_message": fe.message,
                        "status_code": fe.status_code,
                    })
                except Exception as e:
                    await queue.put({
                        "type": "completed",
                        "key": key,
                        "success": False,
                        "error_message": f"เกิดข้อผิดพลาด: {str(e)}",
                    })

        # รัน workers ทั้งหมดในพื้นหลัง
        tasks = [asyncio.create_task(worker(item)) for item in items_to_fetch]
        completed_count = 0
        total_tasks = len(tasks)

        while completed_count < total_tasks:
            msg = await queue.get()
            if msg["type"] == "completed":
                completed_count += 1
            yield f"data: {json.dumps(msg, ensure_ascii=False)}\n\n"

        yield f"data: {json.dumps({'type': 'all_done'}, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.post("/api/repos/fetch-single")
async def api_fetch_single(req: FetchSingleRequest):
    """ดาวน์โหลดหรือโหลดใหม่สำหรับ repo รายบุคคล"""
    canonical_url = f"https://github.com/{req.owner}/{req.repo}"
    archive_url = f"{canonical_url}/archive/HEAD.zip"
    item = RepoItem(
        raw_input=canonical_url,
        owner=req.owner,
        repo=req.repo,
        student_name=req.student_name or f"{req.owner}/{req.repo}",
        canonical_url=canonical_url,
        archive_url=archive_url,
        original_url=canonical_url,
        is_valid=True,
    )
    # หยุดเซิร์ฟเวอร์เดิมถ้ามี
    server_manager.stop(req.owner, req.repo)

    try:
        res = await fetch_and_cache_repo(item, force_refresh=req.force_refresh)
        return {"success": True, "data": res}
    except FetchError as fe:
        return {"success": False, "error_message": fe.message, "status_code": fe.status_code}
    except Exception as e:
        return {"success": False, "error_message": str(e)}


@app.get("/api/preview/{owner}/{repo}")
async def api_get_preview(owner: str, repo: str):
    """
    ดึงหรือเริ่มเปิดเซิร์ฟเวอร์พรีวิวพอร์ตแยก (Lazy start) สำหรับ repo นี้
    """
    repo_dir = get_repo_cache_dir(owner, repo)
    if not repo_dir.exists():
        raise HTTPException(status_code=404, detail="ยังไม่ได้ดาวน์โหลด repository นี้")

    info = server_manager.get_or_start(owner, repo, repo_dir)
    return info


@app.get("/api/inspect/{owner}/{repo}")
async def api_inspect_repo(owner: str, repo: str):
    """วิเคราะห์ข้อสังเกตของ repository (ไฟล์ที่อ้างถึงแต่ไม่เจอ, commit, โฟลเดอร์)"""
    repo_dir = get_repo_cache_dir(owner, repo)
    if not repo_dir.exists():
        raise HTTPException(status_code=404, detail="ยังไม่ได้ดาวน์โหลด repository นี้")

    res = inspect_repository(repo_dir, original_url=f"https://github.com/{owner}/{repo}")
    return res


@app.get("/api/files/tree/{owner}/{repo}")
async def api_get_file_tree(owner: str, repo: str):
    """ดึงโครงสร้างต้นไม้โฟลเดอร์ของ repository"""
    repo_dir = get_repo_cache_dir(owner, repo)
    if not repo_dir.exists():
        raise HTTPException(status_code=404, detail="ยังไม่ได้ดาวน์โหลด repository นี้")

    tree = build_file_tree(repo_dir)
    return {"tree": tree}


@app.get("/api/files/content/{owner}/{repo}")
async def api_get_file_content(owner: str, repo: str, path: str = Query(...)):
    """อ่านเนื้อหาไฟล์สำหรับแสดงในแท็บโค้ด"""
    repo_dir = get_repo_cache_dir(owner, repo)
    if not repo_dir.exists():
        raise HTTPException(status_code=404, detail="ยังไม่ได้ดาวน์โหลด repository นี้")

    detail = get_file_details(repo_dir, path)
    return detail


@app.get("/api/reviews")
async def api_get_reviews():
    """ดึงข้อมูลบันทึกและสถานะตรวจแล้วทั้งหมด"""
    return load_all_reviews()


@app.post("/api/reviews/{owner}/{repo}")
async def api_save_review(owner: str, repo: str, req: ReviewUpdateRequest):
    """บันทึกสถานะตรวจแล้วและข้อความโน้ตย่อ"""
    key = f"{owner.lower()}/{repo.lower()}"
    res = save_review(key, viewed=req.viewed, note=req.note)
    return {"success": True, "data": res}


@app.post("/api/cache/clear")
async def api_clear_cache():
    """ล้างแคชทั้งหมดในเครื่องและปิดเซิร์ฟเวอร์พรีวิวทั้งหมด"""
    server_manager.stop_all()
    count = clear_all_cache()
    return {"success": True, "deleted_repos_count": count}


# -------------------------------------------------------------
# Static files and Home Page
# -------------------------------------------------------------
STATIC_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.get("/")
async def root():
    index_file = STATIC_DIR / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return HTMLResponse("<h1>Repo Previewer is running. Static files loading...</h1>")


def run():
    """ฟังก์ชันสั่งรันเซิร์ฟเวอร์"""
    port = int(os.environ.get("PORT", 8000))
    print(f"\n=======================================================")
    print(f"  Repo Previewer พร้อมใช้งานแล้ว")
    print(f"  เปิดเบราว์เซอร์ไปที่: http://127.0.0.1:{port}")
    print(f"=======================================================\n")
    uvicorn.run("app:app", host="127.0.0.1", port=port, reload=False)


if __name__ == "__main__":
    run()
