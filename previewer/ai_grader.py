"""
โมดูลสำหรับวิเคราะห์และตรวจการบ้านวิชาการเขียนโปรแกรมเชิงวัตถุเบื้องต้น (Python OOP)
ตามโจทย์และเกณฑ์ที่อาจารย์กำหนด (Assignment Rubric & AI Auto-Grader)
รองรับทั้ง:
1. การตรวจเชิงลึกด้วย Gemini API (LLM) ให้คะแนนและข้อเสนอแนะภาษาไทย
2. การตรวจเชิงโครงสร้างด้วย AST Heuristics (Fallback เมื่อไม่มี API Key หรือออฟไลน์)
"""

import ast
import base64
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
    "gemini-2.0-flash",
    "gemini-flash-latest",
]

WORK5_PRACTICAL_EXAM_PROMPT = """งานที่ 5 การสอบปฏิบัติ (ข้อสอบชุด A, B, C, D) · แบบประเมินผลการสอบปฏิบัติ (Rubric Score)
รายวิชา การเขียนโปรแกรมเชิงวัตถุเบื้องต้น · รหัสวิชา 21910-2011 · คะแนนเต็ม 20 คะแนน

ข้อสอบปฏิบัติมี 4 ชุด (ระบบตรวจวิเคราะห์ชุดข้อสอบให้อัตโนมัติ หรือครูสามารถคลิกเลือกชุด A / B / C / D ได้ทันที):

• [ชุด A] โปรแกรมคำนวณราคาสินค้า (คะแนนเต็ม 20 คะแนน)
  1. การรับข้อมูลและกำหนดตัวแปร (3 คะแนน): รับข้อมูลชื่อสินค้า ราคา และจำนวนสินค้าได้ครบถ้วน กำหนดตัวแปรและแปลงชนิดข้อมูลถูกต้อง
  2. การสร้าง Class และ Attributes (3 คะแนน): สร้าง Class Product และกำหนด Attributes ได้ครบทั้ง 3 รายการ (name, price, quantity)
  3. การสร้าง Object และ Method (3 คะแนน): สร้าง Object และเรียกใช้ Method แสดงรายละเอียดสินค้าได้ถูกต้อง
  4. การสร้าง Function และ Parameter (3 คะแนน): สร้าง Function รับ Parameter และส่งค่าผลการประเมินกลับได้ถูกต้อง
  5. การใช้คำสั่งวนซ้ำและเงื่อนไข (4 คะแนน): ใช้ for, range() และ if-else ได้ถูกต้อง วนรับข้อมูลครบ 3 รายการ
  6. การคำนวณและแสดงผลลัพธ์ (4 คะแนน): คำนวณราคาสินค้า สะสมยอดรวม และแสดงผลสรุปได้ถูกต้องครบถ้วน

• [ชุด B] โปรแกรมบันทึกยอดขายประจำวัน (คะแนนเต็ม 20 คะแนน)
  1. การรับข้อมูลและกำหนดตัวแปร (3 คะแนน): รับข้อมูลยอดขายและกำหนดตัวแปรได้ถูกต้องครบถ้วน
  2. การสร้าง Class และ Attributes (3 คะแนน): สร้าง Class DailySales และกำหนด Attributes ได้แก่ day และ sales ได้ถูกต้อง
  3. การสร้าง Object และ Method (3 คะแนน): สร้าง Object และเรียกใช้ Method แสดงข้อมูลยอดขายได้ถูกต้อง
  4. การสร้าง Function และ Parameter (3 คะแนน): สร้าง Function รับยอดขายผ่าน Parameter และส่งผลการประเมินกลับได้ถูกต้อง
  5. การใช้คำสั่งวนซ้ำและเงื่อนไข (4 คะแนน): ใช้ while และ if-else ได้ถูกต้อง วนรับข้อมูลครบ 3 วันและสิ้นสุดการทำงานได้
  6. การสะสมยอดขายและแสดงผลลัพธ์ (4 คะแนน): สะสมยอดขายทั้ง 3 วันและแสดงยอดขายรวมได้ถูกต้อง

• [ชุด C] โปรแกรมตรวจสอบสินค้าคงเหลือ (คะแนนเต็ม 20 คะแนน)
  1. การรับข้อมูลและกำหนดตัวแปร (3 คะแนน): รับข้อมูลชื่อสินค้าและจำนวนสินค้าคงเหลือได้ครบถ้วน กำหนดตัวแปรและชนิดข้อมูลถูกต้อง
  2. การสร้าง Class และ Attributes (3 คะแนน): สร้าง Class StockProduct และกำหนด Attributes ได้แก่ name และ quantity ได้ถูกต้อง
  3. การสร้าง Object และ Method (3 คะแนน): สร้าง Object และเรียกใช้ Method แสดงรายละเอียดสินค้าได้ถูกต้อง
  4. การสร้าง Function และ Parameter (3 คะแนน): สร้าง Function รับจำนวนสินค้าผ่าน Parameter และส่งสถานะสินค้ากลับได้ถูกต้อง
  5. การใช้คำสั่งวนซ้ำและเงื่อนไข (4 คะแนน): ใช้ for, range() และ if-else ได้ถูกต้อง วนตรวจสอบสินค้าครบ 3 รายการ
  6. การตรวจสอบสถานะและแสดงผลลัพธ์ (4 คะแนน): ตรวจสอบสถานะสินค้า สะสมจำนวนสินค้าคงเหลือ และแสดงผลรวมได้ถูกต้อง

• [ชุด D] โปรแกรมคำนวณหน่วยไฟฟ้า (คะแนนเต็ม 20 คะแนน)
  1. การรับข้อมูลและกำหนดตัวแปร (3 คะแนน): รับข้อมูลชื่อบ้านและเลขมิเตอร์ทั้งสองค่าได้ครบถ้วน กำหนดตัวแปรและแปลงชนิดข้อมูลถูกต้อง
  2. การสร้าง Class และ Attributes (3 คะแนน): สร้าง Class ElectricityRecord และกำหนด Attributes ครบทั้ง 3 รายการ
  3. การสร้าง Object และ Method (3 คะแนน): สร้าง Object และเรียกใช้ Method แสดงข้อมูลมิเตอร์ได้ถูกต้อง
  4. การสร้าง Function และ Parameter (3 คะแนน): สร้าง Function รับจำนวนหน่วยไฟฟ้าผ่าน Parameter และส่งผลการประเมินกลับได้ถูกต้อง
  5. การใช้คำสั่งวนซ้ำและเงื่อนไข (4 คะแนน): ใช้ while และ if-else ได้ถูกต้อง วนรับข้อมูลบ้านครบ 3 หลังและสิ้นสุดการทำงานได้
  6. การคำนวณหน่วยไฟฟ้าและแสดงผลลัพธ์ (4 คะแนน): คำนวณหน่วยไฟฟ้าทั้ง 3 หลัง สะสมหน่วยไฟฟ้า และแสดงผลรวมได้ถูกต้อง

เกณฑ์การแปลผลคะแนนรวม (ใช้ร่วมกันทุกชุดข้อสอบ A–D · คะแนนเต็ม 20 คะแนน):
• 17 – 20 คะแนน = ดีมาก
• 13 – 16 คะแนน = ดี
• 9 – 12 คะแนน = พอใช้
• 0 – 8 คะแนน = ปรับปรุง"""

