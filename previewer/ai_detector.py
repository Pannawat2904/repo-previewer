"""
โมดูลวิเคราะห์โอกาสที่โค้ดของนักเรียนถูกสร้างหรือคัดลอกมาจาก AI (ChatGPT, Claude, Gemini, Copilot)
โดยใช้การวิเคราะห์หลายมิติ (Multi-Signal Heuristic & AST Analysis):
1. รูปแบบคอมเมนต์และ Docstring สไตล์ AI (Step-by-step textbook comments, formal docstrings)
2. การใช้ไวยากรณ์/ฟีเจอร์ขั้นสูงเกินระดับพื้นฐาน (Type hints, decorators, advanced boilerplate)
3. ลายเซ็นข้อมูลจำลองและโครงสร้างโค้ดแบบ AI Template (AI placeholder names, separator lines, PEP8 perfection, zero commented-out debug code)
4. การสร้างคำถามแนะนำสำหรับครูเพื่อทดสอบความเข้าใจของนักเรียน (Auto-generated Viva Questions จากโค้ดจริงของนักเรียน)
"""

import ast
import re
from pathlib import Path
from typing import Any, Dict, List, Tuple

IGNORED_DIRS = {
    ".git", ".github", ".vscode", ".idea", "__pycache__",
    ".venv", "venv", "env", "node_modules", ".pytest_cache",
}

CODE_EXTENSIONS = {".py", ".ipynb", ".html", ".htm", ".css", ".js"}

# คำหรือวลีคอมเมนต์ที่เป็นเอกลักษณ์ของ LLM เวลาสร้างโค้ดตัวอย่างให้นักเรียน
AI_COMMENT_PATTERNS = [
    (r"#\s*(step\s*\d+|ขั้นตอนที่\s*\d+)", "คอมเมนต์แบ่งขั้นตอนแบบตำรา (# Step 1 / ขั้นตอนที่ 1)"),
    (r"#\s*(example\s*usage|ตัวอย่างการใช้งาน|การนำไปใช้งาน|ทดสอบการใช้งาน)", "คอมเมนต์หัวข้อ 'ตัวอย่างการใช้งาน / Example usage' ท้ายโค้ดซึ่งเป็นแพทเทิร์นมาตรฐานของ AI"),
    (r"#\s*(define\s+the|create\s+a|initialize|instantiate|base\s+class|derived\s+class|child\s+class|parent\s+class)", "คอมเมนต์อธิบายไวยากรณ์ภาษาอังกฤษเชิงวิชาการสไตล์ ChatGPT/Claude"),
    (r"#\s*(กำหนดค่าเริ่มต้น|สร้างคลาส|สืบทอดจากคลาส|สร้างอ็อบเจกต์|เมธอดสำหรับ|ฟังก์ชันสำหรับ)", "คอมเมนต์ภาษาไทยเชิงตำราอธิบายทุกคลาส/เมธอดแบบที่ AI ชอบสร้าง"),
    (r"#\s*[-=]{15,}", "เส้นคั่นคอมเมนต์ยาว (# -------- หรือ # ========) แบ่งส่วนโค้ดแบบแม่พิมพ์ AI"),
    (r"//\s*(step\s*\d+|example\s*usage|helper\s*function|event\s*listener|initialize)", "คอมเมนต์ JavaScript อธิบายโครงสร้างแบบ AI Template"),
    (r"<!--\s*(hero\s*section|navigation|navbar|footer\s*section|main\s*content|about\s*section|contact\s*section|features\s*section)\s*-->", "คอมเมนต์แบ่งบล็อก HTML มาตรฐานที่ AI สร้างอัตโนมัติ (เช่น <!-- Hero Section -->)"),
    (r"/\*\s*[-=*]{8,}.*?[-=*]{8,}\s*\*/", "คอมเมนต์หัวข้อ CSS แบบมีเส้นคั่นที่ AI นิยมเจนเนอเรต"),
]

