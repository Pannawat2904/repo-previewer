"""
โมดูลสำหรับตรวจสอบ วิเคราะห์โครงสร้าง OOP (Classes, Inheritance, Methods, Attributes)
และเตรียมไฟล์สำหรับรันโค้ด Python (.py) และ Jupyter Notebook (.ipynb)
โดยใช้ AST (Abstract Syntax Tree) ที่ปลอดภัย 100%
"""

import ast
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

IGNORED_DIRS = {
    ".git", ".github", ".vscode", ".idea", "__pycache__",
    ".venv", "venv", "env", "node_modules", ".pytest_cache",
}

PREFERRED_ENTRY_NAMES = (
    "main.py", "app.py", "run.py", "index.py",
    "oop.py", "student.py", "lab.py", "homework.py", "test.py",
)

SUPPORT_TEXT_EXTENSIONS = {".py", ".txt", ".csv", ".json", ".tsv", ".md"}


def _read_text_with_thai_fallback(file_path: Path) -> str:
    """อ่านไฟล์ข้อความโดยรองรับทั้ง UTF-8 และ TIS-620/CP874 สำหรับภาษาไทย"""
    raw = file_path.read_bytes()
    for enc in ("utf-8", "utf-8-sig", "cp874", "tis-620", "latin1"):
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            continue
    return raw.decode("utf-8", errors="replace")


def _unparse_Name(node: ast.AST) -> str:
    """แปลง AST node ของ base class หรือ annotation เป็นชื่อข้อความ"""
    if hasattr(ast, "unparse"):
        try:
            return ast.unparse(node)
        except Exception:
            pass
    if isinstance(node, ast.Name):
        return node.id
    if isinstance(node, ast.Attribute):
        return f"{_unparse_Name(node.value)}.{node.attr}"
    return "object"