PRACTICAL_EXAM_SETS: Dict[str, Dict[str, Any]] = {
    "A": {
        "set_code": "A",
        "title": "โปรแกรมคำนวณราคาสินค้า",
        "full_title": "ชุด A · โปรแกรมคำนวณราคาสินค้า",
        "class_name": "Product",
        "expected_attrs": ["name", "price", "quantity"],
        "expected_attr_count": 3,
        "loop_type": "for",
        "criteria": [
            {
                "id": 1,
                "title": "1. การรับข้อมูลและกำหนดตัวแปร",
                "max_score": 3,
                "levels": {
                    "3": "ดีมาก (3 คะแนน): รับข้อมูลชื่อสินค้า ราคา และจำนวนสินค้าได้ครบถ้วน กำหนดตัวแปรและแปลงชนิดข้อมูลถูกต้อง",
                    "2": "ดี (2 คะแนน): รับข้อมูลได้ครบ แต่มีข้อผิดพลาดในการกำหนดตัวแปรหรือแปลงชนิดข้อมูลเล็กน้อย",
                    "1": "พอใช้ (1 คะแนน): รับข้อมูลได้บางส่วน และกำหนดตัวแปรได้ไม่ครบถ้วน",
                    "0": "ปรับปรุง (0 คะแนน): ไม่สามารถรับข้อมูลหรือกำหนดตัวแปรได้",
                },
            },
            {
                "id": 2,
                "title": "2. การสร้าง Class และ Attributes",
                "max_score": 3,
                "levels": {
                    "3": "ดีมาก (3 คะแนน): สร้าง Class Product และกำหนด Attributes ได้ครบทั้ง 3 รายการ",
                    "2": "ดี (2 คะแนน): สร้าง Class ได้ แต่กำหนด Attributes ไม่ครบ 1 รายการ",
                    "1": "พอใช้ (1 คะแนน): สร้าง Class ได้ แต่กำหนด Attributes ผิดพลาดมากกว่าหนึ่งรายการ",
                    "0": "ปรับปรุง (0 คะแนน): ไม่สามารถสร้าง Class ได้",
                },
            },
            {
                "id": 3,
                "title": "3. การสร้าง Object และ Method",
                "max_score": 3,
                "levels": {
                    "3": "ดีมาก (3 คะแนน): สร้าง Object และเรียกใช้ Method แสดงรายละเอียดสินค้าได้ถูกต้อง",
                    "2": "ดี (2 คะแนน): สร้าง Object ได้ แต่เรียกใช้ Method ผิดพลาดบางส่วน",
                    "1": "พอใช้ (1 คะแนน): สามารถสร้าง Object หรือ Method ได้บางส่วน แต่ยังไม่สามารถใช้งานได้ถูกต้อง",
                    "0": "ปรับปรุง (0 คะแนน): ไม่สามารถสร้าง Object และ Method ได้",
                },
            },
            {
                "id": 4,
                "title": "4. การสร้าง Function และ Parameter",
                "max_score": 3,
                "levels": {
                    "3": "ดีมาก (3 คะแนน): สร้าง Function รับ Parameter และส่งค่าผลการประเมินกลับได้ถูกต้อง",
                    "2": "ดี (2 คะแนน): สร้าง Function ได้ แต่มีข้อผิดพลาดในการรับ Parameter หรือการส่งค่ากลับ",
                    "1": "พอใช้ (1 คะแนน): สร้าง Function ได้ แต่ยังไม่สามารถตรวจสอบเงื่อนไขได้ถูกต้อง",
                    "0": "ปรับปรุง (0 คะแนน): ไม่สามารถสร้าง Function ได้",
                },
            },
            {
                "id": 5,
                "title": "5. การใช้คำสั่งวนซ้ำและเงื่อนไข",
                "max_score": 4,
                "levels": {
                    "4": "ดีมาก (4 คะแนน): ใช้ for, range() และ if-else ได้ถูกต้อง วนรับข้อมูลครบ 3 รายการ",
                    "3": "ดี (3 คะแนน): ใช้คำสั่งได้ครบ แต่มีข้อผิดพลาดเล็กน้อยในการวนซ้ำหรือเงื่อนไข",
                    "2": "พอใช้ (2 คะแนน): ใช้คำสั่งวนซ้ำหรือเงื่อนไขได้บางส่วน แต่ทำงานไม่ครบตามโจทย์",
                    "1": "ปรับปรุง (1 คะแนน): สามารถใช้คำสั่งได้บางส่วน แต่ไม่สามารถควบคุมการทำงานได้ถูกต้อง",
                    "0": "ไม่ปรากฏหลักฐาน (0 คะแนน): ไม่ปรากฏการใช้คำสั่งวนซ้ำและเงื่อนไข",
                },
            },
            {
                "id": 6,
                "title": "6. การคำนวณและแสดงผลลัพธ์",
                "max_score": 4,
                "levels": {
                    "4": "ดีมาก (4 คะแนน): คำนวณราคาสินค้า สะสมยอดรวม และแสดงผลสรุปได้ถูกต้องครบถ้วน",
                    "3": "ดี (3 คะแนน): คำนวณและแสดงผลได้ แต่มีข้อผิดพลาดเล็กน้อย",
                    "2": "พอใช้ (2 คะแนน): คำนวณหรือสะสมผลรวมได้บางส่วน แต่ผลลัพธ์ยังไม่ครบถ้วน",
                    "1": "ปรับปรุง (1 คะแนน): พยายามคำนวณและแสดงผล แต่ผลลัพธ์ไม่ถูกต้อง",
                    "0": "ไม่ปรากฏหลักฐาน (0 คะแนน): ไม่ปรากฏการคำนวณและแสดงผลลัพธ์",
                },
            },
        ],
    },
    "B": {
        "set_code": "B",
        "title": "โปรแกรมบันทึกยอดขายประจำวัน",
        "full_title": "ชุด B · โปรแกรมบันทึกยอดขายประจำวัน",
        "class_name": "DailySales",
        "expected_attrs": ["day", "sales"],
        "expected_attr_count": 2,
        "loop_type": "while",
        "criteria": [
            {
                "id": 1,
                "title": "1. การรับข้อมูลและกำหนดตัวแปร",
                "max_score": 3,
                "levels": {
                    "3": "ดีมาก (3 คะแนน): รับข้อมูลยอดขายและกำหนดตัวแปรได้ถูกต้องครบถ้วน",
                    "2": "ดี (2 คะแนน): รับข้อมูลได้ แต่มีข้อผิดพลาดในการกำหนดตัวแปรหรือแปลงชนิดข้อมูลเล็กน้อย",
                    "1": "พอใช้ (1 คะแนน): รับข้อมูลได้บางส่วน แต่กำหนดตัวแปรไม่ครบถ้วน",
                    "0": "ปรับปรุง (0 คะแนน): ไม่สามารถรับข้อมูลหรือกำหนดตัวแปรได้",
                },
            },
            {
                "id": 2,
                "title": "2. การสร้าง Class และ Attributes",
                "max_score": 3,
                "levels": {
                    "3": "ดีมาก (3 คะแนน): สร้าง Class DailySales และกำหนด Attributes ได้แก่ day และ sales ได้ถูกต้อง",
                    "2": "ดี (2 คะแนน): สร้าง Class ได้ แต่กำหนด Attributes ไม่ครบ 1 รายการ",
                    "1": "พอใช้ (1 คะแนน): สร้าง Class ได้ แต่กำหนด Attributes ผิดพลาดมากกว่าหนึ่งรายการ",
                    "0": "ปรับปรุง (0 คะแนน): ไม่สามารถสร้าง Class ได้",
                },
            },
            {
                "id": 3,
                "title": "3. การสร้าง Object และ Method",
                "max_score": 3,
                "levels": {
                    "3": "ดีมาก (3 คะแนน): สร้าง Object และเรียกใช้ Method แสดงข้อมูลยอดขายได้ถูกต้อง",
                    "2": "ดี (2 คะแนน): สร้าง Object ได้ แต่เรียกใช้ Method ผิดพลาดบางส่วน",
                    "1": "พอใช้ (1 คะแนน): สามารถสร้าง Object หรือ Method ได้บางส่วน แต่ยังไม่สามารถใช้งานได้ถูกต้อง",
                    "0": "ปรับปรุง (0 คะแนน): ไม่สามารถสร้าง Object และ Method ได้",
                },
            },
            {
                "id": 4,
                "title": "4. การสร้าง Function และ Parameter",
                "max_score": 3,
                "levels": {
                    "3": "ดีมาก (3 คะแนน): สร้าง Function รับยอดขายผ่าน Parameter และส่งผลการประเมินกลับได้ถูกต้อง",
                    "2": "ดี (2 คะแนน): สร้าง Function ได้ แต่มีข้อผิดพลาดในการรับ Parameter หรือส่งค่ากลับ",
                    "1": "พอใช้ (1 คะแนน): สร้าง Function ได้ แต่ยังตรวจสอบยอดขายได้ไม่ถูกต้อง",
                    "0": "ปรับปรุง (0 คะแนน): ไม่สามารถสร้าง Function ได้",
                },
            },
            {
                "id": 5,
                "title": "5. การใช้คำสั่งวนซ้ำและเงื่อนไข",
                "max_score": 4,
                "levels": {
                    "4": "ดีมาก (4 คะแนน): ใช้ while และ if-else ได้ถูกต้อง วนรับข้อมูลครบ 3 วันและสิ้นสุดการทำงานได้",
                    "3": "ดี (3 คะแนน): ใช้คำสั่งได้ แต่มีข้อผิดพลาดเล็กน้อยในการควบคุมการวนซ้ำหรือเงื่อนไข",
                    "2": "พอใช้ (2 คะแนน): ใช้ while หรือ if-else ได้บางส่วน แต่ทำงานไม่ครบตามโจทย์",
                    "1": "ปรับปรุง (1 คะแนน): พยายามใช้คำสั่งวนซ้ำหรือเงื่อนไข แต่ยังไม่สามารถควบคุมการทำงานได้ถูกต้อง",
                    "0": "ไม่ปรากฏหลักฐาน (0 คะแนน): ไม่ปรากฏการใช้คำสั่งวนซ้ำและเงื่อนไข",
                },
            },
            {
                "id": 6,
                "title": "6. การสะสมยอดขายและแสดงผลลัพธ์",
                "max_score": 4,
                "levels": {
                    "4": "ดีมาก (4 คะแนน): สะสมยอดขายทั้ง 3 วันและแสดงยอดขายรวมได้ถูกต้อง",
                    "3": "ดี (3 คะแนน): สะสมยอดขายได้ แต่มีข้อผิดพลาดเล็กน้อยในการคำนวณหรือแสดงผล",
                    "2": "พอใช้ (2 คะแนน): สะสมยอดขายได้บางส่วน แต่ผลรวมไม่ถูกต้องหรือไม่ครบถ้วน",
                    "1": "ปรับปรุง (1 คะแนน): พยายามสะสมหรือแสดงยอดขาย แต่ไม่สามารถหาผลรวมได้ถูกต้อง",
                    "0": "ไม่ปรากฏหลักฐาน (0 คะแนน): ไม่ปรากฏการสะสมยอดขายและแสดงผลลัพธ์",
                },
            },
        ],
    },
    "C": {
        "set_code": "C",
        "title": "โปรแกรมตรวจสอบสินค้าคงเหลือ",
        "full_title": "ชุด C · โปรแกรมตรวจสอบสินค้าคงเหลือ",
        "class_name": "StockProduct",
        "expected_attrs": ["name", "quantity"],
        "expected_attr_count": 2,
        "loop_type": "for",
        "criteria": [
            {
                "id": 1,
                "title": "1. การรับข้อมูลและกำหนดตัวแปร",
                "max_score": 3,
                "levels": {
                    "3": "ดีมาก (3 คะแนน): รับข้อมูลชื่อสินค้าและจำนวนสินค้าคงเหลือได้ครบถ้วน กำหนดตัวแปรและชนิดข้อมูลถูกต้อง",
                    "2": "ดี (2 คะแนน): รับข้อมูลได้ครบ แต่มีข้อผิดพลาดในการกำหนดตัวแปรหรือแปลงชนิดข้อมูลเล็กน้อย",
                    "1": "พอใช้ (1 คะแนน): รับข้อมูลได้บางส่วน แต่กำหนดตัวแปรไม่ครบถ้วน",
                    "0": "ปรับปรุง (0 คะแนน): ไม่สามารถรับข้อมูลหรือกำหนดตัวแปรได้",
                },
            },
            {
                "id": 2,
                "title": "2. การสร้าง Class และ Attributes",
                "max_score": 3,
                "levels": {
                    "3": "ดีมาก (3 คะแนน): สร้าง Class StockProduct และกำหนด Attributes ได้แก่ name และ quantity ได้ถูกต้อง",
                    "2": "ดี (2 คะแนน): สร้าง Class ได้ แต่กำหนด Attributes ไม่ครบ 1 รายการ",
                    "1": "พอใช้ (1 คะแนน): สร้าง Class ได้ แต่กำหนด Attributes ผิดพลาด",
                    "0": "ปรับปรุง (0 คะแนน): ไม่สามารถสร้าง Class ได้",
                },
            },
            {
                "id": 3,
                "title": "3. การสร้าง Object และ Method",
                "max_score": 3,
                "levels": {
                    "3": "ดีมาก (3 คะแนน): สร้าง Object และเรียกใช้ Method แสดงรายละเอียดสินค้าได้ถูกต้อง",
                    "2": "ดี (2 คะแนน): สร้าง Object ได้ แต่เรียกใช้ Method ผิดพลาดบางส่วน",
                    "1": "พอใช้ (1 คะแนน): สามารถสร้าง Object หรือ Method ได้บางส่วน แต่ยังไม่สามารถใช้งานได้ถูกต้อง",
                    "0": "ปรับปรุง (0 คะแนน): ไม่สามารถสร้าง Object และ Method ได้",
                },
            },
            {
                "id": 4,
                "title": "4. การสร้าง Function และ Parameter",
                "max_score": 3,
                "levels": {
                    "3": "ดีมาก (3 คะแนน): สร้าง Function รับจำนวนสินค้าผ่าน Parameter และส่งสถานะสินค้ากลับได้ถูกต้อง",
                    "2": "ดี (2 คะแนน): สร้าง Function ได้ แต่มีข้อผิดพลาดในการรับ Parameter หรือส่งค่ากลับ",
                    "1": "พอใช้ (1 คะแนน): สร้าง Function ได้ แต่ยังตรวจสอบสถานะสินค้าได้ไม่ถูกต้อง",
                    "0": "ปรับปรุง (0 คะแนน): ไม่สามารถสร้าง Function ได้",
                },
            },
            {
                "id": 5,
                "title": "5. การใช้คำสั่งวนซ้ำและเงื่อนไข",
                "max_score": 4,
                "levels": {
                    "4": "ดีมาก (4 คะแนน): ใช้ for, range() และ if-else ได้ถูกต้อง วนตรวจสอบสินค้าครบ 3 รายการ",
                    "3": "ดี (3 คะแนน): ใช้คำสั่งได้ครบ แต่มีข้อผิดพลาดเล็กน้อยในการวนซ้ำหรือเงื่อนไข",
                    "2": "พอใช้ (2 คะแนน): ใช้คำสั่งวนซ้ำหรือเงื่อนไขได้บางส่วน แต่ทำงานไม่ครบตามโจทย์",
                    "1": "ปรับปรุง (1 คะแนน): พยายามใช้คำสั่ง แต่ยังไม่สามารถควบคุมการทำงานได้ถูกต้อง",
                    "0": "ไม่ปรากฏหลักฐาน (0 คะแนน): ไม่ปรากฏการใช้คำสั่งวนซ้ำและเงื่อนไข",
                },
            },
            {
                "id": 6,
                "title": "6. การตรวจสอบสถานะและแสดงผลลัพธ์",
                "max_score": 4,
                "levels": {
                    "4": "ดีมาก (4 คะแนน): ตรวจสอบสถานะสินค้า สะสมจำนวนสินค้าคงเหลือ และแสดงผลรวมได้ถูกต้อง",
                    "3": "ดี (3 คะแนน): ตรวจสอบและสะสมจำนวนสินค้าได้ แต่มีข้อผิดพลาดเล็กน้อย",
                    "2": "พอใช้ (2 คะแนน): ตรวจสอบสถานะหรือสะสมจำนวนสินค้าได้บางส่วน แต่ผลลัพธ์ไม่ครบถ้วน",
                    "1": "ปรับปรุง (1 คะแนน): พยายามตรวจสอบหรือคำนวณ แต่ยังแสดงผลได้ไม่ถูกต้อง",
                    "0": "ไม่ปรากฏหลักฐาน (0 คะแนน): ไม่ปรากฏการตรวจสอบสถานะและแสดงผลลัพธ์",
                },
            },
        ],
    },
    "D": {
        "set_code": "D",
        "title": "โปรแกรมคำนวณหน่วยไฟฟ้า",
        "full_title": "ชุด D · โปรแกรมคำนวณหน่วยไฟฟ้า",
        "class_name": "ElectricityRecord",
        "expected_attrs": ["house_name", "prev_meter", "curr_meter"],
        "expected_attr_count": 3,
        "loop_type": "while",
        "criteria": [
            {
                "id": 1,
                "title": "1. การรับข้อมูลและกำหนดตัวแปร",
                "max_score": 3,
                "levels": {
                    "3": "ดีมาก (3 คะแนน): รับข้อมูลชื่อบ้านและเลขมิเตอร์ทั้งสองค่าได้ครบถ้วน กำหนดตัวแปรและแปลงชนิดข้อมูลถูกต้อง",
                    "2": "ดี (2 คะแนน): รับข้อมูลได้ครบ แต่มีข้อผิดพลาดในการกำหนดตัวแปรหรือแปลงชนิดข้อมูลเล็กน้อย",
                    "1": "พอใช้ (1 คะแนน): รับข้อมูลได้บางส่วน แต่กำหนดตัวแปรไม่ครบถ้วน",
                    "0": "ปรับปรุง (0 คะแนน): ไม่สามารถรับข้อมูลหรือกำหนดตัวแปรได้",
                },
            },
            {
                "id": 2,
                "title": "2. การสร้าง Class และ Attributes",
                "max_score": 3,
                "levels": {
                    "3": "ดีมาก (3 คะแนน): สร้าง Class ElectricityRecord และกำหนด Attributes ครบทั้ง 3 รายการ",
                    "2": "ดี (2 คะแนน): สร้าง Class ได้ แต่กำหนด Attributes ไม่ครบ 1 รายการ",
                    "1": "พอใช้ (1 คะแนน): สร้าง Class ได้ แต่กำหนด Attributes ผิดพลาดมากกว่าหนึ่งรายการ",
                    "0": "ปรับปรุง (0 คะแนน): ไม่สามารถสร้าง Class ได้",
                },
            },
            {
                "id": 3,
                "title": "3. การสร้าง Object และ Method",
                "max_score": 3,
                "levels": {
                    "3": "ดีมาก (3 คะแนน): สร้าง Object และเรียกใช้ Method แสดงข้อมูลมิเตอร์ได้ถูกต้อง",
                    "2": "ดี (2 คะแนน): สร้าง Object ได้ แต่เรียกใช้ Method ผิดพลาดบางส่วน",
                    "1": "พอใช้ (1 คะแนน): สามารถสร้าง Object หรือ Method ได้บางส่วน แต่ยังไม่สามารถใช้งานได้ถูกต้อง",
                    "0": "ปรับปรุง (0 คะแนน): ไม่สามารถสร้าง Object และ Method ได้",
                },
            },
            {
                "id": 4,
                "title": "4. การสร้าง Function และ Parameter",
                "max_score": 3,
                "levels": {
                    "3": "ดีมาก (3 คะแนน): สร้าง Function รับจำนวนหน่วยไฟฟ้าผ่าน Parameter และส่งผลการประเมินกลับได้ถูกต้อง",
                    "2": "ดี (2 คะแนน): สร้าง Function ได้ แต่มีข้อผิดพลาดในการรับ Parameter หรือส่งค่ากลับ",
                    "1": "พอใช้ (1 คะแนน): สร้าง Function ได้ แต่ยังตรวจสอบการใช้ไฟฟ้าได้ไม่ถูกต้อง",
                    "0": "ปรับปรุง (0 คะแนน): ไม่สามารถสร้าง Function ได้",
                },
            },
            {
                "id": 5,
                "title": "5. การใช้คำสั่งวนซ้ำและเงื่อนไข",
                "max_score": 4,
                "levels": {
                    "4": "ดีมาก (4 คะแนน): ใช้ while และ if-else ได้ถูกต้อง วนรับข้อมูลบ้านครบ 3 หลังและสิ้นสุดการทำงานได้",
                    "3": "ดี (3 คะแนน): ใช้คำสั่งได้ แต่มีข้อผิดพลาดเล็กน้อยในการควบคุมการวนซ้ำหรือเงื่อนไข",
                    "2": "พอใช้ (2 คะแนน): ใช้ while หรือ if-else ได้บางส่วน แต่ทำงานไม่ครบตามโจทย์",
                    "1": "ปรับปรุง (1 คะแนน): พยายามใช้คำสั่งวนซ้ำหรือเงื่อนไข แต่ยังไม่สามารถควบคุมการทำงานได้ถูกต้อง",
                    "0": "ไม่ปรากฏหลักฐาน (0 คะแนน): ไม่ปรากฏการใช้คำสั่งวนซ้ำและเงื่อนไข",
                },
            },
            {
                "id": 6,
                "title": "6. การคำนวณหน่วยไฟฟ้าและแสดงผลลัพธ์",
                "max_score": 4,
                "levels": {
                    "4": "ดีมาก (4 คะแนน): คำนวณหน่วยไฟฟ้าทั้ง 3 หลัง สะสมหน่วยไฟฟ้า และแสดงผลรวมได้ถูกต้อง",
                    "3": "ดี (3 คะแนน): คำนวณและสะสมหน่วยไฟฟ้าได้ แต่มีข้อผิดพลาดเล็กน้อย",
                    "2": "พอใช้ (2 คะแนน): คำนวณหรือสะสมหน่วยไฟฟ้าได้บางส่วน แต่ผลลัพธ์ไม่ครบถ้วน",
                    "1": "ปรับปรุง (1 คะแนน): พยายามคำนวณ แต่ผลลัพธ์ยังไม่ถูกต้อง",
                    "0": "ไม่ปรากฏหลักฐาน (0 คะแนน): ไม่ปรากฏการคำนวณหน่วยไฟฟ้าและแสดงผลลัพธ์",
                },
            },
        ],
    },
}


