import unittest
import tempfile
import shutil
from pathlib import Path
from unittest.mock import patch
from previewer.ai_grader import evaluate_with_ast_fallback, parse_prompt_specs
import previewer.storage as storage
from previewer.storage import DEFAULT_ASSIGNMENT_PROMPT, get_assignment, save_assignment

class TestAiGrader(unittest.TestCase):
    def setUp(self):
        self.tmp_dir = tempfile.mkdtemp()
        self.patcher = patch.object(storage, 'ASSIGNMENTS_FILE', Path(self.tmp_dir) / 'assignments.json')
        self.patcher.start()

    def tearDown(self):
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

if __name__ == "__main__":
    unittest.main()