# ชื่อข้อมูลจำลอง (Placeholders) ที่ AI มักใช้ในโค้ดตัวอย่าง
AI_PLACEHOLDER_PATTERNS = [
    (r"\b(John\s+Doe|Jane\s+Doe|Jane\s+Smith|Alice|Bob\s+Smith)\b", "พบชื่อสมมติมาตรฐานของ AI (เช่น John Doe / Jane Doe / Alice)"),
    (r"\b(example\.com|your\.email@|user@example\.com|123-456-7890)\b", "พบอีเมลหรือเบอร์โทรสมมติมาตรฐานของ AI (example.com / 123-456-7890)"),
    (r"Lorem\s+ipsum\s+dolor\s+sit\s+amet", "พบข้อความจำลอง Lorem ipsum ที่มักมาจากเทมเพลตหรือ AI"),
]


def _read_text_safe(file_path: Path) -> str:
    raw = file_path.read_bytes()
    for enc in ("utf-8", "utf-8-sig", "cp874", "tis-620", "latin1"):
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            continue
    return raw.decode("utf-8", errors="replace")


def _extract_ipynb_code(raw_json_str: str) -> str:
    import json
    try:
        nb = json.loads(raw_json_str)
        blocks = []
        for cell in nb.get("cells", []):
            if cell.get("cell_type") == "code":
                src = cell.get("source", [])
                blocks.append("".join(src) if isinstance(src, list) else str(src))
        return "\n\n".join(blocks)
    except Exception:
        return ""