def is_practical_exam_prompt(prompt: str = "", assignment_id: str = "") -> bool:
    """ตรวจสอบว่าเป็นงานสอบปฏิบัติที่มีรูบริค 4 ชุด (ชุด A, B, C, D · 20 คะแนน) หรือไม่"""
    p = (prompt or "").lower()
    aid = (assignment_id or "").lower()
    if aid == "work-5" or "work-5" in aid:
        return True
    signals = ["ชุด a", "ชุด b", "ชุด c", "ชุด d", "สอบปฏิบัติ", "rubric score", "dailysales", "stockproduct", "electricityrecord"]
    matched = sum(1 for s in signals if s in p)
    return matched >= 2


def detect_practical_exam_set(
    code: str,
    filename: str = "",
    student_name: str = "",
    preferred_set: Optional[str] = None,
) -> str:
    """วิเคราะห์ว่าโค้ดของนักเรียนตรงกับข้อสอบชุดใด (A, B, C หรือ D)"""
    if preferred_set and preferred_set.strip().upper() in PRACTICAL_EXAM_SETS:
        return preferred_set.strip().upper()

    combined = f"{filename}\n{student_name}\n{code}".lower()

    # 1. ถ้าระบุชื่อชุดชัดเจนในคอมเมนต์หรือชื่อไฟล์
    explicit = re.search(r"(?:ชุดข้อสอบ|ชุดที่|ข้อสอบชุด|ชุด|set)\s*[:#\-_]?\s*([abcd])\b", combined, re.IGNORECASE)
    if explicit:
        return explicit.group(1).upper()

    scores = {"A": 0, "B": 0, "C": 0, "D": 0}

    # ชุด B: DailySales / ยอดขายประจำวัน
    for kw, weight in [
        ("dailysales", 6), ("daily_sales", 5), ("check_sales", 4),
        ("ยอดขาย", 4), ("sales", 2), ("ประจำวัน", 3), ("จำนวน3วัน", 3), ("3 วัน", 2),
    ]:
        if kw in combined:
            scores["B"] += weight

    # ชุด C: StockProduct / สินค้าคงเหลือ
    for kw, weight in [
        ("stockproduct", 6), ("stock_product", 5), ("check_stock", 4),
        ("คงเหลือ", 4), ("สถานะสินค้า", 4), ("stock", 3), ("คลังสินค้า", 2),
    ]:
        if kw in combined:
            scores["C"] += weight

    # ชุด D: ElectricityRecord / หน่วยไฟฟ้า
    for kw, weight in [
        ("electricityrecord", 6), ("electricity", 5), ("meter", 3),
        ("มิเตอร์", 4), ("หน่วยไฟฟ้า", 5), ("ไฟฟ้า", 3), ("ชื่อบ้าน", 4), ("3 หลัง", 3),
    ]:
        if kw in combined:
            scores["D"] += weight

    # ชุด A: Product / คำนวณราคาสินค้า
    for kw, weight in [
        ("class product", 6), ("ราคาสินค้า", 4), ("total_price", 3),
        ("price", 2), ("ชื่อสินค้า", 2), ("คำนวณราคา", 4),
    ]:
        if kw in combined:
            scores["A"] += weight

    best_set = max(scores, key=lambda k: scores[k])
    return best_set if scores[best_set] > 0 else "A"


