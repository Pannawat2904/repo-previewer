"""
Vercel Serverless Entrypoint
"""

import sys
from pathlib import Path

# เพิ่ม Root directory ของโปรเจกต์เข้า sys.path
root_dir = Path(__file__).resolve().parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from app import app