def analyze_python_source(code: str, filename: str = "<string>") -> Dict[str, Any]:
    """
    วิเคราะห์โค้ด Python ด้วย AST เพื่อสกัดข้อมูลสำหรับวิชา OOP และ Python พื้นฐาน:
    - รายชื่อคลาส (Classes), การสืบทอด (Inheritance bases), แอตทริบิวต์ (self.xxx), เมธอด (Methods)
    - รายชื่อฟังก์ชัน (Functions)
    - การเรียกใช้คำสั่ง input() พร้อมข้อความ Prompt
    - การตรวจสอบ SyntaxError พร้อมเลขบรรทัด
    """
    result: Dict[str, Any] = {
        "valid_syntax": True,
        "syntax_valid": True,
        "syntax_error": None,
        "classes": [],
        "functions": [],
        "imports": [],
        "uses_input": False,
        "input_count": 0,
        "input_prompts": [],
        "has_main_guard": False,
    }

    try:
        tree = ast.parse(code, filename=filename)
    except SyntaxError as se:
        lines = code.splitlines()
        err_line = ""
        if se.lineno and 1 <= se.lineno <= len(lines):
            err_line = lines[se.lineno - 1]
        result["valid_syntax"] = False
        result["syntax_valid"] = False
        result["syntax_error"] = {
            "lineno": se.lineno or 1,
            "offset": se.offset or 0,
            "message": se.msg or "SyntaxError",
            "line_text": err_line,
            "text": err_line,
        }
        return result
    except Exception as e:
        result["valid_syntax"] = False
        result["syntax_valid"] = False
        result["syntax_error"] = {
            "lineno": 1,
            "offset": 0,
            "message": str(e),
            "line_text": "",
            "text": "",
        }
        return result

    # 1. ตรวจหา Call ของ input() และ import ทั้งหมด
    for node in ast.walk(tree):
        if isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name) and node.func.id == "input":
                result["uses_input"] = True
                result["input_count"] += 1
                prompt_text = ""
                if node.args and isinstance(node.args[0], ast.Constant) and isinstance(node.args[0].value, str):
                    prompt_text = node.args[0].value
                result["input_prompts"].append(prompt_text)
        elif isinstance(node, ast.Import):
            for alias in node.names:
                if alias.name not in result["imports"]:
                    result["imports"].append(alias.name)
        elif isinstance(node, ast.ImportFrom):
            mod = node.module or ""
            if mod and mod not in result["imports"]:
                result["imports"].append(mod)

    # 2. ตรวจหา Classes, Functions, และ if __name__ == '__main__' ในระดับโมดูล
    for node in tree.body:
        if isinstance(node, ast.ClassDef):
            bases = [_unparse_Name(b) for b in node.bases]
            doc = ast.get_docstring(node) or ""
            methods = []
            attributes = []

            for item in node.body:
                if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    arg_names = [a.arg for a in item.args.args if a.arg not in ("self", "cls")]
                    methods.append({
                        "name": item.name,
                        "lineno": item.lineno,
                        "args": arg_names,
                        "is_dunder": item.name.startswith("__") and item.name.endswith("__"),
                    })
                    # ค้นหาการกำหนดค่า self.<attr> หรือ self.__<attr> (Encapsulation)
                    for sub in ast.walk(item):
                        if isinstance(sub, (ast.Assign, ast.AnnAssign)):
                            targets = sub.targets if isinstance(sub, ast.Assign) else [sub.target]
                            for t in targets:
                                if (
                                    isinstance(t, ast.Attribute)
                                    and isinstance(t.value, ast.Name)
                                    and t.value.id == "self"
                                ):
                                    if t.attr not in attributes:
                                        attributes.append(t.attr)
                elif isinstance(item, (ast.Assign, ast.AnnAssign)):
                    # Class attributes
                    targets = item.targets if isinstance(item, ast.Assign) else [item.target]
                    for t in targets:
                        if isinstance(t, ast.Name) and t.id not in attributes:
                            attributes.append(t.id)

            result["classes"].append({
                "name": node.name,
                "lineno": node.lineno,
                "bases": bases,
                "docstring": doc.splitlines()[0] if doc else "",
                "methods": methods,
                "attributes": attributes,
            })

        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            arg_names = [a.arg for a in node.args.args]
            result["functions"].append({
                "name": node.name,
                "lineno": node.lineno,
                "args": arg_names,
            })

        elif isinstance(node, ast.If):
            # ตรวจสอบ if __name__ == "__main__":
            try:
                test_str = _unparse_Name(node.test)
                if "__name__" in test_str and "__main__" in test_str:
                    result["has_main_guard"] = True
            except Exception:
                pass

    return result


