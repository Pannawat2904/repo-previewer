import unittest
from previewer.ai_grader import evaluate_with_ast_fallback
from previewer.storage import DEFAULT_ASSIGNMENT_PROMPT, get_assignment, save_assignment

class TestAiGrader(unittest.TestCase):
    def test_default_assignment(self):
        asg = get_assignment("course-python-oop-1")
        self.assertIn("Product", asg["title"])
        self.assertIn("Product", asg["prompt"])
        self.assertEqual(asg["max_score"], 10)

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

