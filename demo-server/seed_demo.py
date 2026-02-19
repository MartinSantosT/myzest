"""
Seed script for Zest demo instance (demo.myzest.app)
Creates demo user + seeds example data using shared seed_examples module.

Run inside the container:
  docker exec zest_demo python demo-server/seed_demo.py
"""

import sys
import os

# Add app to path
sys.path.insert(0, "/app")

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import User
from app.database import Base
from app.seed_examples import seed_user_examples
import bcrypt

DB_PATH = "/app/data/zest.db"
engine = create_engine(f"sqlite:///{DB_PATH}")
Session = sessionmaker(bind=engine)

# Create tables if they don't exist
Base.metadata.create_all(engine)

db = Session()

# ============================================================
# 1. DEMO USER
# ============================================================
demo_email = "demo@myzest.app"
existing = db.query(User).filter(User.email == demo_email).first()
if existing:
    print("Demo data already exists. Skipping seed.")
    db.close()
    sys.exit(0)

password_hash = bcrypt.hashpw("demo1234".encode(), bcrypt.gensalt()).decode()
demo_user = User(
    email=demo_email,
    name="Demo Chef",
    password_hash=password_hash,
    username="demochef",
    is_admin=True
)
db.add(demo_user)
db.commit()
db.refresh(demo_user)

print(f"Created demo user: {demo_email} / demo1234")

# ============================================================
# 2. SEED EXAMPLE DATA (shared function)
# ============================================================
result = seed_user_examples(db, demo_user.id)
db.commit()
db.close()

print(f"\n✅ Demo data seeded successfully!")
print(f"   Login: {demo_email} / demo1234")
print(f"   Recipes: {result['recipes']}")
print(f"   Categories: {result['categories']}")
print(f"   Tags: {result['tags']}")
print(f"   Memories: {result['memories']}")
print(f"   Cookbooks: {result['cookbooks']}")
print(f"   Photos copied: {result['photos_copied']}")
