import sys
import os
from pathlib import Path

# When bundled by PyInstaller, add the _MEIPASS dir to sys.path so that
# local modules (database, scoring, routers) are importable.
if getattr(sys, "frozen", False):
    sys.path.insert(0, sys._MEIPASS)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import init_db
from routers import students, disciplines, results, auswertung

app = FastAPI(title="Sportfest")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(students.router)
app.include_router(disciplines.router)
app.include_router(results.router)
app.include_router(auswertung.router)

# Serve the bundled React build (only present in the packaged .exe)
_static = Path(__file__).parent / "static"
if _static.exists():
    app.mount("/", StaticFiles(directory=str(_static), html=True), name="static")


@app.on_event("startup")
def on_startup():
    init_db()
