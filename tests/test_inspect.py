import shutil
import tempfile
import unittest
from pathlib import Path

from previewer.inspect import inspect_repository


class TestInspect(unittest.TestCase):
    def setUp(self):
        self.temp_dir = Path(tempfile.mkdtemp())

    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_missing_reference_with_suggestion(self):
        # สร้างโฟลเดอร์จำลองเหมือนเคสของ patvikan24-oss/my-profil-013
        (self.temp_dir / "index.html").write_text(
            '<html><body><img src="../photo/3984.jpg"><link rel="stylesheet" href="style.css"></body></html>',
            encoding="utf-8",
        )
        (self.temp_dir / "style.css").write_text("body {}", encoding="utf-8")
        photo_dir = self.temp_dir / "photo"
        photo_dir.mkdir()
        (photo_dir / "3984.jpg").write_bytes(b"dummy image")

        res = inspect_repository(self.temp_dir)
        self.assertTrue(res["has_web"])
        obs = res["observations"]
        self.assertEqual(len(obs), 1)
        self.assertEqual(obs[0]["category"], "missing_file")
        self.assertEqual(obs[0]["raw_ref"], "../photo/3984.jpg")
        self.assertEqual(obs[0]["suggestion"], "photo/3984.jpg")

    def test_subfolder_index_detection(self):
        sub = self.temp_dir / "src"
        sub.mkdir()
        (sub / "index.html").write_text("<h1>Nested</h1>", encoding="utf-8")

        res = inspect_repository(self.temp_dir)
        self.assertTrue(res["has_web"])
        obs = res["observations"]
        self.assertTrue(any(o["category"] == "structure" and "src/index.html" in o["detail"] for o in obs))


if __name__ == "__main__":
    unittest.main()
