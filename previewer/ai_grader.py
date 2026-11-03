"""
โมดูลสำหรับวิเคราะห์และตรวจการบ้านวิชาการเขียนโปรแกรมเชิงวัตถุเบื้องต้น (Python OOP)
ตามโจทย์และเกณฑ์ที่อาจารย์กำหนด (Assignment Rubric & AI Auto-Grader)
รองรับทั้ง:
1. การตรวจเชิงลึกด้วย Gemini API (LLM) ให้คะแนนและข้อเสนอแนะภาษาไทย
2. การตรวจเชิงโครงสร้างด้วย AST Heuristics (Fallback เมื่อไม่มี API Key หรือออฟไลน์)
"""

import ast
import json
import logging
import os
import re
from typing import Any, Dict, List, Optional
import httpx

from previewer.storage import get_assignment, load_config, save_config

logger = logging.getLogger(__name__)

GEMINI_MODELS = [
    "gemini-2.5-flash",
    "gemini-1.5-flash",
    "gemini-2.0-flash",
]


def resolve_gemini_api_key(client_key: Optional[str] = None) -> str:
    """ค้นหา Gemini API Key จากพารามิเตอร์, ตัวแปรแวดล้อม หรือไฟล์คอนฟิก"""
    if client_key and client_key.strip():
        return client_key.strip()

    env_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if env_key:
        return env_key

    config = load_config()
    cfg_key = config.get("gemini_api_key", "").strip()
    if cfg_key:
        return cfg_key

    return ""


def _extract_ast_facts(code: str) -> Dict[str, Any]:
    """สกัดข้อเท็จจริงของโค้ดด้วย AST สำหรับส่งให้ AI หรือใช้ตรวจ Fallback"""
    facts = {
        "classes": [],
        "instantiations": [],
        "method_calls": [],
        "syntax_error": None,
        "valid_syntax": True,
    }
    try:
        tree = ast.parse(code)
    except SyntaxError as se:
        facts["valid_syntax"] = False
        facts["syntax_error"] = f"บรรทัดที่ {se.lineno}: {se.msg}"
        return facts
    except Exception as e:
        facts["valid_syntax"] = False
        facts["syntax_error"] = str(e)
        return facts

    for node in tree.body:
        if isinstance(node, ast.ClassDef):
            methods = []
            attributes = []
            for item in node.body:
                if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    methods.append(item.name)
                    for sub in ast.walk(item):
                        if isinstance(sub, (ast.Assign, ast.AnnAssign)):
                            targets = sub.targets if isinstance(sub, ast.Assign) else [sub.target]
                            for t in targets:
                                if isinstance(t, ast.Attribute) and isinstance(t.value, ast.Name) and t.value.id == "self":
                                    if t.attr not in attributes:
                                        attributes.append(t.attr)
            facts["classes"].append({
                "name": node.name,
                "bases": [b.id for b in node.bases if isinstance(b, ast.Name)],
                "methods": methods,
                "attributes": attributes,
            })

    for node in ast.walk(tree):
        if isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name):
                facts["instantiations"].append(node.func.id)
            elif isinstance(node.func, ast.Attribute):
                facts["method_calls"].append(node.func.attr)

    return facts