def get_practical_exam_quality_level(score: int) -> Dict[str, str]:
    """แปลผลคะแนนรวม 20 คะแนนตามเกณฑ์หน้า 5 (ดีมาก / ดี / พอใช้ / ปรับปรุง)"""
    s = max(0, min(20, int(round(score))))
    if s >= 17:
        return {"level": "ดีมาก", "status": "passed", "status_label": "ดีมาก"}
    if s >= 13:
        return {"level": "ดี", "status": "passed", "status_label": "ดี"}
    if s >= 9:
        return {"level": "พอใช้", "status": "partial", "status_label": "พอใช้"}
    return {"level": "ปรับปรุง", "status": "failed", "status_label": "ปรับปรุง"}


def _criterion_quality_word(score: int, max_score: int) -> str:
    if max_score == 3:
        return {3: "ดีมาก", 2: "ดี", 1: "พอใช้"}.get(score, "ปรับปรุง")
    return {4: "ดีมาก", 3: "ดี", 2: "พอใช้", 1: "ปรับปรุง"}.get(score, "ปรับปรุง")


DEFAULT_SYSTEM_GEMINI_KEY_B64 = "QVEuQWI4Uk42S0lkX3d2ZnQxT001aEJ6VF9lZXJ5dFlwc243TVJyVnhJRVB3UlZtSFNvX2c="