def parse_ipynb_content(raw_json_str: str, filename: str = "notebook.ipynb") -> Dict[str, Any]:
    """
    แยกข้อมูลจากไฟล์ Jupyter Notebook (.ipynb)
    คืนค่ารายการ Cells (Markdown / Code / Outputs) และรวมโค้ด Python สำหรับรันทดสอบ
    """
    try:
        nb = json.loads(raw_json_str)
    except Exception as e:
        return {
            "cells": [],
            "code_cells_count": 0,
            "markdown_cells": [],
            "saved_outputs": [],
            "combined_code": f"# ไม่สามารถอ่านไฟล์ .ipynb ได้: {e}\n",
            "extracted_code": f"# ไม่สามารถอ่านไฟล์ .ipynb ได้: {e}\n",
            "analysis": analyze_python_source("", filename),
        }

    cells_out = []
    code_blocks = []
    markdown_cells = []
    saved_outputs = []

    raw_cells = nb.get("cells", [])
    for idx, cell in enumerate(raw_cells):
        cell_type = cell.get("cell_type", "code")
        source_raw = cell.get("source", [])
        source_text = "".join(source_raw) if isinstance(source_raw, list) else str(source_raw)

        outputs_parsed = []
        cell_text_outputs = []
        if cell_type == "markdown":
            if source_text.strip():
                markdown_cells.append(source_text.strip())
        elif cell_type == "code":
            # กรองบรรทัดคำสั่งพิเศษของ IPython เช่น !pip หรือ %matplotlib
            clean_lines = []
            for line in source_text.splitlines():
                stripped = line.lstrip()
                if stripped.startswith(("!", "%")):
                    clean_lines.append(f"# [IPython magic] {line}")
                else:
                    clean_lines.append(line)
            if clean_lines:
                code_blocks.append(f"# --- Cell {idx + 1} ---\n" + "\n".join(clean_lines))

            for out in cell.get("outputs", []):
                out_type = out.get("output_type", "")
                if out_type == "stream":
                    text_raw = out.get("text", [])
                    text_val = "".join(text_raw) if isinstance(text_raw, list) else str(text_raw)
                    outputs_parsed.append({"type": "text", "content": text_val})
                    cell_text_outputs.append(text_val)
                elif out_type in ("execute_result", "display_data"):
                    data = out.get("data", {})
                    if "image/png" in data:
                        img_b64 = data["image/png"]
                        if isinstance(img_b64, list):
                            img_b64 = "".join(img_b64)
                        outputs_parsed.append({"type": "image", "data_url": f"data:image/png;base64,{img_b64.strip()}"})
                    elif "text/plain" in data:
                        txt = data["text/plain"]
                        txt_val = "".join(txt) if isinstance(txt, list) else str(txt)
                        outputs_parsed.append({"type": "text", "content": txt_val})
                        cell_text_outputs.append(txt_val)
                elif out_type == "error":
                    tb = out.get("traceback", [])
                    err_msg = f"{out.get('ename', 'Error')}: {out.get('evalue', '')}"
                    outputs_parsed.append({"type": "error", "content": err_msg, "traceback": "\n".join(tb)})
                    cell_text_outputs.append(err_msg)

            if cell_text_outputs:
                saved_outputs.append({
                    "cell_index": idx + 1,
                    "output": "".join(cell_text_outputs).strip(),
                })

        cells_out.append({
            "index": idx + 1,
            "cell_type": cell_type,
            "source": source_text,
            "execution_count": cell.get("execution_count"),
            "outputs": outputs_parsed,
        })

    combined_code = "\n\n".join(code_blocks)
    analysis = analyze_python_source(combined_code, filename)

    return {
        "cells": cells_out,
        "code_cells_count": len(code_blocks),
        "markdown_cells": markdown_cells,
        "saved_outputs": saved_outputs,
        "combined_code": combined_code,
        "extracted_code": combined_code,
        "analysis": analysis,
    }


def find_python_files(repo_dir: Path) -> List[Path]:
    """ค้นหาไฟล์ .py และ .ipynb ทั้งหมดใน repo และเรียงลำดับไฟล์หลักขึ้นก่อน"""
    py_files: List[Path] = []
    for p in repo_dir.glob("**/*"):
        if not p.is_file():
            continue
        rel = p.relative_to(repo_dir)
        if any(part in IGNORED_DIRS or part.startswith(".") for part in rel.parts):
            continue
        if p.suffix.lower() in (".py", ".ipynb"):
            py_files.append(p)

    def sort_key(p: Path):
        rel = p.relative_to(repo_dir)
        depth = len(rel.parts)
        name_lower = p.name.lower()
        try:
            pref_idx = PREFERRED_ENTRY_NAMES.index(name_lower)
        except ValueError:
            pref_idx = 999
        # ให้ไฟล์ระดับบนสุดและไฟล์ที่มีชื่อมาตรฐาน (เช่น main.py) มาก่อน
        return (depth > 1, pref_idx, depth, name_lower)

    return sorted(py_files, key=sort_key)