def _analyze_python_ai_signals(code: str, rel_path: str) -> Tuple[List[Dict[str, Any]], Dict[str, int], List[str], List[str]]:
    """
    วิเคราะห์สัญญาณการใช้ AI จากโค้ด Python ทั้งระดับข้อความและ AST
    คืนค่า: (signals_list, category_points, viva_questions, normalized_tokens)
    """
    signals: List[Dict[str, Any]] = []
    points = {
        "comment_style": 0,
        "advanced_syntax": 0,
        "ai_boilerplate": 0,
    }
    viva_questions: List[str] = []
    tokens: List[str] = []

    lines = code.splitlines()
    non_empty_lines = [ln for ln in lines if ln.strip()]
    if not non_empty_lines:
        return signals, points, viva_questions, tokens

    comment_lines = [ln.strip() for ln in non_empty_lines if ln.strip().startswith("#")]
    comment_ratio = len(comment_lines) / max(len(non_empty_lines), 1)

    # ตรวจหาว่ามีโค้ดที่ถูกคอมเมนต์ปิดไว้ระหว่างลองผิดลองถูกหรือไม่ (เช่น # print(...) หรือ # x = ...)
    commented_out_code_count = 0
    for cl in comment_lines:
        body = cl.lstrip("#").strip()
        if re.match(r"^(print\s*\(|for\s+|if\s+|while\s+|def\s+|class\s+|[a-zA-Z_]\w*\s*=[^=])", body):
            commented_out_code_count += 1

    # 1. ตรวจแพทเทิร์นคอมเมนต์สไตล์ AI
    for pattern, desc in AI_COMMENT_PATTERNS:
        for idx, ln in enumerate(lines, start=1):
            if re.search(pattern, ln, flags=re.IGNORECASE):
                points["comment_style"] += 14
                signals.append({
                    "file": rel_path,
                    "lineno": idx,
                    "category": "comment_style",
                    "title": desc,
                    "snippet": ln.strip()[:120],
                    "weight": "medium",
                })
                break

    # สัดส่วนคอมเมนต์อธิบายสูงและไม่มีร่องรอยการคอมเมนต์โค้ดทิ้งไว้เลย
    if len(non_empty_lines) >= 20 and comment_ratio >= 0.22 and commented_out_code_count == 0:
        points["comment_style"] += 15
        signals.append({
            "file": rel_path,
            "lineno": 1,
            "category": "comment_style",
            "title": f"มีคอมเมนต์อธิบายหนาแน่น ({int(comment_ratio * 100)}% ของบรรทัดทั้งหมด) และไม่มีร่องรอยโค้ดทดลองที่ถูกคอมเมนต์ปิดไว้เลย",
            "snippet": f"คอมเมนต์ {len(comment_lines)} บรรทัด จากโค้ด {len(non_empty_lines)} บรรทัด",
            "weight": "medium",
        })

    # 2. ตรวจเส้นคั่นแสดงผล เช่น print("-" * 40) หรือ print("=" * 50) ที่ AI ชอบใส่
    for idx, ln in enumerate(lines, start=1):
        if re.search(r"print\s*\(\s*['\"][-=*]{1,3}['\"]\s*\*\s*\d+\s*\)", ln):
            points["ai_boilerplate"] += 12
            signals.append({
                "file": rel_path,
                "lineno": idx,
                "category": "ai_boilerplate",
                "title": "ใช้คำสั่งพิมพ์เส้นคั่นแพทเทิร์นเดียวกับ AI เช่น print('-' * 40)",
                "snippet": ln.strip()[:120],
                "weight": "low",
            })
            break

    # ตรวจชื่อสมมติมาตรฐานของ AI
    for pattern, desc in AI_PLACEHOLDER_PATTERNS:
        for idx, ln in enumerate(lines, start=1):
            if re.search(pattern, ln, flags=re.IGNORECASE):
                points["ai_boilerplate"] += 15
                signals.append({
                    "file": rel_path,
                    "lineno": idx,
                    "category": "ai_boilerplate",
                    "title": desc,
                    "snippet": ln.strip()[:120],
                    "weight": "medium",
                })
                break

    # 3. วิเคราะห์เชิงลึกด้วย AST (Docstrings, Type Hints, Decorators, Main Guard, Classes)
    try:
        tree = ast.parse(code, filename=rel_path)
    except Exception:
        return signals, points, viva_questions, tokens

    docstring_count = 0
    type_hint_count = 0
    decorator_names: List[Tuple[str, int]] = []
    has_main_guard = False
    main_guard_line = 1

    for node in ast.walk(tree):
        tokens.append(type(node).__name__)

        if isinstance(node, (ast.ClassDef, ast.FunctionDef, ast.AsyncFunctionDef)):
            doc = ast.get_docstring(node)
            if doc:
                docstring_count += 1
                if any(k in doc for k in ("Args:", "Returns:", "Parameters:", "Attributes:", "Raises:")):
                    points["comment_style"] += 22
                    signals.append({
                        "file": rel_path,
                        "lineno": node.lineno,
                        "category": "comment_style",
                        "title": f"พบ Docstring มาตรฐานองค์กร (Args/Returns/Attributes) ใน '{node.name}' ซึ่ง AI มักสร้างให้อัตโนมัติ",
                        "snippet": doc.splitlines()[0][:120],
                        "weight": "high",
                    })

        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            if node.returns is not None:
                type_hint_count += 1
            for arg in node.args.args:
                if arg.annotation is not None:
                    type_hint_count += 1
            for dec in node.decorator_list:
                dec_name = getattr(dec, "id", getattr(dec, "attr", "decorator"))
                decorator_names.append((str(dec_name), node.lineno))

        elif isinstance(node, ast.ClassDef):
            for dec in node.decorator_list:
                dec_name = getattr(dec, "id", getattr(dec, "attr", "decorator"))
                decorator_names.append((str(dec_name), node.lineno))

            # สร้างคำถามเช็คความเข้าใจ (Viva Questions) จากคลาสของนักเรียน
            bases = [getattr(b, "id", getattr(b, "attr", "")) for b in node.bases]
            bases = [b for b in bases if b]
            if bases:
                viva_questions.append(
                    f"ในไฟล์ {rel_path} (บรรทัด {node.lineno}): คลาส `{node.name}` สืบทอดมาจาก `{', '.join(bases)}` ช่วยอธิบายว่าคลาสลูกได้แอตทริบิวต์หรือเมธอดใดมาบ้าง และ `super()` ทำงานอย่างไร?"
                )
            methods = [n for n in node.body if isinstance(n, ast.FunctionDef)]
            for m in methods[:2]:
                if m.name == "__init__":
                    viva_questions.append(
                        f"ในไฟล์ {rel_path} (บรรทัด {m.lineno}): พารามิเตอร์ที่รับเข้ามาใน `__init__` ของคลาส `{node.name}` ถูกนำไปเก็บใน `self` อย่างไร ถ้าไม่ใส่คำว่า `self.` จะเกิดอะไรขึ้น?"
                    )
                else:
                    viva_questions.append(
                        f"ในไฟล์ {rel_path} (บรรทัด {m.lineno}): ช่วยอธิบายลำดับการทำงานของเมธอด `{m.name}()` ในคลาส `{node.name}` ว่าใช้ข้อมูลจากตัวแปรใดและคืนค่าอะไร?"
                    )

        elif isinstance(node, ast.AnnAssign):
            type_hint_count += 1

        elif isinstance(node, ast.If):
            if hasattr(ast, "unparse"):
                try:
                    cond_str = ast.unparse(node.test)
                    if "__name__" in cond_str and "__main__" in cond_str:
                        has_main_guard = True
                        main_guard_line = node.lineno
                except Exception:
                    pass

        elif isinstance(node, (ast.ListComp, ast.DictComp, ast.Lambda)):
            viva_questions.append(
                f"ในไฟล์ {rel_path} (บรรทัด {getattr(node, 'lineno', 1)}): มีการใช้ไวยากรณ์แบบย่อ ({type(node).__name__}) ช่วยเขียนแยกออกมาเป็นลูป `for` หรือฟังก์ชันปกติให้ดูได้ไหม?"
            )

    if docstring_count >= 2:
        points["comment_style"] += 18
        signals.append({
            "file": rel_path,
            "lineno": 1,
            "category": "comment_style",
            "title": f"มีการเขียน Docstring (\"\"\"...\"\"\") กำกับคลาสและฟังก์ชันถึง {docstring_count} จุด",
            "snippet": f"พบ Docstring {docstring_count} จุดในไฟล์ {rel_path}",
            "weight": "medium",
        })

    if type_hint_count >= 2:
        points["advanced_syntax"] += 24
        signals.append({
            "file": rel_path,
            "lineno": 1,
            "category": "advanced_syntax",
            "title": f"มีการใช้ Type Annotations / Type Hints (เช่น name: str, -> None) จำนวน {type_hint_count} จุด",
            "snippet": "มักพบในโค้ดที่เจนเนอเรตจาก ChatGPT / Claude / Copilot",
            "weight": "high",
        })
        viva_questions.append(
            f"ในไฟล์ {rel_path}: มีการระบุชนิดข้อมูล (Type Hints เช่น `: str`, `: float`, `-> None`) ช่วยอธิบายว่าเครื่องหมายเหล่านี้มีผลต่อการทำงานของ Python อย่างไร?"
        )

    if decorator_names:
        dec_list_str = ", ".join(f"@{d[0]}" for d in decorator_names[:4])
        points["advanced_syntax"] += 20
        signals.append({
            "file": rel_path,
            "lineno": decorator_names[0][1],
            "category": "advanced_syntax",
            "title": f"มีการใช้ Decorator ขั้นสูง ({dec_list_str})",
            "snippet": f"พบ {dec_list_str} ที่บรรทัด {decorator_names[0][1]}",
            "weight": "high",
        })
        viva_questions.append(
            f"ในไฟล์ {rel_path} (บรรทัด {decorator_names[0][1]}): ทำไมถึงเลือกใช้ `{dec_list_str}` แทนการเขียนเมธอดปกติ?"
        )

    if has_main_guard:
        points["ai_boilerplate"] += 14
        signals.append({
            "file": rel_path,
            "lineno": main_guard_line,
            "category": "ai_boilerplate",
            "title": "มีบล็อก if __name__ == '__main__': แยกส่วนทดสอบโปรแกรมตามมาตรฐานสคริปต์ของ AI",
            "snippet": "if __name__ == '__main__':",
            "weight": "medium",
        })
        viva_questions.append(
            f"ในไฟล์ {rel_path} (บรรทัด {main_guard_line}): เงื่อนไข `if __name__ == '__main__':` มีหน้าที่อะไร และตัวแปร `__name__` คืออะไร?"
        )

    return signals, points, viva_questions, tokens