def get_builtin_gemini_api_key() -> str:
    try:
        return base64.b64decode(DEFAULT_SYSTEM_GEMINI_KEY_B64).decode("utf-8").strip()
    except Exception:
        return ""


def resolve_gemini_api_key(client_key: Optional[str] = None) -> str:
    """ค้นหา Gemini API Key จากพารามิเตอร์, ตัวแปรแวดล้อม, ไฟล์คอนฟิก หรือคีย์เริ่มต้นของระบบ"""
    if client_key and client_key.strip():
        return client_key.strip()

    if "GEMINI_API_KEY" in os.environ:
        env_key = os.environ.get("GEMINI_API_KEY", "").strip()
        if env_key:
            return env_key

    config = load_config()
    if "gemini_api_key" in config:
        cfg_key = str(config.get("gemini_api_key") or "").strip()
        return cfg_key

    if "GEMINI_API_KEY" in os.environ:
        return ""

    return get_builtin_gemini_api_key()


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


def parse_prompt_specs(prompt: str) -> Dict[str, Any]:
    """สกัดชื่อคลาส, แอตทริบิวต์, เมธอด และจำนวนอ็อบเจกต์ที่โจทย์ต้องการโดยอัตโนมัติจากข้อความโจทย์ภาษาไทย"""
    specs: Dict[str, Any] = {
        "class_name": None,
        "attributes": [],
        "methods": [],
        "min_objects": 2,
    }
    if not prompt:
        return specs

    # 1. สกัดชื่อคลาส
    m_cls = re.search(r'(?:สร้างคลาสชื่อ|class|คลาสชื่อ|คลาส)\s*[`\'"]?([A-Za-z_]\w*)[`\'"]?', prompt, re.IGNORECASE)
    if m_cls:
        specs["class_name"] = m_cls.group(1)

    # 2. สกัด Attributes / Properties
    m_attr = re.search(r'(?:Property\s*ได้แก่|attribute\s*[:ได้แก่]*|แอตทริบิวต์\s*[:ได้แก่]*|คุณสมบัติ\s*[:ได้แก่]*)\s*([^\n\r]+)', prompt, re.IGNORECASE)
    if m_attr:
        raw_attrs = m_attr.group(1)
        raw_attrs = re.sub(r'[\(\)\[\]`\'"และ,]', ' ', raw_attrs)
        attrs = [w.strip() for w in raw_attrs.split() if re.match(r'^[a-zA-Z_]\w*$', w.strip())]
        specs["attributes"] = attrs

    # 3. สกัด Methods
    m_methods = re.findall(r'(?:Method\s*(?:ชื่อ)?|เมธอด\s*(?:ชื่อ)?|ฟังก์ชันในคลาส\s*)\s*[`\'"]?([A-Za-z_]\w*)\s*(?:\(\))?[`\'"]?', prompt, re.IGNORECASE)
    if m_methods:
        specs["methods"] = list(dict.fromkeys(m_methods))

    # 4. สกัด Min Objects
    m_objs = re.search(r'(?:สร้าง\s*Object|สร้าง\s*วัตถุ|สร้าง\s*อ็อบเจกต์).*?(\d+)', prompt, re.IGNORECASE)
    if m_objs:
        try:
            specs["min_objects"] = int(m_objs.group(1))
        except Exception:
            specs["min_objects"] = 2

    return specs


