import sys
import os
import threading
import webbrowser
from pathlib import Path
from contextlib import asynccontextmanager

# When bundled by PyInstaller, sys._MEIPASS is the temp folder with all files.
# We need it on sys.path so local modules are importable, and we use it to
# locate the bundled static folder and to set the DB next to the .exe.
_FROZEN = getattr(sys, "frozen", False)
_MEIPASS = Path(sys._MEIPASS) if _FROZEN else Path(__file__).parent

if _FROZEN:
    sys.path.insert(0, str(_MEIPASS))
    # Store the DB next to the .exe, not inside the temp extraction folder
    os.environ.setdefault("SPORTFEST_DB", str(Path(sys.executable).parent / "sportfest.db"))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import init_db
from routers import students, disciplines, results, auswertung

PORT = 8080


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    if _FROZEN:
        # Open the browser once the server is ready
        threading.Timer(1.0, lambda: webbrowser.open(f"http://127.0.0.1:{PORT}")).start()
    yield


app = FastAPI(title="Sportfest", lifespan=lifespan)

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

# Serve the bundled React build (present in the packaged .exe)
_static = _MEIPASS / "static"
if _static.exists():
    app.mount("/", StaticFiles(directory=str(_static), html=True), name="static")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=PORT)