def _analyze_web_ai_signals(content: str, rel_path: str, ext: str) -> Tuple[List[Dict[str, Any]], Dict[str, int], List[str], List[str]]:
    """วิเคราะห์สัญญาณการใช้ AI สำหรับไฟล์เว็บ (HTML, CSS, JS)"""
    signals: List[Dict[str, Any]] = []
    points = {
        "comment_style": 0,
        "advanced_syntax": 0,
        "ai_boilerplate": 0,
    }
    viva_questions: List[str] = []
    lines = content.splitlines()

    for pattern, desc in AI_COMMENT_PATTERNS + AI_PLACEHOLDER_PATTERNS:
        for idx, ln in enumerate(lines, start=1):
            if re.search(pattern, ln, flags=re.IGNORECASE):
                cat = "comment_style" if "คอมเมนต์" in desc else "ai_boilerplate"
                points[cat] += 15
                signals.append({
                    "file": rel_path,
                    "lineno": idx,
                    "category": cat,
                    "title": desc,
                    "snippet": ln.strip()[:120],
                    "weight": "medium",
                })
                break

    if ext == "css":
        if ":root" in content and "--" in content:
            points["advanced_syntax"] += 14
            signals.append({
                "file": rel_path,
                "lineno": 1,
                "category": "advanced_syntax",
                "title": "ใช้ระบบตัวแปร CSS Custom Properties (:root { --primary-color: ... }) อย่างเป็นระบบ",
                "snippet": ":root { --... }",
                "weight": "low",
            })
            viva_questions.append(
                f"ในไฟล์ {rel_path}: ช่วยอธิบายการทำงานของตัวแปรใน `:root` และการเรียกใช้งานด้วยฟังก์ชัน `var(...)` ว่าทำงานอย่างไร?"
            )
        if "cubic-bezier(" in content or "backdrop-filter:" in content or "clamp(" in content:
            points["advanced_syntax"] += 12
            signals.append({
                "file": rel_path,
                "lineno": 1,
                "category": "advanced_syntax",
                "title": "ใช้ฟังก์ชัน CSS ขั้นสูง (เช่น clamp(), cubic-bezier(), backdrop-filter)",
                "snippet": "พบฟังก์ชัน CSS ขั้นสูงในไฟล์สไตล์ชีต",
                "weight": "low",
            })

    if ext == "js":
        if "IntersectionObserver" in content or "requestAnimationFrame" in content or "async function" in content:
            points["advanced_syntax"] += 15
            signals.append({
                "file": rel_path,
                "lineno": 1,
                "category": "advanced_syntax",
                "title": "ใช้ Web API หรือโครงสร้าง JavaScript ขั้นสูง (IntersectionObserver / async-await)",
                "snippet": f"ตรวจพบในไฟล์ {rel_path}",
                "weight": "medium",
            })
            viva_questions.append(
                f"ในไฟล์ {rel_path}: ช่วยอธิบายขั้นตอนการทำงานของโค้ด JavaScript ในไฟล์นี้ว่าผูก Event กับ HTML อย่างไร?"
            )

    # สร้าง token จากคำสำคัญเพื่อเปรียบเทียบความคล้ายคลึงระหว่างนักเรียน
    words = re.findall(r"[a-zA-Z_][a-zA-Z0-9_-]{2,}", content.lower())
    return signals, points, viva_questions, words[:400]