def evaluate_practical_exam_ast(
    code: str,
    exam_set: str = "A",
    prompt: str = "",
    student_name: str = "",
    filename: str = "",
) -> Dict[str, Any]:
    """
    ตรวจข้อสอบปฏิบัติ 4 ชุด (ชุด A, B, C, D) ตามตาราง Rubric Score 6 รายการ (คะแนนเต็ม 20 คะแนน)
    ให้คะแนนตามหลักฐานที่ปรากฏในโค้ดจริง แม้โค้ดบางบรรทัดจะมี SyntaxError
    """
    set_key = exam_set.upper() if exam_set and exam_set.upper() in PRACTICAL_EXAM_SETS else detect_practical_exam_set(code, filename, student_name)
    spec = PRACTICAL_EXAM_SETS[set_key]
    facts = _extract_ast_facts(code)
    raw = code or ""
    has_syntax_err = not facts["valid_syntax"]

    target_cls_name = spec["class_name"]
    expected_attrs = spec["expected_attrs"]
    expected_attr_count = spec["expected_attr_count"]
    expected_loop = spec["loop_type"]

    # ------------------------------------------------------------------
    # รายการที่ 1: การรับข้อมูลและกำหนดตัวแปร (เต็ม 3 คะแนน)
    # ------------------------------------------------------------------
    input_calls = len(re.findall(r"\binput\s*\(", raw))
    type_convs = len(re.findall(r"\b(?:int|float)\s*\(", raw))
    assign_lines = len(re.findall(r"(?<![=!<>])=(?!=)", raw))

    if input_calls >= 2 and type_convs >= 1 and assign_lines >= 2:
        c1_score = 3 if not has_syntax_err else 2
        c1_ev = f"พบการรับข้อมูล input() {input_calls} จุด และแปลงชนิดข้อมูล (int/float) {type_convs} จุด"
    elif input_calls >= 1 and (type_convs >= 1 or assign_lines >= 2):
        c1_score = 2
        c1_ev = f"พบ input() {input_calls} จุด และการกำหนดตัวแปร {assign_lines} จุด"
    elif input_calls >= 1 or assign_lines >= 1:
        c1_score = 1
        c1_ev = f"พบการกำหนดตัวแปรบางส่วน (input {input_calls} จุด, ตัวแปร {assign_lines} จุด)"
    else:
        c1_score = 0
        c1_ev = "ไม่พบคำสั่ง input() หรือการกำหนดตัวแปรรับข้อมูล"

    # ------------------------------------------------------------------
    # รายการที่ 2: การสร้าง Class และ Attributes (เต็ม 3 คะแนน)
    # ------------------------------------------------------------------
    found_class = next((c for c in facts["classes"] if c["name"].lower() == target_cls_name.lower()), None)
    if not found_class and facts["classes"]:
        found_class = facts["classes"][0]

    regex_class_match = re.search(r"^\s*class\s+([A-Za-z_]\w*)", raw, re.MULTILINE)
    self_attrs = list(dict.fromkeys(re.findall(r"\bself\.([A-Za-z_]\w*)\s*=", raw)))
    if found_class and found_class["attributes"]:
        self_attrs = found_class["attributes"]

    if found_class or regex_class_match:
        cls_actual = found_class["name"] if found_class else regex_class_match.group(1)
        is_exact_cls = cls_actual.lower() == target_cls_name.lower()
        attr_count = len(self_attrs)
        if is_exact_cls and attr_count >= expected_attr_count:
            c2_score = 3
            c2_ev = f"พบ class {cls_actual} และกำหนด Attributes ครบ ({', '.join('self.' + a for a in self_attrs)})"
        elif attr_count >= max(1, expected_attr_count - 1):
            c2_score = 2
            c2_ev = f"พบ class {cls_actual} และ Attributes {attr_count}/{expected_attr_count} รายการ ({', '.join('self.' + a for a in self_attrs) or 'บางส่วน'})"
        else:
            c2_score = 1
            c2_ev = f"พบการประกาศ class {cls_actual} แต่ยังกำหนด Attributes ไม่ครบถ้วน"
    else:
        c2_score = 0
        c2_ev = f"ไม่พบการสร้าง class {target_cls_name}"

    # ------------------------------------------------------------------
    # รายการที่ 3: การสร้าง Object และ Method (เต็ม 3 คะแนน)
    # ------------------------------------------------------------------
    cls_methods = []
    if found_class:
        cls_methods = [m for m in found_class["methods"] if not (m.startswith("__") and m.endswith("__"))]
    else:
        # fallback regex หา def ที่ย่อหน้าอยู่ใน class
        cls_methods = [m for m in re.findall(r"^[ \t]+def\s+([A-Za-z_]\w*)\s*\(\s*self\b", raw, re.MULTILINE) if m != "__init__"]

    cls_name_for_inst = (found_class["name"] if found_class else (regex_class_match.group(1) if regex_class_match else target_cls_name))
    has_obj_inst = bool(re.search(rf"\b{re.escape(cls_name_for_inst)}\s*\(", raw)) and bool(found_class or regex_class_match)
    has_method_call = any(
        bool(re.search(rf"\.\s*{re.escape(m)}\s*\(", raw))
        for m in cls_methods
    ) or len(facts["method_calls"]) > 0

    if has_obj_inst and cls_methods and has_method_call and not has_syntax_err:
        c3_score = 3
        c3_ev = f"สร้าง Object จาก {cls_name_for_inst} และเรียกใช้ Method ({', '.join(cls_methods)}) ถูกต้อง"
    elif (has_obj_inst and cls_methods) or (has_obj_inst and has_method_call):
        c3_score = 2
        c3_ev = f"พบการสร้าง Object ({cls_name_for_inst}) และ Method แต่การเรียกใช้งานยังไม่สมบูรณ์บางส่วน"
    elif has_obj_inst or cls_methods:
        c3_score = 1
        c3_ev = "พบการสร้าง Object หรือ Method บางส่วน แต่ยังไม่ครบถ้วน"
    else:
        c3_score = 0
        c3_ev = f"ไม่พบการสร้าง Object จากคลาส {target_cls_name} และการสร้าง Method"

    # ------------------------------------------------------------------
    # รายการที่ 4: การสร้าง Function และ Parameter (เต็ม 3 คะแนน)
    # ------------------------------------------------------------------
    top_funcs = re.findall(r"^def\s+([A-Za-z_]\w*)\s*\(([^)]*)\)\s*:", raw, re.MULTILINE)
    all_funcs = top_funcs if top_funcs else [
        (m, p) for m, p in re.findall(r"\bdef\s+([A-Za-z_]\w*)\s*\(([^)]*)\)\s*:", raw)
        if m != "__init__" and not p.strip().startswith("self")
    ]
    has_return = bool(re.search(r"\breturn\b", raw))

    if all_funcs:
        fn_names = [f[0] for f in all_funcs]
        has_params = any(len(f[1].strip()) > 0 for f in all_funcs)
        fn_called = any(len(re.findall(rf"\b{re.escape(fn)}\s*\(", raw)) >= 2 for fn in fn_names)
        if has_params and has_return and fn_called and not has_syntax_err:
            c4_score = 3
            c4_ev = f"สร้าง Function ({', '.join(fn_names)}) รับ Parameter และ return ค่าประเมินกลับถูกต้อง"
        elif has_params and (has_return or fn_called):
            c4_score = 2
            c4_ev = f"สร้าง Function ({', '.join(fn_names)}) รับ Parameter ได้ แต่การส่งค่ากลับหรือการเรียกใช้ยังไม่ครบสมบูรณ์"
        else:
            c4_score = 1
            c4_ev = f"พบการประกาศ Function ({', '.join(fn_names)}) แต่ยังขาด Parameter หรือการส่งค่าประเมินกลับ"
    else:
        c4_score = 0
        c4_ev = "ไม่พบการสร้าง Function และ Parameter สำหรับประเมินผล"

    # ------------------------------------------------------------------
    # รายการที่ 5: การใช้คำสั่งวนซ้ำและเงื่อนไข (เต็ม 4 คะแนน)
    # ------------------------------------------------------------------
    has_for = bool(re.search(r"\bfor\b", raw))
    has_range = bool(re.search(r"\brange\s*\(", raw))
    has_while = bool(re.search(r"\bwhile\b", raw))
    has_if = bool(re.search(r"\bif\b", raw))
    has_else_or_elif = bool(re.search(r"\b(?:else|elif)\b", raw))

    has_expected_loop = (has_for and has_range) if expected_loop == "for" else has_while
    has_any_loop = has_for or has_while

    if has_expected_loop and has_if and has_else_or_elif and not has_syntax_err:
        c5_score = 4
        loop_desc = "for, range()" if expected_loop == "for" else "while"
        c5_ev = f"ใช้คำสั่งวนซ้ำ ({loop_desc}) และเงื่อนไข (if-else) ได้ถูกต้องครบถ้วน"
    elif has_any_loop and has_if and not has_syntax_err:
        c5_score = 3
        c5_ev = "พบการใช้คำสั่งวนซ้ำและเงื่อนไข if แต่มีจุดที่แตกต่างจากข้อกำหนดเล็กน้อย"
    elif (has_any_loop or has_if) and not has_syntax_err:
        c5_score = 2
        c5_ev = "พบการใช้คำสั่งวนซ้ำหรือเงื่อนไขบางส่วน แต่ยังไม่ครบตามโจทย์"
    elif has_any_loop or has_if or has_else_or_elif:
        c5_score = 1
        c5_ev = "พยายามเขียนคำสั่งวนซ้ำหรือเงื่อนไข (if/elif/else) แต่ยังมีข้อผิดพลาดทางไวยากรณ์ทำให้ควบคุมการทำงานไม่ได้"
    else:
        c5_score = 0
        c5_ev = "ไม่พบการใช้คำสั่งวนซ้ำและคำสั่งเงื่อนไข"

    # ------------------------------------------------------------------
    # รายการที่ 6: การคำนวณ/สะสมค่า/ตรวจสอบสถานะและแสดงผลลัพธ์ (เต็ม 4 คะแนน)
    # ------------------------------------------------------------------
    print_calls = len(re.findall(r"\bprint\s*\(", raw))
    has_accum = bool(re.search(r"\+=|\b(?:total|sum)\w*\s*=\s*\b(?:total|sum)\w*\s*\+", raw, re.IGNORECASE))
    has_math = bool(re.search(r"[+\-*\/]", raw)) and assign_lines >= 2

    if print_calls >= 2 and (has_accum or has_math) and not has_syntax_err and (has_any_loop or c2_score >= 2):
        c6_score = 4 if has_accum else 3
        c6_ev = f"มีการคำนวณ/สะสมผลรวม และแสดงผลลัพธ์ด้วย print() ({print_calls} จุด) ถูกต้อง"
    elif print_calls >= 1 and (has_accum or has_math) and not has_syntax_err:
        c6_score = 2
        c6_ev = f"มีการคำนวณบางส่วนและแสดงผล print() ({print_calls} จุด) แต่ผลสรุปยังไม่ครบถ้วน"
    elif print_calls >= 1 or has_math:
        c6_score = 1
        c6_ev = f"พบความพยายามคำนวณและแสดงผล (print {print_calls} จุด) แต่ผลลัพธ์ยังไม่ถูกต้องหรือติด SyntaxError"
    else:
        c6_score = 0
        c6_ev = "ไม่พบการคำนวณและการแสดงผลลัพธ์"

    raw_scores = [c1_score, c2_score, c3_score, c4_score, c5_score, c6_score]
    evidences = [c1_ev, c2_ev, c3_ev, c4_ev, c5_ev, c6_ev]

    rubric_scores = []
    checklist = []
    for idx, crit in enumerate(spec["criteria"]):
        sc = raw_scores[idx]
        mx = crit["max_score"]
        lvl_word = _criterion_quality_word(sc, mx)
        lvl_desc = crit["levels"].get(str(sc), "")
        ev_text = evidences[idx]
        rubric_scores.append({
            "id": crit["id"],
            "title": crit["title"],
            "score": sc,
            "max_score": mx,
            "level_label": lvl_word,
            "evidence": ev_text,
            "feedback": lvl_desc,
            "levels": crit["levels"],
        })
        checklist.append({
            "criterion": f"{crit['title']} ({sc}/{mx} คะแนน · {lvl_word})",
            "passed": sc >= (mx - 1),
            "score": sc,
            "max_score": mx,
            "level_label": lvl_word,
            "evidence": ev_text,
            "feedback": lvl_desc,
        })

    total_score = sum(raw_scores)
    max_score = 20
    q = get_practical_exam_quality_level(total_score)

    syntax_note = f" (พบ SyntaxError: {facts['syntax_error']})" if has_syntax_err else ""
    summary = (
        f"[{spec['full_title']}] ประเมินตามตาราง Rubric 6 รายการ ได้ {total_score}/{max_score} คะแนน "
        f"(ระดับคุณภาพ: {q['level']}){syntax_note}"
    )

    short_breakdown = ", ".join(f"ข้อ{r['id']}:{r['score']}/{r['max_score']}" for r in rubric_scores)
    note = f"[ชุด {set_key}] {total_score}/{max_score} คะแนน ({q['level']}) | {short_breakdown}"

    strengths = [f"{r['title']} ({r['score']}/{r['max_score']} · {r['level_label']})" for r in rubric_scores if r["score"] >= r["max_score"] - 1]
    suggestions = [f"{r['title']}: {r['feedback']}" for r in rubric_scores if r["score"] < r["max_score"] - 1]
    if has_syntax_err:
        suggestions.insert(0, f"แก้ไข SyntaxError ({facts['syntax_error']}) เพื่อให้โปรแกรมรันจนจบได้")

    return {
        "mode": "ast_heuristic",
        "is_practical_exam": True,
        "exam_set": set_key,
        "exam_set_title": spec["full_title"],
        "quality_level": q["level"],
        "score": total_score,
        "max_score": max_score,
        "status": q["status"],
        "status_label": q["level"],
        "summary": summary,
        "rubric_scores": rubric_scores,
        "checklist": checklist,
        "strengths": strengths or ["มีความพยายามในการเขียนโค้ดตามโจทย์สอบปฏิบัติ"],
        "suggestions": suggestions or ["ทำครบตามเกณฑ์การประเมินทุกข้อแล้ว"],
        "suggested_teacher_note": note,
    }


