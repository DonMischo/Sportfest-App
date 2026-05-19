# 🏃 Sportfest DLV

Auswertungssoftware für Schul-Sportfeste auf Basis der **DLV Nationalen Punktwertung**.

Erfasst Leistungen in Sprint, Ausdauerlauf, Weitsprung und Ballwurf, berechnet automatisch die Punktzahlen nach den offiziellen DLV-Formeln und erstellt Ranglisten nach Jahrgang und Disziplin.

---

## Features

- **Schülerliste importieren** — CSV/TSV-Upload mit `#`, `Nachname`, `Vorname`, `Klasse`, `Geschlecht`
- **Disziplinen wählen** — Sprint, Ausdauerlauf, Weitsprung, Ballwurf per Checkbox aktivierbar
- **Klassenansicht** — Ergebnisse je Klasse erfassen, getrennt nach männlich/weiblich, auto-gespeichert
- **Sortierung** — Tabelle per Klick nach Gesamtpunkten sortieren
- **Auswertung Gesamt** — Top 3 je Jahrgang und Geschlecht
- **Auswertung Disziplin** — Top 3 je Disziplin, umschaltbar zwischen *Nach Jahrgang* und *Gesamt*
- **DLV-Formeln** korrekt implementiert (Lauf h, Sprung/Stoß/Wurf) mit automatischem Zuschlag und klassenspezifischen Distanzen/Gewichten
- **SQLite-Datenbank** — keine externe Datenbank nötig
- **Windows-Build** — einzelne `.exe` via PyInstaller

---

## Scoring-Formeln (DLV Nationale Punktwertung)

| Typ | Formel |
|-----|--------|
| Lauf (Handzeit) | `P = floor( (D / (M + Zuschlag) − a) / c )` |
| Sprung / Stoß / Wurf | `P = floor( (√M − a) / c )` |

`D` = Streckenlänge in Metern · `M` = Messwert in Sekunden bzw. Metern · `a`, `c` = geschlechtsspezifische Koeffizienten aus der DLV-Tabelle

---

## Klassenspezifische Distanzen & Gewichte

| Disziplin | Klassen | Variante |
|-----------|---------|----------|
| Sprint | 1–5 | 50 m |
| Sprint | 6–8 | 75 m |
| Sprint | 9 | 100 m |
| Ausdauerlauf | 1–2 | 400 m |
| Ausdauerlauf | 3–6 | 800 m |
| Ausdauerlauf | 7–9 (w) | 800 m |
| Ausdauerlauf | 7–9 (m) | 1 000 m |
| Ballwurf | 1–6 | 80 g Schlagball |
| Ballwurf | 7–9 | 200 g Ball |

---

## Schnellstart (Entwicklung)

```bat
REM Beide Server starten
dev.bat
```

Oder manuell:

```bat
REM Terminal 1 — Backend
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --port 8080

REM Terminal 2 — Frontend
cd frontend
npm install
npm run dev
```

Frontend läuft auf `http://localhost:5173` (oder nächster freier Port), Backend auf `http://127.0.0.1:8080`.

---

## Windows-Build (.exe)

```bat
build.bat
```

Erzeugt `dist\Sportfest.exe` — standalone, keine Installation nötig.

---

## Release

```bat
release.bat
```

Wählt Major / Minor / Patch, baut das Frontend, setzt ein Git-Tag und pusht zu GitHub.

---

## CSV-Format Schülerliste

```
#	Nachname	Vorname	Klasse	Geschlecht
1	Mustermann	Max	7a	männlich
2	Musterfrau	Lena	7a	weiblich
```

Trennzeichen: Tab oder Komma. `Geschlecht` akzeptiert `männlich`/`weiblich` sowie `m`/`w`.

---

## Tech Stack

| Schicht | Technologie |
|---------|-------------|
| Backend | Python 3.11+, FastAPI, SQLite |
| Frontend | React 18, Vite |
| Build | PyInstaller |
| Icons | Pillow |

---

## Unterstützen

Wenn dir dieses Projekt gefällt oder du die Weiterentwicklung unterstützen möchtest:

[![Ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/DonMischo)

---

## Lizenz

MIT
