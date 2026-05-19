from fastapi import APIRouter
from database import get_conn

router = APIRouter(prefix="/auswertung", tags=["auswertung"])

TOP_N = 3


def _top_n(rows: list[dict], n: int = TOP_N) -> list[dict]:
    seen = set()
    result = []
    for row in rows:
        sid = row["student_id"]
        if sid not in seen:
            seen.add(sid)
            result.append(row)
        if len(result) >= n:
            break
    return result


@router.get("/gesamt")
def gesamt_auswertung():
    """
    Top 3 per Jahrgang per Geschlecht, ranked by total points across all
    enabled disciplines.
    """
    with get_conn() as conn:
        rows = conn.execute("""
            SELECT
                s.id          AS student_id,
                s.nachname,
                s.vorname,
                s.klasse,
                s.jahrgang,
                s.geschlecht,
                s.nummer,
                SUM(r.points) AS gesamt_punkte
            FROM students s
            JOIN results r ON r.student_id = s.id
            JOIN disciplines d ON d.id = r.discipline_id AND d.enabled = 1
            WHERE r.points IS NOT NULL
            GROUP BY s.id
            ORDER BY s.jahrgang, s.geschlecht, gesamt_punkte DESC
        """).fetchall()

    rows = [dict(r) for r in rows]

    # Group by (jahrgang, geschlecht) → top 3
    result: dict[str, dict] = {}
    for row in rows:
        key = f"{row['jahrgang']}-{row['geschlecht']}"
        result.setdefault(key, {"jahrgang": row["jahrgang"], "geschlecht": row["geschlecht"], "students": []})
        if len(result[key]["students"]) < TOP_N:
            result[key]["students"].append(row)

    return sorted(result.values(), key=lambda x: (x["jahrgang"], x["geschlecht"]))


@router.get("/disziplin")
def disziplin_auswertung():
    """
    Top 3 per discipline per Jahrgang per Geschlecht.
    """
    with get_conn() as conn:
        rows = conn.execute("""
            SELECT
                r.discipline_id,
                d.name         AS discipline_name,
                s.id           AS student_id,
                s.nachname,
                s.vorname,
                s.klasse,
                s.jahrgang,
                s.geschlecht,
                s.nummer,
                r.value,
                r.points
            FROM results r
            JOIN students s ON s.id = r.student_id
            JOIN disciplines d ON d.id = r.discipline_id AND d.enabled = 1
            WHERE r.points IS NOT NULL
            ORDER BY r.discipline_id, s.jahrgang, s.geschlecht, r.points DESC
        """).fetchall()

    rows = [dict(r) for r in rows]

    result: dict[str, dict] = {}
    for row in rows:
        key = f"{row['discipline_id']}-{row['jahrgang']}-{row['geschlecht']}"
        result.setdefault(key, {
            "discipline_id":   row["discipline_id"],
            "discipline_name": row["discipline_name"],
            "jahrgang":        row["jahrgang"],
            "geschlecht":      row["geschlecht"],
            "students":        [],
        })
        if len(result[key]["students"]) < TOP_N:
            result[key]["students"].append(row)

    return sorted(
        result.values(),
        key=lambda x: (x["discipline_id"], x["jahrgang"], x["geschlecht"]),
    )