def evaluate_with_ast_fallback(prompt: str, code: str, student_name: str = "", filename: str = "") -> Dict[str, Any]:
    """
    ระบบตรวจความถูกต้องเชิงโครงสร้าง OOP ด้วย AST (ทำงานออฟไลน์ 100% ไม่ต้องใช้ API)
    รองรับการตรวจเกณฑ์มาตรฐานของโจทย์คลาส Product และ OOP ทั่วไป
    """
    facts = _extract_ast_facts(code)
    checklist = []
    score = 0
    max_score = 10

    if not facts["valid_syntax"]:
        return {
            "mode": "ast_heuristic",
            "score": 0,
            "max_score": max_score,
            "status": "failed",
            "status_label": "โค้ดมีข้อผิดพลาด (SyntaxError)",
            "summary": f"ไม่สามารถรันหรือตรวจโครงสร้าง OOP ได้เนื่องจากพบ SyntaxError ในโค้ด: {facts['syntax_error']}",
            "checklist": [
                {
                    "criterion": "ไวยากรณ์ภาษา Python ถูกต้อง ไม่มีข้อผิดพลาด",
                    "passed": False,
                    "evidence": facts["syntax_error"],
                    "feedback": "กรุณาตรวจสอบการสะกดคำ การปิดวงเล็บ และ Indentation",
                }
            ],
            "strengths": [],
            "suggestions": ["แก้ไขข้อผิดพลาด SyntaxError ตามเลขบรรทัดที่แจ้งก่อนรันโปรแกรม"],
            "suggested_teacher_note": f"พบ SyntaxError ({facts['syntax_error']}) โค้ดรันไม่ผ่าน (0/{max_score})",
        }

    # 1. ตรวจการสร้างคลาส (เช่น Product)
    target_class = "Product" if "product" in prompt.lower() else (facts["classes"][0]["name"] if facts["classes"] else "Class")
    found_class = next((c for c in facts["classes"] if c["name"].lower() == target_class.lower()), None)
    if found_class:
        checklist.append({
            "criterion": f"สร้างคลาสชื่อ {target_class}",
            "passed": True,
            "evidence": f"พบการประกาศ class {found_class['name']}",
            "feedback": "ทำถูกต้องตามข้อกำหนด",
        })
        score += 2
    else:
        checklist.append({
            "criterion": f"สร้างคลาสชื่อ {target_class}",
            "passed": False,
            "evidence": f"ไม่พบคลาสชื่อ {target_class} (คลาสที่พบ: {[c['name'] for c in facts['classes']] or 'ไม่มี'})",
            "feedback": f"ควรสร้าง class {target_class}: ตามโจทย์กำหนด",
        })

    # 2. ตรวจสอบ Property / Attributes (name, price, quantity)
    required_attrs = ["name", "price", "quantity"] if "property" in prompt.lower() or "price" in prompt.lower() else []
    if required_attrs and found_class:
        existing_attrs = found_class["attributes"]
        matched_attrs = [a for a in required_attrs if a in existing_attrs]
        if len(matched_attrs) == len(required_attrs):
            checklist.append({
                "criterion": f"กำหนด Property ครบถ้วน ({', '.join(required_attrs)})",
                "passed": True,
                "evidence": f"พบ {', '.join(['self.' + a for a in matched_attrs])} ในคลาส",
                "feedback": "กำหนด Property ครบถ้วน",
            })
            score += 2
        elif matched_attrs:
            checklist.append({
                "criterion": f"กำหนด Property ครบถ้วน ({', '.join(required_attrs)})",
                "passed": False,
                "evidence": f"พบเฉพาะ: {', '.join(['self.' + a for a in matched_attrs])}",
                "feedback": f"ยังขาด Property: {', '.join([a for a in required_attrs if a not in matched_attrs])}",
            })
            score += 1
        else:
            checklist.append({
                "criterion": f"กำหนด Property ครบถ้วน ({', '.join(required_attrs)})",
                "passed": False,
                "evidence": "ไม่พบการกำหนด self.<property> ใน __init__",
                "feedback": f"ควรสร้าง __init__(self, ...) และกำหนด {', '.join(required_attrs)}",
            })
    elif found_class and found_class["attributes"]:
        checklist.append({
            "criterion": "กำหนด Property/Attribute ประจำคลาส",
            "passed": True,
            "evidence": f"พบ {', '.join(['self.' + a for a in found_class['attributes']])}",
            "feedback": "มีการกำหนด Attribute ในคลาส",
        })
        score += 2

    # 3. ตรวจสอบ Method (เช่น show_info)
    target_method = "show_info" if "show_info" in prompt.lower() else "Method"
    if found_class:
        has_method = any(m.lower() == target_method.lower() for m in found_class["methods"])
        if has_method:
            checklist.append({
                "criterion": f"สร้าง Method ชื่อ {target_method}() สำหรับแสดงรายละเอียดสินค้าและคำนวณราคารวม",
                "passed": True,
                "evidence": f"พบ def {target_method}(self) ภายในคลาส",
                "feedback": "สร้าง Method ตามชื่อที่โจทย์กำหนดถูกต้อง",
            })
            score += 2
        else:
            checklist.append({
                "criterion": f"สร้าง Method ชื่อ {target_method}() สำหรับแสดงรายละเอียดสินค้าและคำนวณราคารวม",
                "passed": False,
                "evidence": f"ไม่พบ def {target_method}(self) (Method ที่พบ: {found_class['methods']})",
                "feedback": f"ควรสร้างเมธอด def {target_method}(self): เพื่อแสดงข้อมูลสินค้า",
            })

    # 4. ตรวจการสร้าง Object อย่างน้อย 2 รายการ
    if found_class:
        inst_count = facts["instantiations"].count(found_class["name"])
        if inst_count >= 2:
            checklist.append({
                "criterion": f"สร้าง Object อย่างน้อย 2 รายการ ข้อมูลแตกต่างกัน",
                "passed": True,
                "evidence": f"พบการสร้างอินสแตนซ์ {found_class['name']}(...) จำนวน {inst_count} รายการ",
                "feedback": "สร้างอ็อบเจกต์ครบตามเงื่อนไข",
            })
            score += 2
        elif inst_count == 1:
            checklist.append({
                "criterion": f"สร้าง Object อย่างน้อย 2 รายการ ข้อมูลแตกต่างกัน",
                "passed": False,
                "evidence": f"พบการสร้างอินสแตนซ์ {found_class['name']}(...) เพียง 1 รายการ",
                "feedback": "โจทย์กำหนดให้สร้างอย่างน้อย 2 รายการ (เช่น product1 และ product2)",
            })
            score += 1
        else:
            checklist.append({
                "criterion": f"สร้าง Object อย่างน้อย 2 รายการ ข้อมูลแตกต่างกัน",
                "passed": False,
                "evidence": f"ไม่พบคำสั่งสร้าง Object จากคลาส {found_class['name']}",
                "feedback": f"ควรมีคำสั่งสร้างอ็อบเจกต์ เช่น p1 = {found_class['name']}(...)",
            })

    # 5. ตรวจการเรียกใช้ Method เพื่อแสดงผล
    calls_count = facts["method_calls"].count("show_info")
    if calls_count >= 1:
        checklist.append({
            "criterion": "เรียกใช้ Method เพื่อแสดงข้อมูลของ Object แต่ละรายการ",
            "passed": True,
            "evidence": f"พบคำสั่งเรียกใช้ .show_info() จำนวน {calls_count} ครั้ง",
            "feedback": "เรียกใช้ Method แสดงผลสำเร็จ",
        })
        score += 2
    else:
        checklist.append({
            "criterion": "เรียกใช้ Method เพื่อแสดงข้อมูลของ Object แต่ละรายการ",
            "passed": False,
            "evidence": "ไม่พบคำสั่งเรียก .show_info()",
            "feedback": "ควรเรียกใช้เมธอดเพื่อแสดงข้อมูลของแต่ละอ็อบเจกต์ (เช่น p1.show_info())",
        })

    status = "passed" if score >= 8 else ("partial" if score >= 5 else "failed")
    status_label = "ผ่านเกณฑ์สมบูรณ์" if status == "passed" else ("ผ่านเกณฑ์บางส่วน" if status == "partial" else "ควรปรับปรุง")

    summary = f"ตรวจพบโครงสร้าง OOP พื้นฐานตามโจทย์ (ได้คะแนน {score}/{max_score}) "
    if status == "passed":
        summary += "เขียนคลาส Product, Property, Method และสร้างอ็อบเจกต์ครบถ้วนตามข้อกำหนด"
    else:
        summary += "ยังมีข้อกำหนดบางส่วนที่ยังไม่ครบถ้วน กรุณาดูรายละเอียดในเช็คลิสต์"

    note = f"สร้างคลาส {target_class} และเมธอด {target_method} เรียบร้อย ({score}/{max_score})"

    return {
        "mode": "ast_heuristic",
        "score": score,
        "max_score": max_score,
        "status": status,
        "status_label": status_label,
        "summary": summary,
        "checklist": checklist,
        "strengths": ["จัดโครงสร้างคลาสตามหลักการ OOP" if found_class else "โครงสร้างสคริปต์พื้นฐาน"],
        "suggestions": [
            "สามารถเชื่อมต่อ Gemini API Key เพื่อให้ AI ตรวจความถูกต้องของสูตรคำนวณและข้อความ Output อย่างละเอียด"
        ],
        "suggested_teacher_note": note,
    }


