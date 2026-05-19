from fastapi import APIRouter
from database import get_conn

router = APIRouter(prefix="/disciplines", tags=["disciplines"])


@router.get("")
def list_disciplines():
    with get_conn() as conn:
        rows = conn.execute("SELECT * FROM disciplines ORDER BY id").fetchall()
    return [dict(r) for r in rows]


@router.put("/{discipline_id}/enabled")
def set_enabled(discipline_id: str, enabled: bool):
    with get_conn() as conn:
        conn.execute(
            "UPDATE disciplines SET enabled = ? WHERE id = ?",
            (1 if enabled else 0, discipline_id),
        )
    return {"ok": True}
