import os
import unittest
import tempfile
import shutil
from pathlib import Path
from unittest.mock import patch
from previewer.ai_grader import evaluate_with_ast_fallback, parse_prompt_specs, resolve_gemini_api_key
import previewer.storage as storage
from previewer.storage import (
    DEFAULT_ASSIGNMENT_PROMPT,
    delete_assignment,
    get_assignment,
    save_assignment,
    sort_assignments_list,
)

class TestAiGrader(unittest.TestCase):
    def setUp(self):
        self.tmp_dir = tempfile.mkdtemp()
        self.patcher = patch.object(storage, 'ASSIGNMENTS_FILE', Path(self.tmp_dir) / 'assignments.json')
        self.config_patcher = patch.object(storage, 'CONFIG_FILE', Path(self.tmp_dir) / 'config.json')
        self.patcher.start()
        self.config_patcher.start()

    def tearDown(self):
        self.config_patcher.stop()
        self.patcher.stop()
        shutil.rmtree(self.tmp_dir, ignore_errors=True)

    def test_default_assignment(self):
        asg = get_assignment("course-python-oop-1")
        self.assertIn("Product", asg["title"])
        self.assertIn("Product", asg["prompt"])
        self.assertEqual(asg["max_score"], 10)
        self.assertIn("assignments", asg)
        self.assertGreaterEqual(len(asg["assignments"]), 4)

    def test_parse_prompt_specs(self):
        prompt = """
        ข้อกำหนดของโปรแกรม
        • สร้างคลาสชื่อ BankAccount
        • กำหนด Property ได้แก่ account_id, owner_name, balance
        • สร้าง Method ชื่อ show_balance() สำหรับแสดงยอดเงิน
        • สร้าง Object อย่างน้อย 2 รายการ
        """
        specs = parse_prompt_specs(prompt)
        self.assertEqual(specs["class_name"], "BankAccount")
        self.assertIn("account_id", specs["attributes"])
        self.assertIn("owner_name", specs["attributes"])
        self.assertIn("balance", specs["attributes"])
        self.assertIn("show_balance", specs["methods"])
        self.assertEqual(specs["min_objects"], 2)

    def test_grade_custom_prompt_submission(self):
        custom_prompt = """
        • สร้างคลาสชื่อ BankAccount
        • กำหนด Property ได้แก่ account_id, owner_name, balance
        • สร้าง Method ชื่อ show_balance() สำหรับแสดงยอดเงิน
        • สร้าง Object อย่างน้อย 2 รายการ
        """
        code = '''
class BankAccount:
    def __init__(self, account_id, owner_name, balance):
        self.account_id = account_id
        self.owner_name = owner_name
        self.balance = balance

    def show_balance(self):
        print(f"ID: {self.account_id}, Owner: {self.owner_name}, Balance: {self.balance}")

acc1 = BankAccount("001", "นายเอก", 1500)
acc2 = BankAccount("002", "นางสาวบี", 3200)
acc1.show_balance()
acc2.show_balance()
'''
        result = evaluate_with_ast_fallback(custom_prompt, code, student_name="สมชาย")
        self.assertEqual(result["score"], 10)
        self.assertEqual(result["status"], "passed")
        self.assertTrue(all(c["passed"] for c in result["checklist"]))

    def test_save_and_switch_assignment(self):
        # ทดสอบการสลับงานที่ตรวจใน storage
        save_assignment("course-python-oop-1", {
            "id": "work-3",
            "title": "งานที่ 3 บัญชีธนาคาร (BankAccount)",
            "prompt": "สร้างคลาส BankAccount",
            "max_score": 10
        })
        asg = get_assignment("course-python-oop-1")
        self.assertEqual(asg["active_assignment_id"], "work-3")
        self.assertEqual(asg["id"], "work-3")
        self.assertIn("BankAccount", asg["title"])

        # คืนค่าเป็น work-4 เพื่อไม่ให้กระทบค่าเดิม
        save_assignment("course-python-oop-1", {
            "id": "work-4",
            "title": "งานที่ 4 โปรแกรมจัดการข้อมูลสินค้า (Product Class)",
            "prompt": DEFAULT_ASSIGNMENT_PROMPT,
            "max_score": 10
        })

    def test_grade_perfect_submission(self):
        code = '''
class Product:
    def __init__(self, name, price, quantity):
        self.name = name
        self.price = price
        self.quantity = quantity

    def show_info(self):
        total = self.price * self.quantity
        print(f"Name: {self.name}, Price: {self.price}, Quantity: {self.quantity}, Total: {total}")

p1 = Product("Keyboard", 550, 2)
p2 = Product("Mouse", 250, 3)
p1.show_info()
p2.show_info()
'''
        result = evaluate_with_ast_fallback(DEFAULT_ASSIGNMENT_PROMPT, code, student_name="สมชาย")
        self.assertEqual(result["score"], 10)
        self.assertEqual(result["status"], "passed")
        self.assertTrue(all(c["passed"] for c in result["checklist"]))
        self.assertIn("10/10", result["suggested_teacher_note"])

    def test_grade_incomplete_submission(self):
        code = '''
class Product:
    def __init__(self, name, price):
        self.name = name
        self.price = price

p1 = Product("Keyboard", 550)
'''
        result = evaluate_with_ast_fallback(DEFAULT_ASSIGNMENT_PROMPT, code, student_name="สมหญิง")
        self.assertLess(result["score"], 10)
        self.assertEqual(result["status"], "failed")
        # should fail quantity, show_info, 2 objects, and show_info calls
        failed_items = [c for c in result["checklist"] if not c["passed"]]
        self.assertGreaterEqual(len(failed_items), 3)

    def test_grade_syntax_error(self):
        code = '''
class Product
    def __init__(self):
        pass
'''
        result = evaluate_with_ast_fallback(DEFAULT_ASSIGNMENT_PROMPT, code)
        self.assertEqual(result["score"], 0)
        self.assertEqual(result["status"], "failed")
        self.assertIn("SyntaxError", result["summary"])

    def test_sort_assignments_natural_order(self):
        unsorted = [
            {"id": "custom-10", "title": "งานที่ 10 โปรเจกต์ใหญ่"},
            {"id": "custom-4", "title": "งานที่ 4 จัดการสินค้า"},
            {"id": "custom-2", "title": "งานที่ 2 คลาส Student"},
            {"id": "custom-1", "title": "งานที่ 1 พื้นฐาน Python 3"},
            {"id": "custom-3", "title": "งาน 3 BankAccount"},
        ]
        sorted_items = sort_assignments_list(unsorted)
        self.assertEqual(
            [item["id"] for item in sorted_items],
            ["custom-1", "custom-2", "custom-3", "custom-4", "custom-10"],
        )

    def test_save_keeps_sorted_and_delete_assignment(self):
        # เพิ่มงานที่ 10 และงานที่ 0/พิเศษ แล้วตรวจว่าลิสต์ถูกเรียงเป็น 1, 2, 3, 4, 10
        save_assignment("course-python-oop-1", {
            "id": "work-10",
            "title": "งานที่ 10 แบบทดสอบปลายภาค",
            "prompt": "สรุปบทเรียน",
            "max_score": 10,
        })
        save_assignment("course-python-oop-1", {
            "id": "work-2b",
            "title": "งานที่ 2.5 โจทย์เสริม",
            "prompt": "โจทย์เสริม",
            "max_score": 10,
        })
        asg = get_assignment("course-python-oop-1")
        ids = [t["id"] for t in asg["assignments"]]
        self.assertEqual(ids[:4], ["work-1", "work-2", "work-2b", "work-3"])
        self.assertEqual(ids[-2:], ["work-4", "work-10"])

        # ลบงานที่ active อยู่ (work-2b) -> ต้องสลับไปที่ตัวแรกและยังเรียงถูกต้อง
        after_del = delete_assignment("course-python-oop-1", "work-2b")
        after_ids = [t["id"] for t in after_del["assignments"]]
        self.assertNotIn("work-2b", after_ids)
        self.assertEqual(after_ids, ["work-1", "work-2", "work-3", "work-4", "work-10"])
        self.assertEqual(after_del["active_assignment_id"], "work-1")

        # ลบงานทั้งหมด -> ต้องเป็น list ว่างจริง ไม่คืนค่าเริ่มต้นกลับมา
        for tid in list(after_ids):
            after_empty = delete_assignment("course-python-oop-1", tid)
        self.assertEqual(after_empty["assignments"], [])
        self.assertEqual(after_empty["active_assignment_id"], "")

    def test_delete_assignment_http_endpoint(self):
        from fastapi.testclient import TestClient
        import app as main_app

        client = TestClient(main_app.app)
        resp = client.delete("/api/assignment/course-python-oop-1/work-2")
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        ids = [t["id"] for t in body["assignments"]]
        self.assertEqual(ids, ["work-1", "work-3", "work-4"])

    def test_is_seed_and_client_assignments_cold_start_and_1_to_40_slots(self):
        import previewer.storage as storage

        # 1) ก่อนบันทึกครั้งแรก get_assignment ต้องคืน is_seed=True
        initial = storage.get_assignment("course-python-oop-1")
        self.assertTrue(initial.get("is_seed"))

        # 2) ลบงาน 1-3 เหลือแค่งาน 4 แล้วบันทึก -> is_seed ต้องเป็น False
        storage.delete_assignment("course-python-oop-1", "work-1")
        storage.delete_assignment("course-python-oop-1", "work-2")
        storage.delete_assignment("course-python-oop-1", "work-3")
        after_del = storage.get_assignment("course-python-oop-1")
        self.assertFalse(after_del.get("is_seed"))
        self.assertEqual([t["id"] for t in after_del["assignments"]], ["work-4"])

        # 3) จำลอง Vercel Cold Start (ลบไฟล์ ASSIGNMENTS_FILE) แล้วครูใส่ "งานที่ 1" ย้อนหลัง + งานที่ 40
        if storage.ASSIGNMENTS_FILE.exists():
            storage.ASSIGNMENTS_FILE.unlink()
        self.assertTrue(storage.get_assignment("course-python-oop-1").get("is_seed"))

        saved_1 = storage.save_assignment(
            "course-python-oop-1",
            {
                "id": "work-1",
                "title": "งานที่ 1 โจทย์ใหม่",
                "prompt": "โจทย์ย้อนหลังงานที่ 1",
                "max_score": 10,
                "client_assignments": after_del["assignments"],
            },
        )
        self.assertFalse(saved_1.get("is_seed"))
        self.assertEqual([t["id"] for t in saved_1["assignments"]], ["work-1", "work-4"])

        saved_40 = storage.save_assignment(
            "course-python-oop-1",
            {
                "id": "work-40",
                "title": "งานที่ 40 โปรเจกต์ปลายภาค",
                "prompt": "โปรเจกต์จบ",
                "max_score": 10,
            },
        )
        self.assertEqual(
            [t["id"] for t in saved_40["assignments"]],
            ["work-1", "work-4", "work-40"],
        )

        # ตรวจสอบผ่าน HTTP POST /api/assignment/{course_id} ด้วยว่า client_assignments ไม่ถูก seed ทับหลัง cold start
        if storage.ASSIGNMENTS_FILE.exists():
            storage.ASSIGNMENTS_FILE.unlink()
        from fastapi.testclient import TestClient
        import app as main_app

        client = TestClient(main_app.app)
        resp = client.post(
            "/api/assignment/course-python-oop-1",
            json={
                "id": "work-2",
                "title": "งานที่ 2 ใส่ย้อนหลัง",
                "prompt": "โจทย์งาน 2",
                "max_score": 10,
                "client_assignments": saved_40["assignments"],
            },
        )
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertFalse(body.get("is_seed"))
        self.assertEqual(
            [t["id"] for t in body["assignments"]],
            ["work-1", "work-2", "work-4", "work-40"],
        )

    def test_global_gemini_key_shared_across_assignments(self):
        from fastapi.testclient import TestClient
        import app as main_app

        client = TestClient(main_app.app)
        with patch.dict(os.environ, {"GEMINI_API_KEY": ""}, clear=False):
            status_empty = client.get("/api/settings/gemini-key")
            self.assertEqual(status_empty.status_code, 200)
            self.assertFalse(status_empty.json()["configured"])
            self.assertEqual(status_empty.json()["source"], "")

            save_resp = client.post(
                "/api/settings/gemini-key",
                json={"api_key": "AIzaSyTestGlobal123456", "skip_test": True},
            )
            self.assertEqual(save_resp.status_code, 200)
            self.assertEqual(save_resp.json()["status"], "ok")
            self.assertEqual(save_resp.json()["masked"], "AIzaSy...3456")

            status_cfg = client.get("/api/settings/gemini-key")
            self.assertEqual(status_cfg.status_code, 200)
            self.assertTrue(status_cfg.json()["configured"])
            self.assertEqual(status_cfg.json()["source"], "config")
            self.assertEqual(resolve_gemini_api_key(), "AIzaSyTestGlobal123456")

            clear_resp = client.post(
                "/api/settings/gemini-key",
                json={"api_key": "", "skip_test": True},
            )
            self.assertEqual(clear_resp.status_code, 200)
            self.assertEqual(clear_resp.json()["status"], "cleared")
            self.assertFalse(client.get("/api/settings/gemini-key").json()["configured"])

        with patch.dict(os.environ, {"GEMINI_API_KEY": "AIzaSyEnvKey999888"}, clear=False):
            status_env = client.get("/api/settings/gemini-key").json()
            self.assertTrue(status_env["configured"])
            self.assertEqual(status_env["source"], "env")


if __name__ == "__main__":
    unittest.main()