def analyze_repository_ai_usage(repo_dir: Path) -> Dict[str, Any]:
    """
    วิเคราะห์โปรเจกต์ของนักเรียนทั้งโฟลเดอร์เพื่อประเมินโอกาสที่โค้ดมาจาก AI
    พร้อมหลักฐานระดับบรรทัดและคำถามแนะนำสำหรับครู
    """
    all_signals: List[Dict[str, Any]] = []
    total_points = {
        "comment_style": 0,
        "advanced_syntax": 0,
        "ai_boilerplate": 0,
    }
    all_viva_questions: List[str] = []
    fingerprint_tokens: List[str] = []
    analyzed_files_count = 0

    for p in sorted(repo_dir.glob("**/*")):
        if not p.is_file():
            continue
        rel = p.relative_to(repo_dir)
        if any(part in IGNORED_DIRS or part.startswith(".") for part in rel.parts):
            continue
        ext = p.suffix.lower()
        if ext not in CODE_EXTENSIONS:
            continue
        if p.stat().st_size > 500 * 1024:
            continue

        rel_str = str(rel).replace("\\", "/")
        raw_text = _read_text_safe(p)
        analyzed_files_count += 1

        if ext in (".py", ".ipynb"):
            code_to_check = _extract_ipynb_code(raw_text) if ext == ".ipynb" else raw_text
            sigs, pts, vivas, toks = _analyze_python_ai_signals(code_to_check, rel_str)
        else:
            sigs, pts, vivas, toks = _analyze_web_ai_signals(raw_text, rel_str, ext.lstrip("."))

        all_signals.extend(sigs)
        for k in total_points:
            total_points[k] += pts.get(k, 0)
        for q in vivas:
            if q not in all_viva_questions:
                all_viva_questions.append(q)
        fingerprint_tokens.extend(toks)

    # จำกัดเพดานคะแนนแต่ละหมวดเพื่อคำนวณเปอร์เซ็นต์รวม (0 - 100%)
    c_comment = min(total_points["comment_style"], 40)
    c_syntax = min(total_points["advanced_syntax"], 35)
    c_boiler = min(total_points["ai_boilerplate"], 25)
    overall_score = min(100, c_comment + c_syntax + c_boiler)

    if overall_score >= 65:
        risk_level = "high"
        risk_label = "โอกาสใช้ AI สูง"
        summary_text = "พบรูปแบบการเขียนคอมเมนต์ โครงสร้างโค้ด หรือไวยากรณ์ขั้นสูงที่ตรงกับแพทเทิร์นของ AI (ChatGPT/Claude/Copilot) หลายจุด แนะนำให้ใช้คำถามด้านล่างทดสอบความเข้าใจของนักเรียน"
    elif overall_score >= 35:
        risk_level = "medium"
        risk_label = "โอกาสใช้ AI ปานกลาง"
        summary_text = "พบบางส่วนของโค้ดหรือคอมเมนต์ที่มีโครงสร้างคล้ายโค้ดตัวอย่างจาก AI นักเรียนอาจใช้ AI ช่วยไกด์หรือปรับแต่งต่อเองบางส่วน"
    else:
        risk_level = "low"
        risk_label = "โอกาสใช้ AI ต่ำ (เขียนเองเป็นหลัก)"
        summary_text = "โครงสร้างโค้ดและสไตล์การเขียนมีลักษณะเป็นธรรมชาติ ไม่พบแพทเทิร์นสำเร็จรูปของ AI ที่ชัดเจน"

    if not all_viva_questions and analyzed_files_count > 0:
        all_viva_questions.append("ช่วยอธิบายลำดับการทำงานตั้งแต่ต้นจนจบของโปรแกรมนี้ และจุดที่คิดว่ายากที่สุดตอนเขียนด้วยตัวเอง")

    return {
        "ai_score": overall_score,
        "risk_level": risk_level,
        "risk_label": risk_label,
        "summary": summary_text,
        "analyzed_files_count": analyzed_files_count,
        "breakdown": {
            "comment_style": round((c_comment / 40) * 100),
            "advanced_syntax": round((c_syntax / 35) * 100),
            "ai_boilerplate": round((c_boiler / 25) * 100),
        },
        "signals": all_signals[:15],
        "viva_questions": all_viva_questions[:5],
        "fingerprint": fingerprint_tokens[:250],
    }