async def evaluate_with_gemini(
    prompt: str,
    code: str,
    api_key: str,
    student_name: str = "",
    filename: str = "",
) -> Dict[str, Any]:
    """
    ตรวจงานนักเรียนด้วย Gemini API (LLM) อย่างละเอียด วิเคราะห์ตรรกะ สูตรคำนวณ และผลลัพธ์
    คืนค่าเป็น JSON รูปแบบมาตรฐาน
    """
    facts = _extract_ast_facts(code)

    system_instruction = (
        "คุณคืออาจารย์ผู้สอนวิชา '21910-2011 การเขียนโปรแกรมเชิงวัตถุเบื้องต้น' (ระดับ ปวช./ปวส.) "
        "หน้าที่ของคุณคือตรวจการบ้านเขียนโปรแกรม Python ของนักเรียน โดยเปรียบเทียบกับ 'โจทย์/ข้อกำหนดของงาน' อย่างละเอียด ยุติธรรม และสร้างสรรค์ "
        "ให้คำติชมด้วยภาษาไทยที่สุภาพ เข้าใจง่าย และให้กำลังใจผู้เรียน "
        "ผลลัพธ์ต้องตอบกลับเป็น JSON เท่านั้น ตามโครงสร้างที่กำหนด"
    )

    user_content = f"""[โจทย์ / ข้อกำหนดของงาน]
{prompt}

[ข้อมูลนักเรียน]
ชื่อ/รหัส: {student_name or 'นักเรียน'}
ไฟล์: {filename or 'work4_product_class.py'}

[ข้อมูลโครงสร้างที่ระบบสกัดได้จาก AST (Abstract Syntax Tree)]
- ไวยากรณ์ถูกต้อง: {facts['valid_syntax']}
- SyntaxError: {facts['syntax_error']}
- คลาสที่พบ: {json.dumps(facts['classes'], ensure_ascii=False)}
- การสร้าง Object: {facts['instantiations']}
- การเรียกใช้ Method: {facts['method_calls']}

[โค้ด Python ของนักเรียน]
```python
{code}
```

กรุณาประเมินผลและตอบกลับเป็น JSON ที่มีโครงสร้างดังนี้เท่านั้น (ไม่มีข้อความอื่นนอกเหนือจาก JSON):
{{
  "score": <คะแนนที่ได้ เช่น 10, ตัวเลขเต็ม 0-10>,
  "max_score": 10,
  "status": "<'passed' หรือ 'partial' หรือ 'failed'>",
  "status_label": "<'ผ่านเกณฑ์สมบูรณ์' หรือ 'ผ่านเกณฑ์บางส่วน' หรือ 'ควรปรับปรุง'>",
  "summary": "<สรุปผลภาพรวมใน 1-2 ประโยค ชัดเจนและกระชับ>",
  "checklist": [
    {{
      "criterion": "<ข้อกำหนดตามโจทย์ เช่น สร้างคลาสชื่อ Product>",
      "passed": <true หรือ false>,
      "evidence": "<หลักฐานที่พบในโค้ด เช่น พบ class Product>",
      "feedback": "<คำอธิบายหรือคำแนะนำสั้นๆ สำหรับข้อนี้>"
    }}
  ],
  "strengths": [
    "<จุดเด่นข้อที่ 1>",
    "<จุดเด่นข้อที่ 2>"
  ],
  "suggestions": [
    "<ข้อเสนอแนะหรือสิ่งที่ควรปรับปรุง>"
  ],
  "suggested_teacher_note": "<ข้อความสั้นๆ กระชับสำหรับครูนำไปวางในช่องให้คะแนน เช่น: ทำตามโจทย์ครบถ้วน สร้างคลาส Product เมธอด show_info คำนวณถูกต้อง (10/10)>"
}}"""

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": f"{system_instruction}\n\n{user_content}"}],
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
            "responseMimeType": "application/json",
        },
    }

    last_error = ""
    async with httpx.AsyncClient(timeout=35.0) as client:
        for model in GEMINI_MODELS:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            try:
                logger.info(f"Calling Gemini API with model: {model}")
                resp = await client.post(url, json=payload, headers={"Content-Type": "application/json"})
                if resp.status_code == 200:
                    data = resp.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts:
                            raw_text = parts[0].get("text", "").strip()
                            clean_json = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw_text, flags=re.MULTILINE).strip()
                            parsed = json.loads(clean_json)
                            parsed["mode"] = "gemini_ai"
                            parsed["model_used"] = model
                            return parsed
                else:
                    last_error = f"{model} returned status {resp.status_code}: {resp.text[:200]}"
                    logger.warning(last_error)
            except Exception as e:
                last_error = f"Error calling {model}: {e}"
                logger.warning(last_error)

    # หากเรียก Gemini ไม่สำเร็จ ให้ Fallback มาใช้ AST
    logger.warning(f"All Gemini models failed. Falling back to AST heuristic. Last error: {last_error}")
    fallback = evaluate_with_ast_fallback(prompt, code, student_name, filename)
    fallback["api_warning"] = f"ไม่สามารถเรียก Gemini API ได้ ({last_error}) ระบบจึงประเมินด้วยโครงสร้าง AST แทนชั่วคราว"
    return fallback


async def grade_student_code(
    prompt: str,
    code: str,
    api_key: Optional[str] = None,
    student_name: str = "",
    filename: str = "",
) -> Dict[str, Any]:
    """จุดเข้าหลักสำหรับการตรวจงานนักเรียน"""
    clean_key = resolve_gemini_api_key(api_key)
    if clean_key:
        return await evaluate_with_gemini(prompt, code, clean_key, student_name, filename)
    return evaluate_with_ast_fallback(prompt, code, student_name, filename)

