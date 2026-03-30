#!/usr/bin/env python3
"""
User Management Script for Thalassemia Prediction System
=========================================================
ใช้สคริปต์นี้เพื่อ add / list / deactivate users ในระบบ

Usage:
    python manage_users.py add <username> <password>
    python manage_users.py list
    python manage_users.py deactivate <username>
    python manage_users.py hash <password>   # แค่ generate hash โดยไม่บันทึก
"""

import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

import bcrypt as _bcrypt
from sqlalchemy import create_engine, text

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set in .env")
    sys.exit(1)

engine = create_engine(DATABASE_URL)


def hash_password(password: str) -> str:
    return _bcrypt.hashpw(password.encode(), _bcrypt.gensalt(12)).decode()


def add_user(username: str, password: str):
    hashed = hash_password(password)
    with engine.connect() as conn:
        try:
            conn.execute(
                text("INSERT INTO users (username, hashed_password) VALUES (:u, :h)"),
                {"u": username, "h": hashed},
            )
            conn.commit()
            print(f"✅  User '{username}' added successfully.")
        except Exception as e:
            if "duplicate" in str(e).lower() or "unique" in str(e).lower():
                print(f"⚠️   User '{username}' already exists.")
            else:
                print(f"❌  Error: {e}")


def list_users():
    with engine.connect() as conn:
        rows = conn.execute(
            text("SELECT id, username, is_active, created_at FROM users ORDER BY id")
        ).fetchall()
    if not rows:
        print("No users found.")
        return
    print(f"{'ID':<6}{'Username':<25}{'Active':<10}{'Created At'}")
    print("-" * 65)
    for r in rows:
        active = "Yes" if r[2] else "No"
        print(f"{r[0]:<6}{r[1]:<25}{active:<10}{str(r[3])[:19]}")


def deactivate_user(username: str):
    with engine.connect() as conn:
        result = conn.execute(
            text("UPDATE users SET is_active = FALSE WHERE username = :u"),
            {"u": username},
        )
        conn.commit()
        if result.rowcount == 0:
            print(f"⚠️   User '{username}' not found.")
        else:
            print(f"✅  User '{username}' deactivated.")


if __name__ == "__main__":
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        sys.exit(0)

    cmd = args[0].lower()

    if cmd == "hash" and len(args) == 2:
        print(hash_password(args[1]))

    elif cmd == "add" and len(args) == 3:
        add_user(args[1], args[2])

    elif cmd == "list":
        list_users()

    elif cmd == "deactivate" and len(args) == 2:
        deactivate_user(args[1])

    else:
        print(__doc__)
        sys.exit(1)
