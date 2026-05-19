import { useState, useEffect } from "react";
import { api } from "./api.js";
import Setup from "./components/Setup/Setup.jsx";
import KlasseView from "./components/Results/KlasseView.jsx";
import Auswertung from "./components/Auswertung/Auswertung.jsx";

export default function App() {
  const [view, setView]           = useState({ type: "setup" });
  const [klassen, setKlassen]     = useState([]);
  const [jahrgaenge, setJahrgaenge] = useState([]);

  const refresh = () => {
    api.getKlassen().then(setKlassen).catch(() => {});
    api.getJahrgaenge().then(setJahrgaenge).catch(() => {});
  };

  useEffect(refresh, []);

  // Group klassen by jahrgang for sidebar
  const byJahrgang = klassen.reduce((acc, k) => {
    const j = k.jahrgang;
    (acc[j] = acc[j] || []).push(k.klasse);
    return acc;
  }, {});

  const isActive = (type, payload) =>
    view.type === type && view.payload === payload;

  return (
    <div className="layout">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">🏃 Sportfest</div>

        <div className="sidebar-section">
          <div className="sidebar-section-title">Setup</div>
          <button
            className={`sidebar-item ${view.type === "setup" ? "active" : ""}`}
            onClick={() => setView({ type: "setup" })}
          >
            Schüler &amp; Disziplinen
          </button>
        </div>

        <div className="sidebar-section" style={{ flex: 1 }}>
          <div className="sidebar-section-title">Klassen</div>
          {Object.keys(byJahrgang).sort((a, b) => +a - +b).map((jg) => (
            <div key={jg} className="sidebar-klasse-group">
              <div className="sidebar-klasse-label">Jahrgang {jg}</div>
              {byJahrgang[jg].sort().map((kl) => (
                <button
                  key={kl}
                  className={`sidebar-item ${isActive("klasse", kl) ? "active" : ""}`}
                  onClick={() => setView({ type: "klasse", payload: kl })}
                >
                  {kl}
                </button>
              ))}
            </div>
          ))}
          {klassen.length === 0 && (
            <div style={{ padding: "8px 18px", color: "var(--muted)", fontSize: 12 }}>
              Keine Schüler geladen
            </div>
          )}
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-title">Auswertung</div>
          <button
            className={`sidebar-item ${isActive("auswertung", "gesamt") ? "active" : ""}`}
            onClick={() => setView({ type: "auswertung", payload: "gesamt" })}
          >
            Gesamt-Ranking
          </button>
          <button
            className={`sidebar-item ${isActive("auswertung", "disziplin") ? "active" : ""}`}
            onClick={() => setView({ type: "auswertung", payload: "disziplin" })}
          >
            Disziplin-Ranking
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="main">
        {view.type === "setup" && <Setup onImport={refresh} />}
        {view.type === "klasse" && <KlasseView klasse={view.payload} />}
        {view.type === "auswertung" && <Auswertung mode={view.payload} />}
      </main>
    </div>
  );
}
