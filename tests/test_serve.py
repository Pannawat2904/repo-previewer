import shutil
import tempfile
import unittest
import urllib.request
from pathlib import Path

from previewer.serve import find_index_html, server_manager


class TestServe(unittest.TestCase):
    def setUp(self):
        self.temp_dir = Path(tempfile.mkdtemp())

    def tearDown(self):
        server_manager.stop_all()
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_find_index_html_root(self):
        (self.temp_dir / "index.html").write_text("<h1>Root</h1>", encoding="utf-8")
        has_web, rel, _ = find_index_html(self.temp_dir)
        self.assertTrue(has_web)
        self.assertEqual(rel, "index.html")

    def test_find_index_html_subfolder(self):
        sub = self.temp_dir / "public"
        sub.mkdir()
        (sub / "index.html").write_text("<h1>Sub</h1>", encoding="utf-8")
        has_web, rel, _ = find_index_html(self.temp_dir)
        self.assertTrue(has_web)
        self.assertEqual(rel, "public/index.html")

    def test_find_index_html_none(self):
        (self.temp_dir / "main.py").write_text("print('hello')", encoding="utf-8")
        has_web, rel, _ = find_index_html(self.temp_dir)
        self.assertFalse(has_web)
        self.assertIsNone(rel)

    def test_start_server_and_fetch_content(self):
        (self.temp_dir / "index.html").write_text("<html><head><title>Test</title></head><body>Hello Thai ภาษาไทย</body></html>", encoding="utf-8")
        res = server_manager.get_or_start("tester", "myrepo", self.temp_dir)
        self.assertTrue(res["has_web"])
        url = res["url"]
        self.assertIn("127.0.0.1", url)

        # ทดสอบอ่าน URL ผ่าน HTTP จริง
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=5) as response:
            self.assertEqual(response.status, 200)
            data = response.read().decode("utf-8")
            # ตรวจสอบว่าภาษาไทยไม่เพี้ยน และมีการฉีด script สำหรับ logging
            self.assertIn("ภาษาไทย", data)
            self.assertIn("repo-previewer-sandbox", data)


if __name__ == "__main__":
    unittest.main()