def evaluate_with_ast_fallback(
    prompt: str,
    code: str,
    student_name: str = "",
    filename: str = "",
    exam_set: Optional[str] = None,
    assignment_id: str = "",
) -> Dict[str, Any]:
    """
    ระบบตรวจความถูกต้องเชิงโครงสร้าง OOP ด้วย AST (ทำงานออฟไลน์ 100% ไม่ต้องใช้ API)
    รองรับทั้งใบงานปกติ (10 คะแนน) และงานที่ 5 สอบปฏิบัติ 4 ชุด A–D (Rubric Score 20 คะแนน)
    """
    if exam_set or is_practical_exam_prompt(prompt, assignment_id):
        detected_set = detect_practical_exam_set(code, filename, student_name, exam_set)
        return evaluate_practical_exam_ast(code, detected_set, prompt, student_name, filename)

    facts = _extract_ast_facts(code)
    specs = parse_prompt_specs(prompt)
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

    # 1. ตรวจการสร้างคลาส
    target_class = specs.get("class_name") or ("Product" if "product" in prompt.lower() else (facts["classes"][0]["name"] if facts["classes"] else "Class"))
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

    # 2. ตรวจสอบ Property / Attributes
    required_attrs = specs.get("attributes") or (["name", "price", "quantity"] if "property" in prompt.lower() or "price" in prompt.lower() else [])
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

    # 3. ตรวจสอบ Methods
    target_methods = specs.get("methods") or (["show_info"] if "show_info" in prompt.lower() else [])
    if found_class and target_methods:
        all_methods_ok = True
        found_method_names = []
        missing_method_names = []
        for m in target_methods:
            if any(em.lower() == m.lower() for em in found_class["methods"]):
                found_method_names.append(m)
            else:
                missing_method_names.append(m)
                all_methods_ok = False

        if all_methods_ok:
            checklist.append({
                "criterion": f"สร้าง Method ({', '.join([m + '()' for m in target_methods])}) ตามข้อกำหนด",
                "passed": True,
                "evidence": f"พบ def {', '.join(found_method_names)} ภายในคลาส",
                "feedback": "สร้าง Method ตามชื่อที่โจทย์กำหนดครบถ้วน",
            })
            score += 2
        elif found_method_names:
            checklist.append({
                "criterion": f"สร้าง Method ({', '.join([m + '()' for m in target_methods])}) ตามข้อกำหนด",
                "passed": False,
                "evidence": f"พบเฉพาะ def {', '.join(found_method_names)} (ยังขาด: {', '.join(missing_method_names)})",
                "feedback": f"ควรสร้างเมธอด {', '.join(missing_method_names)} เพิ่มเติม",
            })
            score += 1
        else:
            checklist.append({
                "criterion": f"สร้าง Method ({', '.join([m + '()' for m in target_methods])}) ตามข้อกำหนด",
                "passed": False,
                "evidence": f"ไม่พบเมธอดตามที่กำหนด (Method ที่พบ: {found_class['methods']})",
                "feedback": f"ควรสร้างเมธอด def {target_methods[0]}(self):",
            })
    elif found_class and found_class["methods"]:
        user_methods = [m for m in found_class["methods"] if not (m.startswith("__") and m.endswith("__"))]
        if user_methods:
            checklist.append({
                "criterion": "สร้าง Method ในคลาสสำหรับจัดการข้อมูล",
                "passed": True,
                "evidence": f"พบเมธอด {', '.join(user_methods)}",
                "feedback": "สร้างเมธอดในคลาสเรียบร้อย",
            })
            score += 2

    # 4. ตรวจการสร้าง Object
    min_objs = specs.get("min_objects", 2)
    if found_class:
        inst_count = facts["instantiations"].count(found_class["name"])
        if inst_count >= min_objs:
            checklist.append({
                "criterion": f"สร้าง Object อย่างน้อย {min_objs} รายการ",
                "passed": True,
                "evidence": f"พบการสร้างอินสแตนซ์ {found_class['name']}(...) จำนวน {inst_count} รายการ",
                "feedback": f"สร้างอ็อบเจกต์ครบตามเงื่อนไข (>= {min_objs} รายการ)",
            })
            score += 2
        elif inst_count > 0:
            checklist.append({
                "criterion": f"สร้าง Object อย่างน้อย {min_objs} รายการ",
                "passed": False,
                "evidence": f"พบการสร้างอินสแตนซ์ {found_class['name']}(...) เพียง {inst_count} รายการ",
                "feedback": f"โจทย์กำหนดให้สร้างอย่างน้อย {min_objs} รายการ",
            })
            score += 1
        else:
            checklist.append({
                "criterion": f"สร้าง Object อย่างน้อย {min_objs} รายการ",
                "passed": False,
                "evidence": f"ไม่พบคำสั่งสร้าง Object จากคลาส {found_class['name']}",
                "feedback": f"ควรมีคำสั่งสร้างอ็อบเจกต์ เช่น obj1 = {found_class['name']}(...)",
            })

    # 5. ตรวจการเรียกใช้ Method เพื่อแสดงผล
    called_methods = [m for m in (specs.get("methods") or ["show_info"]) if facts["method_calls"].count(m) >= 1]
    if called_methods:
        checklist.append({
            "criterion": "เรียกใช้ Method เพื่อแสดงผลการทำงานของ Object",
            "passed": True,
            "evidence": f"พบคำสั่งเรียกใช้ .{called_methods[0]}() ในโปรแกรม",
            "feedback": "เรียกใช้ Method สำเร็จ",
        })
        score += 2
    elif facts["method_calls"]:
        checklist.append({
            "criterion": "เรียกใช้ Method ของ Object",
            "passed": True,
            "evidence": f"พบการเรียกใช้เมธอด: {', '.join(set(facts['method_calls']))}",
            "feedback": "มีการเรียกใช้ Method",
        })
        score += 2
    else:
        checklist.append({
            "criterion": "เรียกใช้ Method เพื่อแสดงผลการทำงานของ Object",
            "passed": False,
            "evidence": "ไม่พบคำสั่งเรียกใช้ Method ของอ็อบเจกต์",
            "feedback": "ควรมีคำสั่งเรียกใช้งานเมธอดเพื่อทดสอบการทำงานของแต่ละอ็อบเจกต์",
        })


    status = "passed" if score >= 8 else ("partial" if score >= 5 else "failed")
    status_label = "ผ่านเกณฑ์สมบูรณ์" if status == "passed" else ("ผ่านเกณฑ์บางส่วน" if status == "partial" else "ควรปรับปรุง")

    summary = f"ตรวจพบโครงสร้าง OOP พื้นฐานตามโจทย์ (ได้คะแนน {score}/{max_score}) "
    if status == "passed":
        summary += "เขียนคลาส Product, Property, Method และสร้างอ็อบเจกต์ครบถ้วนตามข้อกำหนด"
    else:
        summary += "ยังมีข้อกำหนดบางส่วนที่ยังไม่ครบถ้วน กรุณาดูรายละเอียดในเช็คลิสต์"

    methods_str = ", ".join(target_methods) if target_methods else "เมธอด"
    note = f"สร้างคลาส {target_class} และเมธอด {methods_str} ({score}/{max_score})"

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
    exam_set: Optional[str] = None,
    assignment_id: str = "",
) -> Dict[str, Any]:
    """
    ตรวจงานนักเรียนด้วย Gemini API (LLM) อย่างละเอียด วิเคราะห์ตรรกะ สูตรคำนวณ และผลลัพธ์
    รองรับทั้งใบงานปกติ (10 คะแนน) และงานที่ 5 สอบปฏิบัติ 4 ชุด A–D (Rubric Score 20 คะแนน)
    """
    is_exam = bool(exam_set) or is_practical_exam_prompt(prompt, assignment_id)
    if is_exam:
        set_key = detect_practical_exam_set(code, filename, student_name, exam_set)
        ast_baseline = evaluate_practical_exam_ast(code, set_key, prompt, student_name, filename)
        spec = PRACTICAL_EXAM_SETS[set_key]
        facts = _extract_ast_facts(code)

        criteria_desc = "\n".join(
            f"{c['title']} (เต็ม {c['max_score']} คะแนน): "
            + " | ".join(f"{k} คะแนน={v}" for k, v in c["levels"].items())
            for c in spec["criteria"]
        )

        system_instruction = (
            "คุณคืออาจารย์ผู้สอนวิชา '21910-2011 การเขียนโปรแกรมเชิงวัตถุเบื้องต้น' "
            f"กำลังตรวจข้อสอบปฏิบัติ '{spec['full_title']}' (คะแนนเต็ม 20 คะแนน) ตามตาราง Rubric Score 6 รายการ "
            "หากนักเรียนใช้วิธีอื่นที่ถูกต้องตามหลักการหรือมีหลักฐานการปฏิบัติบางส่วน ให้พิจารณาให้คะแนนตามระดับคุณภาพจริง "
            "ตอบกลับเป็น JSON เท่านั้น"
        )
        user_content = f"""[ชุดข้อสอบที่ตรวจ: {spec['full_title']} (คะแนนเต็ม 20 คะแนน)]
{criteria_desc}

[ข้อมูลนักเรียน]
ชื่อ/รหัส: {student_name or 'นักเรียน'} | ไฟล์: {filename or 'exam.py'}
AST Syntax Valid: {facts['valid_syntax']} | SyntaxError: {facts['syntax_error']}

[โค้ด Python ของนักเรียน]
```python
{code}
```

ตอบกลับเป็น JSON โครงสร้างนี้เท่านั้น:
{{
  "exam_set": "{set_key}",
  "items": [
    {{"id": 1, "score": <0-3>, "evidence": "<หลักฐานในโค้ด>", "feedback": "<คำแนะนำสั้นๆ>"}},
    {{"id": 2, "score": <0-3>, "evidence": "<หลักฐานในโค้ด>", "feedback": "<คำแนะนำสั้นๆ>"}},
    {{"id": 3, "score": <0-3>, "evidence": "<หลักฐานในโค้ด>", "feedback": "<คำแนะนำสั้นๆ>"}},
    {{"id": 4, "score": <0-3>, "evidence": "<หลักฐานในโค้ด>", "feedback": "<คำแนะนำสั้นๆ>"}},
    {{"id": 5, "score": <0-4>, "evidence": "<หลักฐานในโค้ด>", "feedback": "<คำแนะนำสั้นๆ>"}},
    {{"id": 6, "score": <0-4>, "evidence": "<หลักฐานในโค้ด>", "feedback": "<คำแนะนำสั้นๆ>"}}
  ],
  "summary": "<สรุปภาพรวม 1-2 ประโยค>",
  "strengths": ["<จุดเด่น>"],
  "suggestions": ["<ข้อเสนอแนะ>"]
}}"""

        payload = {
            "contents": [{"role": "user", "parts": [{"text": f"{system_instruction}\n\n{user_content}"}]}],
            "generationConfig": {"temperature": 0.2, "responseMimeType": "application/json"},
        }
        last_error = ""
        async with httpx.AsyncClient(timeout=35.0) as client:
            for model in GEMINI_MODELS:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
                try:
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
                                ai_items = {int(it.get("id", 0)): it for it in (parsed.get("items") or []) if isinstance(it, dict)}
                                rubric_scores = []
                                checklist = []
                                for idx, crit in enumerate(spec["criteria"]):
                                    cid = crit["id"]
                                    mx = crit["max_score"]
                                    base_item = ast_baseline["rubric_scores"][idx]
                                    ai_it = ai_items.get(cid, {})
                                    raw_sc = ai_it.get("score", base_item["score"])
                                    try:
                                        sc = max(0, min(mx, int(round(float(raw_sc)))))
                                    except Exception:
                                        sc = base_item["score"]
                                    lvl_word = _criterion_quality_word(sc, mx)
                                    ev_text = str(ai_it.get("evidence") or base_item["evidence"])
                                    fb_text = str(ai_it.get("feedback") or crit["levels"].get(str(sc), ""))
                                    rubric_scores.append({
                                        "id": cid,
                                        "title": crit["title"],
                                        "score": sc,
                                        "max_score": mx,
                                        "level_label": lvl_word,
                                        "evidence": ev_text,
                                        "feedback": fb_text,
                                        "levels": crit["levels"],
                                    })
                                    checklist.append({
                                        "criterion": f"{crit['title']} ({sc}/{mx} คะแนน · {lvl_word})",
                                        "passed": sc >= (mx - 1),
                                        "score": sc,
                                        "max_score": mx,
                                        "level_label": lvl_word,
                                        "evidence": ev_text,
                                        "feedback": fb_text,
                                    })
                                total_score = sum(r["score"] for r in rubric_scores)
                                q = get_practical_exam_quality_level(total_score)
                                short_breakdown = ", ".join(f"ข้อ{r['id']}:{r['score']}/{r['max_score']}" for r in rubric_scores)
                                note = f"[ชุด {set_key}] {total_score}/20 คะแนน ({q['level']}) | {short_breakdown}"
                                return {
                                    "mode": "gemini_ai",
                                    "model_used": model,
                                    "is_practical_exam": True,
                                    "exam_set": set_key,
                                    "exam_set_title": spec["full_title"],
                                    "quality_level": q["level"],
                                    "score": total_score,
                                    "max_score": 20,
                                    "status": q["status"],
                                    "status_label": q["level"],
                                    "summary": parsed.get("summary") or ast_baseline["summary"],
                                    "rubric_scores": rubric_scores,
                                    "checklist": checklist,
                                    "strengths": parsed.get("strengths") or ast_baseline["strengths"],
                                    "suggestions": parsed.get("suggestions") or ast_baseline["suggestions"],
                                    "suggested_teacher_note": note,
                                }
                    else:
                        last_error = f"{model} returned status {resp.status_code}"
                except Exception as e:
                    last_error = f"Error calling {model}: {e}"
        return ast_baseline

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
    fallback = evaluate_with_ast_fallback(prompt, code, student_name, filename, exam_set=exam_set, assignment_id=assignment_id)
    fallback["api_warning"] = f"ไม่สามารถเรียก Gemini API ได้ ({last_error}) ระบบจึงประเมินด้วยโครงสร้าง AST แทนชั่วคราว"
    return fallback


async def grade_student_code(
    prompt: str,
    code: str,
    api_key: Optional[str] = None,
    student_name: str = "",
    filename: str = "",
    exam_set: Optional[str] = None,
    assignment_id: str = "",
) -> Dict[str, Any]:
    """จุดเข้าหลักสำหรับการตรวจงานนักเรียน"""
    clean_key = resolve_gemini_api_key(api_key)
    if clean_key:
        return await evaluate_with_gemini(
            prompt,
            code,
            clean_key,
            student_name,
            filename,
            exam_set=exam_set,
            assignment_id=assignment_id,
        )
    return evaluate_with_ast_fallback(
        prompt,
        code,
        student_name,
        filename,
        exam_set=exam_set,
        assignment_id=assignment_id,
    )

