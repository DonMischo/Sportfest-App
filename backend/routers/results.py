from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import get_conn
from scoring import calculate_points, parse_time

router = APIRouter(prefix="/results", tags=["results"])


class ResultIn(BaseModel):
    value_raw: str  # raw input: seconds float or mm:ss


@router.put("/{student_id}/{discipline_id}")
def upsert_result(student_id: int, discipline_id: str, body: ResultIn):
    value = parse_time(body.value_raw)
    if value is None:
        raise HTTPException(400, "Invalid value format")

    with get_conn() as conn:
        student = conn.execute(
            "SELECT klasse, geschlecht FROM students WHERE id = ?", (student_id,)
        ).fetchone()
        if not student:
            raise HTTPException(404, "Student not found")

        points = calculate_points(discipline_id, value, student["klasse"], student["geschlecht"])

        conn.execute(
            """
            INSERT INTO results(student_id, discipline_id, value, points)
                VALUES (?, ?, ?, ?)
            ON CONFLICT(student_id, discipline_id)
                DO UPDATE SET value = excluded.value,
                              points = excluded.points,
                              updated_at = datetime('now')
            """,
            (student_id, discipline_id, value, points),
        )

    return {"value": value, "points": points}


@router.delete("/{student_id}/{discipline_id}")
def delete_result(student_id: int, discipline_id: str):
    with get_conn() as conn:
        conn.execute(
            "DELETE FROM results WHERE student_id = ? AND discipline_id = ?",
            (student_id, discipline_id),
        )
    return {"ok": True}


@router.get("")
def get_results(klasse: str | None = None, jahrgang: int | None = None):
    with get_conn() as conn:
        query = """
            SELECT r.student_id, r.discipline_id, r.value, r.points,
                   s.nachname, s.vorname, s.klasse, s.jahrgang, s.geschlecht, s.nummer
            FROM results r
            JOIN students s ON s.id = r.student_id
            WHERE 1=1
        """
        params: list = []
        if klasse:
            query += " AND s.klasse = ?"
            params.append(klasse)
        if jahrgang:
            query += " AND s.jahrgang = ?"
            params.append(jahrgang)
        rows = conn.execute(query, params).fetchall()
    return [dict(r) for r in rows]
