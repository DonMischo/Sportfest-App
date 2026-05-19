import sqlite3
import os
from pathlib import Path

DB_PATH = Path(__file__).parent / "sportfest.db"


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    with get_conn() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS students (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                nummer      INTEGER,
                nachname    TEXT NOT NULL,
                vorname     TEXT NOT NULL,
                klasse      TEXT NOT NULL,
                jahrgang    INTEGER NOT NULL,
                geschlecht  TEXT NOT NULL CHECK(geschlecht IN ('männlich','weiblich'))
            );

            CREATE TABLE IF NOT EXISTS disciplines (
                id      TEXT PRIMARY KEY,
                name    TEXT NOT NULL,
                enabled INTEGER NOT NULL DEFAULT 1
            );

            CREATE TABLE IF NOT EXISTS results (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id    INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
                discipline_id TEXT    NOT NULL REFERENCES disciplines(id) ON DELETE CASCADE,
                value         REAL,
                points        INTEGER,
                updated_at    TEXT DEFAULT (datetime('now')),
                UNIQUE(student_id, discipline_id)
            );
        """)
        _seed_disciplines(conn)


def _seed_disciplines(conn: sqlite3.Connection):
    disciplines = [
        ("sprint",       "Sprint"),
        ("ausdauerlauf", "Ausdauerlauf"),
        ("weitsprung",   "Weitsprung"),
        ("ballwurf",     "Ballwurf"),
    ]
    conn.executemany(
        "INSERT OR IGNORE INTO disciplines(id, name) VALUES (?, ?)",
        disciplines,
    )
