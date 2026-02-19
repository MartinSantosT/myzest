"""
Zest — Automatic migration script
======================================
Detects and applies schema changes to the existing SQLite database.
Safe to run multiple times (idempotent).

Usage:
    python migrate.py                # Run migration
    docker exec zest_backend python migrate.py   # Inside Docker
"""

import sqlite3
import os
import sys
import shutil
from datetime import datetime


DB_PATH = "data/zest.db"


def get_connection():
    if not os.path.exists(DB_PATH):
        print(f"  ⚠ Database not found at {DB_PATH}")
        print(f"  → If this is a new installation, start the app first to create it.")
        sys.exit(0)
    return sqlite3.connect(DB_PATH)


def get_existing_tables(conn):
    cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
    return {row[0] for row in cursor.fetchall()}


def get_table_columns(conn, table_name):
    cursor = conn.execute(f"PRAGMA table_info({table_name})")
    return {row[1] for row in cursor.fetchall()}


def backup_database():
    """Create backup before migrating."""
    if not os.path.exists(DB_PATH):
        return
    os.makedirs("data/backups", exist_ok=True)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_path = f"data/backups/zest_pre_migrate_{timestamp}.db"
    shutil.copy2(DB_PATH, backup_path)
    print(f"  ✓ Backup created: {backup_path}")
    return backup_path


# ============================================================
# MIGRATIONS
# ============================================================
# Each migration is a function that receives (conn, tables, columns_cache).
# Must be idempotent (safe to run multiple times).

def migrate_memories_table(conn, tables, columns_cache):
    """Phase 6: Create memories table if it doesn't exist."""
    if "memories" not in tables:
        conn.execute("""
            CREATE TABLE memories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id),
                recipe_id INTEGER REFERENCES recipes(id) ON DELETE SET NULL,
                title TEXT NOT NULL,
                description TEXT DEFAULT '',
                event_date DATE,
                location TEXT DEFAULT '',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME
            )
        """)
        conn.execute("CREATE INDEX ix_memories_id ON memories (id)")
        conn.execute("CREATE INDEX ix_memories_user_id ON memories (user_id)")
        print("  ✓ 'memories' table created")
        return True
    return False


def migrate_memory_photos_table(conn, tables, columns_cache):
    """Phase 6: Create memory_photos table if it doesn't exist."""
    if "memory_photos" not in tables:
        conn.execute("""
            CREATE TABLE memory_photos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                memory_id INTEGER NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
                image_url TEXT NOT NULL,
                caption TEXT DEFAULT '',
                order_index INTEGER DEFAULT 0
            )
        """)
        conn.execute("CREATE INDEX ix_memory_photos_id ON memory_photos (id)")
        print("  ✓ 'memory_photos' table created")
        return True
    return False


def migrate_memories_location_column(conn, tables, columns_cache):
    """Phase 6: Add location column to memories if it doesn't exist."""
    if "memories" not in tables:
        return False  # The table is created with location, no ALTER needed

    cols = columns_cache.get("memories")
    if cols is None:
        cols = get_table_columns(conn, "memories")
        columns_cache["memories"] = cols

    if "location" not in cols:
        conn.execute('ALTER TABLE memories ADD COLUMN location TEXT DEFAULT ""')
        print("  ✓ 'location' column added to 'memories'")
        return True
    return False


def migrate_backup_config_table(conn, tables, columns_cache):
    """Phase 5: Create backup_config table if it doesn't exist."""
    if "backup_config" not in tables:
        conn.execute("""
            CREATE TABLE backup_config (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                enabled BOOLEAN DEFAULT 0,
                frequency_hours INTEGER DEFAULT 24,
                max_backups INTEGER DEFAULT 7,
                include_images BOOLEAN DEFAULT 1,
                last_backup_at DATETIME,
                last_backup_size TEXT DEFAULT '',
                last_backup_status TEXT DEFAULT '',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME
            )
        """)
        conn.execute("CREATE INDEX ix_backup_config_id ON backup_config (id)")
        print("  ✓ 'backup_config' table created")
        return True
    return False


# Ordered list of all migrations
MIGRATIONS = [
    migrate_backup_config_table,
    migrate_memories_table,
    migrate_memory_photos_table,
    migrate_memories_location_column,
]


def run_migrations():
    print("🍊 Zest — Database migration")
    print("=" * 45)

    # Backup first
    backup_database()

    conn = get_connection()
    tables = get_existing_tables(conn)
    columns_cache = {}
    changes = 0

    print(f"\n  Existing tables: {len(tables)}")
    print(f"  Migrations to check: {len(MIGRATIONS)}\n")

    for migration_fn in MIGRATIONS:
        try:
            if migration_fn(conn, tables, columns_cache):
                changes += 1
                # Update list of tables after creating a new one
                tables = get_existing_tables(conn)
        except Exception as e:
            print(f"  ✗ Error in {migration_fn.__name__}: {e}")
            conn.rollback()
            conn.close()
            sys.exit(1)

    conn.commit()
    conn.close()

    if changes:
        print(f"\n  ✅ {changes} migration(s) applied")
    else:
        print(f"\n  ✅ Database is already up to date — nothing to migrate")

    print()


if __name__ == "__main__":
    run_migrations()
