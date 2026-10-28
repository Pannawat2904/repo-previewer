"""
การทดสอบด้านความปลอดภัย (Security Tests)
ครอบคลุม:
1. HTTP Security Headers (nosniff, SAMEORIGIN, Referrer-Policy, Permissions-Policy)
2. CSP Headers ในการพรีวิวเว็บนักเรียน (frame-ancestors 'self')
3. การป้องกัน Path Traversal ใน Preview Site และ File Content API
4. การบล็อกการเข้าถึงไฟล์ซ่อนและไฟล์ระบบ (.repo_meta.json, .git, .env)
5. การตรวจสอบความถูกต้องของ GitHub identifier (ป้องกัน injection)
6. การป้องกัน Zip-Slip และ Zip-Bomb
"""

import io
import tempfile
import unittest
import zipfile
from pathlib import Path
from fastapi.testclient import TestClient

from app import app
from previewer.fetch import FetchError, safe_extract_zip
from previewer.links import normalize_github_url


class TestSecurity(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_security_headers_present(self):
        """ตรวจสอบว่ามี Security Headers พื้นฐานครบถ้วน"""
        res = self.client.get("/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.headers.get("x-content-type-options"), "nosniff")
        self.assertEqual(res.headers.get("x-frame-options"), "SAMEORIGIN")
        self.assertEqual(res.headers.get("referrer-policy"), "strict-origin-when-cross-origin")
        self.assertIn("camera=()", res.headers.get("permissions-policy", ""))

    def test_csp_header_on_preview_site(self):
        """ตรวจสอบว่าหน้าพรีวิวมี CSP ป้องกันการถูกฝังจากเว็บภายนอก"""
        # ใช้ patvikan24-oss_my-profil-013 ที่มีแคชอยู่แล้ว
        res = self.client.get("/preview-site/patvikan24-oss/my-profil-013/index.html")
        if res.status_code == 200:
            csp = res.headers.get("content-security-policy", "")
            self.assertIn("frame-ancestors 'self'", csp)

    def test_hidden_file_access_blocked_in_preview(self):
        """ตรวจสอบว่าการพยายามเข้าถึงไฟล์ซ่อนหรือไฟล์ระบบจะถูกบล็อกด้วย 403"""
        res = self.client.get("/preview-site/patvikan24-oss/my-profil-013/.repo_meta.json")
        self.assertEqual(res.status_code, 403)

    def test_api_file_content_hidden_blocked(self):
        """ตรวจสอบว่า API อ่านโค้ดบล็อกการเข้าถึงไฟล์ระบบและ .repo_meta.json"""
        res = self.client.get(
            "/api/files/content/patvikan24-oss/my-profil-013",
            params={"path": ".repo_meta.json"}
        )
        self.assertEqual(res.status_code, 403)

    def test_invalid_owner_repo_rejected(self):
        """ตรวจสอบว่าชื่อ owner/repo ที่ไม่ถูกต้องหรือมี path traversal จะถูกปฏิเสธ"""
        res = self.client.get("/preview-site/invalid*user/myrepo/index.html")
        self.assertEqual(res.status_code, 400)

        res2 = self.client.get("/preview-site/.hidden/myrepo/index.html")
        self.assertEqual(res2.status_code, 400)

        owner, repo, err = normalize_github_url("https://github.com/../../etc/passwd")
        self.assertIsNotNone(err)

        owner2, repo2, err2 = normalize_github_url("https://github.com/evil;rm-rf/test")
        self.assertIsNotNone(err2)

    def test_zip_slip_protection(self):
        """ทดสอบว่า safe_extract_zip บล็อกไฟล์ที่มี Path Traversal (Zip-Slip)"""
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w") as zf:
            zf.writestr("../../evil.sh", "echo hacked")

        temp_dir = Path(tempfile.mkdtemp())
        with self.assertRaises(FetchError) as ctx:
            safe_extract_zip(buf.getvalue(), temp_dir)
        self.assertIn("Zip-Slip", str(ctx.exception))

    def test_zip_bomb_file_count_limit(self):
        """ทดสอบว่าระบบจำกัดจำนวนไฟล์แตกออกมาไม่ให้เกิน 5,000 ไฟล์"""
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w") as zf:
            for i in range(5005):
                zf.writestr(f"file_{i}.txt", "a")

        temp_dir = Path(tempfile.mkdtemp())
        with self.assertRaises(FetchError) as ctx:
            safe_extract_zip(buf.getvalue(), temp_dir)
        self.assertIn("เกินกำหนด", str(ctx.exception))


if __name__ == "__main__":
    unittest.main()
