import sys
import os
from pathlib import Path
from contextlib import asynccontextmanager

# PyInstaller: add _MEIPASS to sys.path so local modules are importable
_FROZEN  = getattr(sys, "frozen", False)
_MEIPASS = Path(sys._MEIPASS) if _FROZEN else Path(__file__).parent

if _FROZEN:
    sys.path.insert(0, str(_MEIPASS))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import init_db
from routers import students, disciplines, results, auswertung

# Port and DB path are injected by Electron via environment variables
PORT = int(os.environ.get("SPORTFEST_PORT", 8080))


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
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

# Serve the bundled React build (present in the packaged binary)
_static = _MEIPASS / "static"
if _static.exists():
    app.mount("/", StaticFiles(directory=str(_static), html=True), name="static")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=PORT)
