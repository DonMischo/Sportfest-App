"""
DLV Nationale Punktwertung scoring formulas (PDF page 1):

  Lauf (h):         P = floor( (D / (M + Zuschlag) - a) / c )
  Lauf (e):         P = floor( (D / M             - a) / c )
  Sprung+Stoß/Wurf: P = floor( (sqrt(M)           - a) / c )

  D        = race distance in metres
  M        = measured time (seconds) or distance/height (metres)
  Zuschlag = hand-timing addition: ≤300m → 0.24, 301–400m → 0.14, >400m → 0.0
"""

import math


# ---------------------------------------------------------------------------
# Coefficients  (a, c)  by gender and event key
# ---------------------------------------------------------------------------
COEFFICIENTS = {
    "männlich": {
        "50m":                {"a": 3.79000, "c": 0.00690},
        "75m":                {"a": 4.10000, "c": 0.00664},
        "100m":               {"a": 4.34100, "c": 0.00676},
        "400m":               {"a": 2.96700, "c": 0.00716},
        "800m":               {"a": 2.32500, "c": 0.00644},
        "1000m":              {"a": 2.15800, "c": 0.00600},
        "Weitsprung":         {"a": 1.15028, "c": 0.00219},
        "200g Ballwurf":      {"a": 1.93600, "c": 0.01240},
        "80g Schlagballwurf": {"a": 2.80000, "c": 0.01100},
    },
    "weiblich": {
        "50m":                {"a": 3.64800, "c": 0.00660},
        "75m":                {"a": 3.99800, "c": 0.00660},
        "100m":               {"a": 4.00620, "c": 0.00656},
        "400m":               {"a": 2.81000, "c": 0.00716},
        "800m":               {"a": 2.02320, "c": 0.00647},
        "Weitsprung":         {"a": 1.09350, "c": 0.00208},
        "200g Ballwurf":      {"a": 1.41490, "c": 0.01039},
        "80g Schlagballwurf": {"a": 2.02320, "c": 0.00874},
    },
}


def _zuschlag(distance_m: int) -> float:
    if distance_m <= 300:
        return 0.24
    if distance_m <= 400:
        return 0.14
    return 0.0


def _sprint_key(klasse_nr: int) -> str:
    if klasse_nr <= 5:
        return "50m"
    if klasse_nr <= 8:
        return "75m"
    return "100m"


def _sprint_distance(klasse_nr: int) -> int:
    if klasse_nr <= 5:
        return 50
    if klasse_nr <= 8:
        return 75
    return 100


def _ausdauer_distance(klasse_nr: int, geschlecht: str) -> int:
    if klasse_nr <= 2:
        return 400
    if klasse_nr <= 6:
        return 800
    # classes 7-9
    return 800 if geschlecht == "weiblich" else 1000


def _ballwurf_key(klasse_nr: int) -> str:
    return "80g Schlagballwurf" if klasse_nr <= 6 else "200g Ballwurf"


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def calculate_points(discipline_id: str, value: float, klasse: str, geschlecht: str) -> int | None:
    """Return integer points or None if calculation is impossible."""
    try:
        klasse_nr = int("".join(c for c in klasse if c.isdigit()))
    except ValueError:
        return None

    try:
        if discipline_id == "sprint":
            key = _sprint_key(klasse_nr)
            dist = _sprint_distance(klasse_nr)
            coeff = COEFFICIENTS[geschlecht][key]
            z = _zuschlag(dist)
            p = (dist / (value + z) - coeff["a"]) / coeff["c"]

        elif discipline_id == "ausdauerlauf":
            dist = _ausdauer_distance(klasse_nr, geschlecht)
            key = f"{dist}m"
            coeff = COEFFICIENTS[geschlecht][key]
            z = _zuschlag(dist)
            p = (dist / (value + z) - coeff["a"]) / coeff["c"]

        elif discipline_id == "weitsprung":
            coeff = COEFFICIENTS[geschlecht]["Weitsprung"]
            p = (math.sqrt(value) - coeff["a"]) / coeff["c"]

        elif discipline_id == "ballwurf":
            key = _ballwurf_key(klasse_nr)
            coeff = COEFFICIENTS[geschlecht][key]
            p = (math.sqrt(value) - coeff["a"]) / coeff["c"]

        else:
            return None

        return max(0, math.floor(p))

    except (KeyError, ZeroDivisionError, ValueError):
        return None


def parse_time(raw: str) -> float | None:
    """Accept '195.4' (seconds) or '3:15.4' (mm:ss) → seconds as float."""
    raw = raw.strip()
    if ":" in raw:
        parts = raw.split(":", 1)
        try:
            return int(parts[0]) * 60 + float(parts[1])
        except ValueError:
            return None
    try:
        return float(raw)
    except ValueError:
        return None
