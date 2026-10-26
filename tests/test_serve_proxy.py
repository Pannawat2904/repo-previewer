import tempfile
import unittest
from pathlib import Path
from previewer.serve import find_index_html


class TestServeProxy(unittest.TestCase):
    def setUp(self):
        self.temp_dir = Path(tempfile.mkdtemp())

    def test_find_index_html_nested(self):
        nested = self.temp_dir / "my-profile_029" / "my-profile"
        nested.mkdir(parents=True)
        (nested / "index.html").write_text("<h1>Nested</h1>", encoding="utf-8")
        
        has_web, rel, _ = find_index_html(self.temp_dir)
        self.assertTrue(has_web)
        self.assertEqual(rel, "my-profile_029/my-profile/index.html")

    def test_base_href_calculation(self):
        rel = "my-profile_029/my-profile/index.html"
        parent = str(Path(rel).parent).replace("\\", "/")
        self.assertEqual(parent, "my-profile_029/my-profile")
        base_href = f"/preview-site/owner/repo/{parent}/"
        self.assertEqual(base_href, "/preview-site/owner/repo/my-profile_029/my-profile/")

        # Root index
        rel_root = "index.html"
        parent_root = str(Path(rel_root).parent).replace("\\", "/")
        self.assertEqual(parent_root, ".")


if __name__ == "__main__":
    unittest.main()
