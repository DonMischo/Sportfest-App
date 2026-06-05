import os
from contextlib import contextmanager

import pg8000.dbapi as pg

_PG_HOST = os.getenv("SPORTFEST_PG_HOST", "127.0.0.1")
_PG_PORT = int(os.getenv("SPORTFEST_PG_PORT", "5433"))
_PG_USER = os.getenv("SPORTFEST_PG_USER", "sportfest")
_PG_PASS = os.getenv("SPORTFEST_PG_PASS", "sportfest")
_PG_DB   = os.getenv("SPORTFEST_PG_DB",   "sportfest")


def _row_to_dict(cursor, row):
    return {col[0]: val for col, val in zip(cursor.description, row)}


class _PgConn:
    """Thin pg8000 wrapper that mimics sqlite3.Connection's execute() API."""

    def __init__(self, raw):
        self._conn   = raw
        self._cursor = raw.cursor()

    def execute(self, sql, params=None):
        self._cursor.execute(sql, params or [])
        return self

    def executemany(self, sql, params_list):
        for params in params_list:
            self._cursor.execute(sql, params)
        return self

    def fetchall(self):
        rows = self._cursor.fetchall()
        if rows and self._cursor.description:
            return [_row_to_dict(self._cursor, r) for r in rows]
        return rows or []

    def fetchone(self):
        row = self._cursor.fetchone()
        if row and self._cursor.description:
            return _row_to_dict(self._cursor, row)
        return row

    def commit(self):
        self._conn.commit()

    def rollback(self):
        self._conn.rollback()

    def close(self):
        self._cursor.close()
        self._conn.close()


@contextmanager
def get_conn():
    raw = pg.connect(
        host=_PG_HOST,
        port=_PG_PORT,
        user=_PG_USER,
        password=_PG_PASS,
        database=_PG_DB,
    )
    conn = _PgConn(raw)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    with get_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS students (
                id          SERIAL PRIMARY KEY,
                nummer      INTEGER,
                nachname    TEXT NOT NULL,
                vorname     TEXT NOT NULL,
                klasse      TEXT NOT NULL,
                jahrgang    INTEGER NOT NULL,
                geschlecht  TEXT NOT NULL CHECK(geschlecht IN ('männlich','weiblich'))
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS disciplines (
                id      TEXT PRIMARY KEY,
                name    TEXT NOT NULL,
                enabled INTEGER NOT NULL DEFAULT 1
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS results (
                id            SERIAL PRIMARY KEY,
                student_id    INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
                discipline_id TEXT    NOT NULL REFERENCES disciplines(id) ON DELETE CASCADE,
                value         REAL,
                points        INTEGER,
                updated_at    TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(student_id, discipline_id)
            )
        """)
        conn.executemany(
            "INSERT INTO disciplines(id, name) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            [("sprint", "Sprint"), ("ausdauerlauf", "Ausdauerlauf"),
             ("weitsprung", "Weitsprung"), ("ballwurf", "Ballwurf")],
        )
