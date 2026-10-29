import io
import shutil
import tempfile
import unittest
import zipfile
from pathlib import Path

from previewer.fetch import (
    safe_extract_zip,
    FetchError,
    clear_all_cache,
    delete_repo_cache,
    is_repo_cached,
)


class TestFetch(unittest.TestCase):
    def setUp(self):
        self.temp_dir = Path(tempfile.mkdtemp())

    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_safe_extract_with_top_level_wrapper(self):
        # สร้าง zip ที่มีโฟลเดอร์ครอบ repo-main/
        zip_buf = io.BytesIO()
        with zipfile.ZipFile(zip_buf, "w") as zf:
            zf.writestr("my-project-main/index.html", "<h1>Hello</h1>")
            zf.writestr("my-project-main/css/style.css", "body { color: red; }")

        dest = self.temp_dir / "extracted"
        total_files, total_size = safe_extract_zip(zip_buf.getvalue(), dest)

        self.assertEqual(total_files, 2)
        # ตรวจสอบว่า strip prefix สำเร็จ index.html ต้องอยู่ที่ root ของ dest
        self.assertTrue((dest / "index.html").exists())
        self.assertTrue((dest / "css" / "style.css").exists())
        self.assertEqual((dest / "index.html").read_text(encoding="utf-8"), "<h1>Hello</h1>")

    def test_zip_slip_prevention(self):
        # สร้าง zip ที่มี path traversal ../../evil.txt
        zip_buf = io.BytesIO()
        with zipfile.ZipFile(zip_buf, "w") as zf:
            zf.writestr("../../evil.txt", "evil content")

        dest = self.temp_dir / "safe_dest"
        with self.assertRaises(FetchError):
            safe_extract_zip(zip_buf.getvalue(), dest)

    def test_clear_all_cache(self):
        cache_dir = self.temp_dir / "cache"
        repo1 = cache_dir / "user_repo1"
        repo1.mkdir(parents=True)
        (repo1 / ".repo_meta.json").write_text("{}", encoding="utf-8")

        repo2 = cache_dir / "user_repo2"
        repo2.mkdir(parents=True)
        (repo2 / ".repo_meta.json").write_text("{}", encoding="utf-8")

        self.assertTrue(is_repo_cached("user", "repo1", cache_dir))
        self.assertTrue(is_repo_cached("user", "repo2", cache_dir))

        deleted = clear_all_cache(cache_dir)
        self.assertEqual(deleted, 2)
        self.assertFalse(is_repo_cached("user", "repo1", cache_dir))

    def test_delete_single_repo_cache(self):
        cache_dir = self.temp_dir / "cache"
        repo1 = cache_dir / "user_repo1"
        repo1.mkdir(parents=True)
        (repo1 / ".repo_meta.json").write_text("{}", encoding="utf-8")

        repo2 = cache_dir / "user_repo2"
        repo2.mkdir(parents=True)
        (repo2 / ".repo_meta.json").write_text("{}", encoding="utf-8")

        self.assertTrue(is_repo_cached("user", "repo1", cache_dir))
        self.assertTrue(is_repo_cached("user", "repo2", cache_dir))

        res = delete_repo_cache("user", "repo1", cache_dir)
        self.assertTrue(res)
        self.assertFalse(is_repo_cached("user", "repo1", cache_dir))
        self.assertTrue(is_repo_cached("user", "repo2", cache_dir))
        self.assertFalse(delete_repo_cache("user", "repo1", cache_dir))


if __name__ == "__main__":
    unittest.main()
