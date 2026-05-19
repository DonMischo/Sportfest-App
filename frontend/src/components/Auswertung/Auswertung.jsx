import { useState, useEffect } from "react";
import { api } from "../../api.js";

const TABS = ["männlich", "weiblich"];

function MedalIcon({ rank }) {
  if (rank === 1) return <span className="medal-1">🥇</span>;
  if (rank === 2) return <span className="medal-2">🥈</span>;
  if (rank === 3) return <span className="medal-3">🥉</span>;
  return null;
}

function GestaltRanking({ data }) {
  const [tab, setTab] = useState("männlich");

  const filtered = data.filter((g) => g.geschlecht === tab);

  return (
    <>
      <div className="tabs">
        {TABS.map((t) => (
          <button key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {t === "männlich" ? "👦 Männlich" : "👧 Weiblich"}
          </button>
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="alert alert-info">Keine Ergebnisse vorhanden.</div>
      )}
      {filtered.map((group) => (
        <div key={group.jahrgang} className="rank-group">
          <div className="rank-group-title">Jahrgang {group.jahrgang}</div>
          <div className="card" style={{ padding: 0 }}>
            <table className="rank-table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>#</th>
                  <th>Name</th>
                  <th>Klasse</th>
                  <th>Punkte gesamt</th>
                </tr>
              </thead>
              <tbody>
                {group.students.map((s, i) => (
                  <tr key={s.student_id}>
                    <td><MedalIcon rank={i + 1} /></td>
                    <td><strong>{s.nachname}</strong>, {s.vorname}</td>
                    <td>{s.klasse}</td>
                    <td className="points">{s.gesamt_punkte}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </>
  );
}

function DisziplinRanking({ data }) {
  const [tab, setTab] = useState("männlich");

  // Group by discipline
  const byDisziplin = {};
  data.filter((d) => d.geschlecht === tab).forEach((d) => {
    const key = d.discipline_id;
    byDisziplin[key] = byDisziplin[key] || { name: d.discipline_name, jahrgaenge: [] };
    byDisziplin[key].jahrgaenge.push(d);
  });

  return (
    <>
      <div className="tabs">
        {TABS.map((t) => (
          <button key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {t === "männlich" ? "👦 Männlich" : "👧 Weiblich"}
          </button>
        ))}
      </div>
      {Object.keys(byDisziplin).length === 0 && (
        <div className="alert alert-info">Keine Ergebnisse vorhanden.</div>
      )}
      {Object.entries(byDisziplin).map(([discId, disc]) => (
        <div key={discId} className="rank-group">
          <div className="rank-group-title">{disc.name}</div>
          {disc.jahrgaenge.map((jg) => (
            <div key={jg.jahrgang} style={{ marginBottom: 12 }}>
              <div className="section-title">Jahrgang {jg.jahrgang}</div>
              <div className="card" style={{ padding: 0 }}>
                <table className="rank-table">
                  <thead>
                    <tr>
                      <th style={{ width: 36 }}>#</th>
                      <th>Name</th>
                      <th>Klasse</th>
                      <th>Leistung</th>
                      <th>Punkte</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jg.students.map((s, i) => (
                      <tr key={s.student_id}>
                        <td><MedalIcon rank={i + 1} /></td>
                        <td><strong>{s.nachname}</strong>, {s.vorname}</td>
                        <td>{s.klasse}</td>
                        <td style={{ color: "var(--muted)" }}>
                          {s.value != null
                            ? (discId === "ausdauerlauf" || discId === "sprint"
                                ? `${s.value}s`
                                : `${s.value}m`)
                            : "—"}
                        </td>
                        <td className="points">{s.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ))}
    </>
  );
}

export default function Auswertung({ mode }) {
  const [data, setData]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const fetch = mode === "gesamt" ? api.getGesamt() : api.getDisziplin();
    fetch.then(setData).finally(() => setLoading(false));
  }, [mode]);

  if (loading) return <div className="spinner" />;

  return (
    <div>
      <div className="page-title">
        {mode === "gesamt" ? "Gesamt-Ranking" : "Disziplin-Ranking"}
      </div>
      {mode === "gesamt"
        ? <GestaltRanking data={data} />
        : <DisziplinRanking data={data} />}
    </div>
  );
}
