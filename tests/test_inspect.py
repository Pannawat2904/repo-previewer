import base64
import json
import shutil
import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

from app import app
from previewer.inspect import inspect_repository
from previewer.python_inspector import analyze_python_source, parse_ipynb_content


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

    def test_python_oop_inspection(self):
        code = '''
class Person:
    def __init__(self, name):
        self.name = name

class Student(Person):
    def __init__(self, name, score):
        super().__init__(name)
        self.score = score
        self.grade = "A" if score >= 80 else "B"

    def show_info(self):
        return f"{self.name}: {self.grade}"

name_in = input("กรอกชื่อนักเรียน: ")
s1 = Student(name_in, 85)
print(s1.show_info())
'''
        (self.temp_dir / "main.py").write_text(code, encoding="utf-8")

        res = inspect_repository(self.temp_dir)
        self.assertFalse(res["has_web"])
        self.assertTrue(res["has_python"])
        py_info = res["python_info"]
        self.assertEqual(py_info["entry_file"], "main.py")
        self.assertEqual(py_info["oop_summary"]["total_classes"], 2)
        self.assertTrue(py_info["oop_summary"]["has_inheritance"])

        analysis = analyze_python_source(code, "main.py")
        self.assertTrue(analysis["syntax_valid"])
        self.assertTrue(analysis["uses_input"])
        self.assertIn("กรอกชื่อนักเรียน: ", analysis["input_prompts"])
        student_cls = next(c for c in analysis["classes"] if c["name"] == "Student")
        self.assertEqual(student_cls["bases"], ["Person"])
        self.assertIn("score", student_cls["attributes"])
        self.assertIn("grade", student_cls["attributes"])

    def test_ipynb_parsing(self):
        nb_dict = {
            "cells": [
                {"cell_type": "markdown", "source": ["# การบ้าน OOP ครั้งที่ 1"]},
                {
                    "cell_type": "code",
                    "source": ["class Dog:\n", "    def bark(self):\n", "        print('Woof!')\n", "Dog().bark()"],
                    "outputs": [{"output_type": "stream", "text": ["Woof!\n"]}],
                },
            ]
        }
        parsed = parse_ipynb_content(json.dumps(nb_dict), "oop_hw.ipynb")
        self.assertEqual(parsed["code_cells_count"], 1)
        self.assertIn("class Dog:", parsed["extracted_code"])
        self.assertEqual(parsed["saved_outputs"][0]["output"], "Woof!")

    def test_upload_batch_endpoint(self):
        client = TestClient(app)
        py_source = "class Car:\n    def __init__(self, brand):\n        self.brand = brand\nc = Car('Toyota')\nprint(c.brand)\n"
        b64_content = base64.b64encode(py_source.encode("utf-8")).decode("ascii")

        resp = client.post(
            "/api/repos/upload-batch",
            json={
                "files": [
                    {
                        "filename": "6601001_สมชาย_oop.py",
                        "content_base64": b64_content,
                    }
                ],
                "group_as_single_student": False,
            },
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(len(data["items"]), 1)
        item = data["items"][0]
        self.assertTrue(item["has_python"])
        self.assertEqual(item["python_info"]["oop_summary"]["total_classes"], 1)
        self.assertIn("ai_analysis", item["local_bundle"]["inspect"])

    def test_ai_detector_signals(self):
        ai_like_code = '''
# Step 1: Define the base class
class Employee:
    """
    Base class representing an employee.
    Args:
        name (str): Employee name
    """
    def __init__(self, name: str, salary: float) -> None:
        self.name = name
        self.salary = salary

    @property
    def annual_salary(self) -> float:
        return self.salary * 12

# Example usage:
if __name__ == "__main__":
    emp = Employee("John Doe", 50000.0)
    print("-" * 40)
    print(emp.annual_salary)
'''
        (self.temp_dir / "main.py").write_text(ai_like_code, encoding="utf-8")
        res = inspect_repository(self.temp_dir)
        ai_info = res["ai_analysis"]
        self.assertGreaterEqual(ai_info["ai_score"], 65)
        self.assertEqual(ai_info["risk_level"], "high")
        self.assertTrue(len(ai_info["signals"]) >= 4)
        self.assertTrue(len(ai_info["viva_questions"]) >= 1)


if __name__ == "__main__":
    unittest.main()
