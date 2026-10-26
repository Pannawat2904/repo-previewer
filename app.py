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
from previewer.serve import CONSOLE_INJECT_SCRIPT, find_index_html, server_manager
from previewer.storage import get_review, load_all_reviews, save_review

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("repo-previewer")

app = FastAPI(title="Repo Previewer", description="เครื่องมือพรีวิว GitHub Repo สำหรับครู")


@app.api_route("/debug", methods=["GET", "POST"])
async def debug_info(request: Request):
    """Debug endpoint เพื่อดู scope และ headers ที่ Vercel ส่งเข้ามา"""
    return {
        "method": request.method,
        "url": str(request.url),
        "path": request.scope.get("path"),
        "raw_query": request.scope.get("query_string", b"").decode(),
        "headers": {
            k.decode(): v.decode()
            for k, v in request.scope.get("headers", [])
            if k.lower().startswith((b"x-", b"host"))
        },
    }

# อนุญาต CORS สำหรับการพัฒนาและการเชื่อมต่อภายใน
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent
PUBLIC_DIR = BASE_DIR / "public"
STATIC_DIR = PUBLIC_DIR / "static" if (PUBLIC_DIR / "static").exists() else BASE_DIR / "previewer" / "static"


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
# Preview-Site Route (สำหรับ Vercel Serverless & Static Proxy)
# -------------------------------------------------------------
@app.api_route("/preview-site/{owner}/{repo}/{subpath:path}", methods=["GET", "HEAD"])
async def serve_preview_site(owner: str, repo: str, subpath: str = ""):
    """
    เสิร์ฟไฟล์เว็บของนักเรียนโดยตรงผ่าน FastAPI (จำเป็นสำหรับการรันบน Vercel หรือโหมด Serverless)
    ฉีด <base> tag และ script ดักจับ console log พร้อมตั้ง cookie สำหรับ absolute paths
    """
    repo_dir = get_repo_cache_dir(owner, repo)
    if not repo_dir.exists():
        raise HTTPException(status_code=404, detail="ยังไม่ได้ดาวน์โหลด repository นี้")

    clean_subpath = subpath.strip("/")
    if not clean_subpath:
        clean_subpath = "index.html"

    target_file = (repo_dir / clean_subpath).resolve()

    # ป้องกัน Directory Traversal
    if not target_file.is_relative_to(repo_dir):
        raise HTTPException(status_code=403, detail="Access denied")

    if target_file.is_dir():
        target_file = target_file / "index.html"

    if not target_file.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    suffix = target_file.suffix.lower()

    # หากเป็นไฟล์ HTML ให้ฉีด Base tag, Console logging script และเซ็ต Cookie
    if suffix in (".html", ".htm"):
        content = None
        for enc in ("utf-8", "utf-8-sig", "tis-620", "cp874", "latin1"):
            try:
                content = target_file.read_text(encoding=enc)
                break
            except Exception:
                continue

        if content is None:
            content = target_file.read_text(encoding="utf-8", errors="replace")

        # ฉีด <base href="/preview-site/{owner}/{repo}/"> เพื่อให้ relative assets ค้นหาถูกโฟลเดอร์
        base_tag = f'<base href="/preview-site/{owner}/{repo}/">'
        if "<base" not in content.lower():
            if "<head>" in content:
                content = content.replace("<head>", f"<head>\n{base_tag}", 1)
            elif "</head>" in content:
                content = content.replace("</head>", f"{base_tag}\n</head>", 1)
            else:
                content = f"{base_tag}\n{content}"

        # ฉีด Logging script
        if "</head>" in content:
            content = content.replace("</head>", f"{CONSOLE_INJECT_SCRIPT}\n</head>", 1)
        elif "</body>" in content:
            content = content.replace("</body>", f"{CONSOLE_INJECT_SCRIPT}\n</body>", 1)
        else:
            content = f"{CONSOLE_INJECT_SCRIPT}\n{content}"

        response = HTMLResponse(content)
        # เซ็ต Cookie ระบุ repo ที่เปิดพรีวิวอยู่ปัจจุบัน เพื่อให้ root-relative paths เช่น /photo/3984.jpg ทำงานได้
        response.set_cookie(
            key="preview_active_repo",
            value=f"{owner}_{repo}",
            path="/",
            samesite="lax",
        )
        return response

    return FileResponse(target_file)


# -------------------------------------------------------------
# Static files and Home Page
# -------------------------------------------------------------
STATIC_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.get("/")
@app.get("/index.html")
@app.get("/index.htm")
@app.get("/api/index.py")
@app.get("/api/index")
@app.get("/api")
@app.get("/api/")
async def root():
    index_file = (PUBLIC_DIR / "index.html") if (PUBLIC_DIR / "index.html").exists() else (STATIC_DIR / "index.html")
    if index_file.exists():
        return FileResponse(index_file)
    return HTMLResponse("<h1>Repo Previewer is running. Static files loading...</h1>")


@app.api_route("/{catchall:path}", methods=["GET", "HEAD"])
async def root_fallback_or_student_asset(request: Request, catchall: str):
    """
    1. ดักจับและเสิร์ฟไฟล์สถิตจาก public หรือ static ถ้ามี
    2. ดักจับ asset ของนักเรียนที่ขึ้นต้นด้วย Absolute path เช่น /photo/3984.jpg
       โดยค้นหาจาก Cookie 'preview_active_repo' ที่เซ็ตไว้ตอนเปิดหน้าพรีวิว
    """
    clean = catchall.strip("/")
    if not clean or clean in ("index.html", "index.htm", "api", "api/index.py"):
        return await root()

    # ตรวจสอบไฟล์ใน public หรือ static ก่อน
    if clean.startswith("static/"):
        sub_rel = clean[len("static/"):]
        candidate_static = (STATIC_DIR / sub_rel).resolve()
        if candidate_static.is_file() and candidate_static.is_relative_to(STATIC_DIR):
            return FileResponse(candidate_static)
        candidate_prev = (BASE_DIR / "previewer" / "static" / sub_rel).resolve()
        if candidate_prev.is_file() and candidate_prev.is_relative_to(BASE_DIR / "previewer" / "static"):
            return FileResponse(candidate_prev)

    candidate_pub = (PUBLIC_DIR / clean).resolve()
    if candidate_pub.is_file() and candidate_pub.is_relative_to(PUBLIC_DIR):
        return FileResponse(candidate_pub)

    candidate_static_direct = (STATIC_DIR / clean).resolve()
    if candidate_static_direct.is_file() and candidate_static_direct.is_relative_to(STATIC_DIR):
        return FileResponse(candidate_static_direct)

    # ตรวจสอบ asset ของนักเรียนผ่าน Cookie preview_active_repo
    active_repo_cookie = request.cookies.get("preview_active_repo")
    if active_repo_cookie and "_" in active_repo_cookie:
        parts = active_repo_cookie.split("_", 1)
        owner, repo = parts[0], parts[1]
        repo_dir = get_repo_cache_dir(owner, repo)
        candidate = (repo_dir / clean).resolve()
        if candidate.is_file() and candidate.is_relative_to(repo_dir):
            return FileResponse(candidate)

    raise HTTPException(status_code=404, detail="Not Found")


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