def inspect_python_project(repo_dir: Path) -> Dict[str, Any]:
    """
    ตรวจสอบโปรเจกต์ Python / OOP ทั้งโฟลเดอร์:
    คืนรายการไฟล์ .py / .ipynb พร้อมผลวิเคราะห์ AST และไฟล์ประกอบสำหรับการรัน
    """
    py_paths = find_python_files(repo_dir)
    if not py_paths:
        return {
            "has_python": False,
            "total_python_files": 0,
            "entry_file": None,
            "files": [],
            "support_files": {},
            "oop_summary": {
                "total_files": 0,
                "total_classes": 0,
                "total_methods": 0,
                "total_functions": 0,
                "total_syntax_errors": 0,
                "has_inheritance": False,
                "classes_overview": [],
                "classes": [],
                "syntax_errors": [],
            },
        }

    files_info = []
    support_files: Dict[str, str] = {}
    total_classes = 0
    total_methods = 0
    total_functions = 0
    total_syntax_errors = 0
    has_inheritance = False
    classes_overview = []
    classes_full = []
    syntax_errors = []

    # รวบรวมไฟล์ประกอบขนาดเล็ก (.py, .txt, .csv, .json) เพื่อให้ import ข้ามไฟล์และอ่านไฟล์ข้อมูลได้
    for p in repo_dir.glob("**/*"):
        if not p.is_file():
            continue
        rel = p.relative_to(repo_dir)
        if any(part in IGNORED_DIRS or part.startswith(".") for part in rel.parts):
            continue
        if p.suffix.lower() in SUPPORT_TEXT_EXTENSIONS and p.stat().st_size <= 250 * 1024:
            rel_str = str(rel).replace("\\", "/")
            try:
                support_files[rel_str] = _read_text_with_thai_fallback(p)
            except Exception:
                pass

    for p in py_paths:
        rel_str = str(p.relative_to(repo_dir)).replace("\\", "/")
        ext = p.suffix.lower().lstrip(".")
        raw_text = _read_text_with_thai_fallback(p)

        if ext == "ipynb":
            nb_parsed = parse_ipynb_content(raw_text, rel_str)
            analysis = nb_parsed["analysis"]
            runnable_code = nb_parsed["combined_code"]
            notebook_cells = nb_parsed["cells"]
            notebook_info = nb_parsed
            support_files[rel_str] = runnable_code
        else:
            analysis = analyze_python_source(raw_text, rel_str)
            runnable_code = raw_text
            notebook_cells = None
            notebook_info = None

        if not analysis["valid_syntax"]:
            total_syntax_errors += 1
            if analysis["syntax_error"]:
                syntax_errors.append({
                    "file": rel_str,
                    **analysis["syntax_error"],
                })

        for cls in analysis["classes"]:
            total_classes += 1
            total_methods += len(cls["methods"])
            if cls["bases"]:
                has_inheritance = True
            classes_overview.append({
                "file": rel_str,
                "name": cls["name"],
                "lineno": cls["lineno"],
                "bases": cls["bases"],
                "attributes": cls["attributes"],
                "methods": [m["name"] for m in cls["methods"]],
            })
            classes_full.append({
                "file": rel_str,
                **cls,
            })

        total_functions += len(analysis["functions"])

        files_info.append({
            "path": rel_str,
            "name": p.name,
            "extension": ext,
            "is_notebook": ext == "ipynb",
            "content": runnable_code,
            "raw_content": raw_text if ext == "ipynb" else None,
            "analysis": analysis,
            "notebook_cells": notebook_cells,
            "notebook_info": notebook_info,
        })

    return {
        "has_python": True,
        "total_python_files": len(files_info),
        "entry_file": files_info[0]["path"] if files_info else None,
        "files": files_info,
        "support_files": support_files,
        "oop_summary": {
            "total_files": len(files_info),
            "total_classes": total_classes,
            "total_methods": total_methods,
            "total_functions": total_functions,
            "total_syntax_errors": total_syntax_errors,
            "has_inheritance": has_inheritance,
            "classes_overview": classes_overview,
            "classes": classes_full,
            "syntax_errors": syntax_errors,
        },
    }
