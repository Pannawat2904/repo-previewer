# Repo Previewer 🧑‍🏫🔍

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FPannawat2904%2Frepo-previewer)

เครื่องมือพรีวิวและตรวจสอบงานนักเรียนจาก GitHub Repository (Public) สามารถรันในเครื่องครูแบบ Local Web App หรือ Deploy ขึ้น Cloud ผ่าน **Vercel** เพื่อเปิดใช้งานได้ทุกที่ทุกเวลา โดยไม่ต้องดาวน์โหลดและแตกไฟล์ทีละคน

---

## ☁️ การ Deploy ขึ้น Vercel (พร้อมใช้งานจริง)

คุณครูสามารถ Deploy ขึ้น Vercel ได้อย่างง่ายดายใน 1 นาที:

1. คลิกที่ปุ่ม **[Deploy with Vercel](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FPannawat2904%2Frepo-previewer)** หรือเปิดไปที่ [vercel.com/new](https://vercel.com/new)
2. เชื่อมต่อบัญชี GitHub และเลือก Import Repository `Pannawat2904/repo-previewer`
3. กดปุ่ม **"Deploy"** ทันที (ไม่ต้องแก้ไขการตั้งค่าใด ๆ โครงการมีไฟล์ `vercel.json` และ `api/index.py` สำหรับ Serverless รองรับพร้อมใช้งาน 100%)
4. เมื่อ Deploy เสร็จ คุณครูจะได้ URL เว็บไซต์ เช่น `https://repo-previewer-xxx.vercel.app` สำหรับใช้งานตรวจงานได้ทันทีบนอุปกรณ์ใดก็ได้!

---

## 🌟 คุณสมบัติเด่น
1. **วางลิงก์หลายบรรทัดพร้อมกัน**: รองรับทั้งแบบ `ลิงก์อย่างเดียว` หรือ `ชื่อนักเรียน<tab หรือ comma>ลิงก์`
2. **ดาวน์โหลดและแตกไฟล์ zip อัตโนมัติ**: ดึงจาก branch เริ่มต้นของ GitHub (`HEAD.zip`) โดยไม่ต้องใช้ Token
3. **เริ่มดูคนแรกได้ทันที**: ดาวน์โหลดพร้อมกันแบบจำกัด 4-5 คอนเนกชัน และแจ้งความคืบหน้าแบบ Real-time โดยไม่ต้องรอให้เสร็จทั้งหมด
4. **พรีวิวผ่าน Origin แยกเฉพาะตัว (Lazy Dynamic Port)**: เสิร์ฟผ่าน HTTP จริงบน `127.0.0.1` เพื่อให้ path แบบ Absolute เช่น `/style.css` ใช้งานได้ 100% เสมือน deploy จริง และแยก Origin ออกจากแอปหลักเพื่อความปลอดภัยสูงสุด
5. **แท็บโค้ด (Code Viewer)**: แสดงต้นไม้โฟลเดอร์ (File Tree) ดูโค้ดพร้อมสีไวยากรณ์ (Syntax Highlighting) รองรับภาษาไทยสมบูรณ์แบบ (UTF-8, TIS-620, CP874) และพรีวิวไฟล์รูปภาพ
6. **แท็บข้อสังเกต (Observations)**:
   - ตรวจหาไฟล์ที่ `index.html` อ้างถึง (`src`/`href`) แต่หาไม่พบบนดิสก์ พร้อมแนะนำ Path ที่ถูกต้อง (เช่น `src="../photo/3984.jpg"` แนะนำ `photo/3984.jpg`)
   - ดักจับ Console Error/Warning และ Failed Requests (404) จากหน้าเว็บจริงขณะเปิดดู
   - แสดงข้อมูล Commit Hash, วันเวลาที่ส่งงาน, ตำแหน่งไฟล์ `index.html`
7. **ระบบอำนวยความสะดวกสำหรับครู**:
   - คีย์ลัดแป้นพิมพ์ `<kbd>←</kbd>` และ `<kbd>→</kbd>` สลับดูคนก่อนหน้า/ถัดไปได้ทันที
   - เช็คบ็อกซ์ "ตรวจแล้ว" และช่องบันทึก "โน้ตสั้น ๆ" บันทึกอัตโนมัติลงในเครื่อง (`data/reviews.json`) รีเฟรชแล้วข้อมูลไม่หาย
   - ปุ่ม "โหลดใหม่" รายบุคคล (สำหรับกรณีนักเรียนแก้โค้ดแล้วส่งใหม่) และปุ่ม "ล้างแคชทั้งหมด"

---

## 🛠️ ความต้องการของระบบและการติดตั้ง

### ความต้องการ:
- **ระบบปฏิบัติการ**: Windows, macOS หรือ Linux
- **Python**: เวอร์ชัน 3.11 ขึ้นไป

### ขั้นตอนการติดตั้ง (ทำครั้งแรกครั้งเดียว):

1. **สร้างและเปิดใช้งาน Virtual Environment:**
   ```bash
   # บน macOS / Linux:
   python3 -m venv .venv
   source .venv/bin/activate

   # บน Windows (Command Prompt หรือ PowerShell):
   python -m venv .venv
   .venv\Scripts\activate
   ```

2. **ติดตั้ง Dependencies (มีเพียง 3 ตัวหลัก):**
   ```bash
   pip install -r requirements.txt
   ```

---

## 🚀 วิธีการใช้งาน

1. **สั่งรันเซิร์ฟเวอร์ด้วยคำสั่งเดียว:**
   ```bash
   python app.py
   ```

2. **เปิดเบราว์เซอร์ไปที่:**
   ```
   http://localhost:8000
   ```

3. **วางลิงก์งานนักเรียน:**
   คลิกที่ปุ่ม **"นำเข้าลิงก์ตรวจงาน"** หรือ **"วางลิงก์ส่งงาน"**
   ตัวอย่างรูปแบบข้อมูลที่รองรับ:
   ```text
   https://github.com/patvikan24-oss/my-profil-013
   ปัฐวิกาณ (ลูกปัด)	https://github.com/patvikan24-oss/my-profil-013/tree/main
   สมชาย เข็มกลัด, https://github.com/somchai/web-profile
   สมหญิง สดใส	https://github.com/somying/card.git
   ```
   - ระบบจะตัด `.git`, `/tree/...`, `/blob/...`, hash และ query parameter ออกให้อัตโนมัติ
   - ลิงก์ซ้ำจะถูกรวมเป็นรายการเดียวโดยอัตโนมัติ

4. **ตรวจงานได้ทันที:**
   - รายการนักเรียนจะปรากฏที่แถบด้านซ้าย
   - เมื่อนักเรียนคนใดโหลดเสร็จ สามารถคลิกเพื่อดูงานได้ทันที
   - ใช้ปุ่มลูกศร `←` หรือ `→` บนคีย์บอร์ดเพื่อเลื่อนดูทีละคนอย่างรวดเร็ว

---

## 🔒 มาตรการความปลอดภัย (Security)

1. **ผูกกับ 127.0.0.1 เท่านั้น**: เซิร์ฟเวอร์หลักและเซิร์ฟเวอร์พรีวิวจะผูกกับ localhost (`127.0.0.1`) เท่านั้น ไม่เปิดให้เครื่องอื่นในวงแลนเข้าถึงได้
2. **เสิร์ฟไฟล์สถิตเท่านั้น**: ไม่มีการสั่งรันคำสั่งเชลล์ (Shell) หรือเซิร์ฟเวอร์สคริปต์ของนักเรียนในเครื่องครู
3. **ป้องกัน Zip-Slip Vulnerability**: มีการตรวจสอบ Canonical Path ของทุกไฟล์ก่อนแตกจาก zip ห้ามเขียนไฟล์ออกนอกโฟลเดอร์ปลายทางเด็ดขาด
4. **Origin Isolation & Sandbox**:
   - พรีวิวงานใน `<iframe>` ที่มี Sandbox รัดกุม
   - แต่ละ repo เสิร์ฟด้วย Port ของตัวเอง ทำให้ Origin แยกจากหน้าแอปหลักของครูอย่างเด็ดขาด สคริปต์ของนักเรียนไม่สามารถเข้าถึง LocalStorage, Cookies หรือข้อมูลในแอปของครูได้
5. **XSS Protection**: ข้อมูลและข้อความทั้งหมดที่ดึงมาจากนักเรียนจะผ่านการ Escape HTML ก่อนแสดงผล

---

## 🧪 การทดสอบระบบ (Automated Tests)

โปรเจกต์มีชุดทดสอบครอบคลุมทั้งการแปลงลิงก์, การโหลดและแตกไฟล์อย่างปลอดภัย, การเปิดพอร์ตเสิร์ฟงาน และการตรวจสอบ Broken Links:

```bash
python -m unittest discover tests
```

---

## 📁 โครงสร้างโปรเจกต์

```text
repo-previewer/
├── app.py                  # จุดเริ่มต้นเซิร์ฟเวอร์ FastAPI (REST + SSE)
├── previewer/
│   ├── links.py            # ตรวจสอบ แปลง และรวมลิงก์ที่ซ้ำกัน
│   ├── fetch.py            # ดาวน์โหลด แตก zip ป้องกัน zip-slip และจัดการแคช
│   ├── serve.py            # เซิร์ฟเวอร์ Lazy dynamic port บน 127.0.0.1
│   ├── inspect.py          # ตรวจสอบ broken links (src/href), โครงสร้าง และคำแนะนำ
│   ├── code_viewer.py      # สร้างต้นไม้ไฟล์ และอ่านเนื้อหาพร้อมตรวจ UTF-8/ภาษาไทย
│   ├── storage.py          # บันทึกสถานะ "ตรวจแล้ว" และ "โน้ต" ลงไฟล์ JSON ในเครื่อง
│   └── static/             # หน้าบ้านเว็บแอป (HTML5, Vanilla CSS, Vanilla JS)
│       ├── index.html
│       ├── app.css
│       └── app.js
├── tests/                  # ชุด Unit Tests
│   ├── test_links.py
│   ├── test_fetch.py
│   ├── test_serve.py
│   └── test_inspect.py
├── data/                   # โฟลเดอร์จัดเก็บข้อมูลในเครื่อง (Cache และ Notes)
├── requirements.txt        # ไลบรารีที่จำเป็น (FastAPI, Uvicorn, HTTPX)
└── README.md               # เอกสารแนะนำการติดตั้งและใช้งานภาษาไทย
```
