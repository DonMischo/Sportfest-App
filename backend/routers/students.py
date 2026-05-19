import csv
import io
import re
from fastapi import APIRouter, UploadFile, File, HTTPException
from database import get_conn

router = APIRouter(prefix="/students", tags=["students"])


def _parse_jahrgang(klasse: str) -> int:
    m = re.match(r"(\d+)", klasse)
    if not m:
        raise ValueError(f"Cannot parse Jahrgang from '{klasse}'")
    return int(m.group(1))


def _normalise_geschlecht(raw: str) -> str:
    raw = raw.strip().lower()
    if raw in ("männlich", "maennlich", "m", "male", "junge"):
        return "männlich"
    if raw in ("weiblich", "w", "female", "mädchen", "maedchen"):
        return "weiblich"
    raise ValueError(f"Unknown Geschlecht value: '{raw}'")


@router.post("/import")
async def import_students(file: UploadFile = File(...)):
    content = await file.read()
    text = content.decode("utf-8-sig")  # handle BOM

    dialect = csv.Sniffer().sniff(text[:1024], delimiters=",;\t")
    reader = csv.DictReader(io.StringIO(text), dialect=dialect)

    rows = []
    errors = []
    for i, row in enumerate(reader, start=2):
        try:
            # Flexible column name matching
            nummer    = int(row.get("#") or row.get("Nummer") or row.get("nummer") or 0)
            nachname  = (row.get("Nachname") or row.get("nachname") or "").strip()
            vorname   = (row.get("Vorname")  or row.get("vorname")  or "").strip()
            klasse    = (row.get("Klasse")   or row.get("klasse")   or "").strip()
            geschlecht_raw = (
                row.get("Geschlecht") or row.get("geschlecht") or ""
            ).strip()

            if not nachname or not klasse or not geschlecht_raw:
                errors.append(f"Row {i}: missing required fields")
                continue

            geschlecht = _normalise_geschlecht(geschlecht_raw)
            jahrgang   = _parse_jahrgang(klasse)

            rows.append((nummer, nachname, vorname, klasse, jahrgang, geschlecht))
        except ValueError as e:
            errors.append(f"Row {i}: {e}")

    if not rows:
        raise HTTPException(400, detail={"message": "No valid rows found", "errors": errors})

    with get_conn() as conn:
        conn.execute("DELETE FROM students")
        conn.executemany(
            "INSERT INTO students(nummer, nachname, vorname, klasse, jahrgang, geschlecht) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            rows,
        )

    return {"imported": len(rows), "errors": errors}


@router.get("")
def list_students(klasse: str | None = None, jahrgang: int | None = None, geschlecht: str | None = None):
    with get_conn() as conn:
        query = "SELECT * FROM students WHERE 1=1"
        params: list = []
        if klasse:
            query += " AND klasse = ?"
            params.append(klasse)
        if jahrgang:
            query += " AND jahrgang = ?"
            params.append(jahrgang)
        if geschlecht:
            query += " AND geschlecht = ?"
            params.append(geschlecht)
        query += " ORDER BY jahrgang, klasse, nachname, vorname"
        rows = conn.execute(query, params).fetchall()
    return [dict(r) for r in rows]


@router.get("/klassen")
def list_klassen():
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT DISTINCT klasse, jahrgang FROM students ORDER BY jahrgang, klasse"
        ).fetchall()
    return [dict(r) for r in rows]


@router.get("/jahrgaenge")
def list_jahrgaenge():
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT DISTINCT jahrgang FROM students ORDER BY jahrgang"
        ).fetchall()
    return [r["jahrgang"] for r in rows]
