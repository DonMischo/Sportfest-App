import { useState, useEffect } from "react";
import { api } from "../../api.js";

const TABS = ["männlich", "weiblich"];

function MedalIcon({ rank }) {
  if (rank === 1) return <span className="medal-1">🥇</span>;
  if (rank === 2) return <span className="medal-2">🥈</span>;
  if (rank === 3) return <span className="medal-3">🥉</span>;
  return null;
}

function Toggle({ value, onChange }) {
  return (
    <div className="toggle-wrap">
      <button
        className={`toggle-btn ${!value ? "active" : ""}`}
        onClick={() => onChange(false)}
      >
        Nach Jahrgang
      </button>
      <button
        className={`toggle-btn ${value ? "active" : ""}`}
        onClick={() => onChange(true)}
      >
        Gesamt
      </button>
    </div>
  );
}

function DisziplinTable({ group, discId }) {
  return (
    <div className="card" style={{ padding: 0 }}>
      <table className="rank-table">
        <thead>
          <tr>
            <th style={{ width: 36 }}>#</th>
            <th>Name</th>
            <th>Klasse</th>
            {group.jahrgang != null && <th>Jahrgang</th>}
            <th>Leistung</th>
            <th>Punkte</th>
          </tr>
        </thead>
        <tbody>
          {group.students.map((s, i) => (
            <tr key={s.student_id}>
              <td><MedalIcon rank={i + 1} /></td>
              <td><strong>{s.nachname}</strong>, {s.vorname}</td>
              <td>{s.klasse}</td>
              {group.jahrgang != null && <td>{s.jahrgang}</td>}
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
  );
}

function GesamtRanking({ data }) {
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
      {filtered.length === 0 && <div className="alert alert-info">Keine Ergebnisse vorhanden.</div>}
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

function DisziplinRanking({ data, overall }) {
  const [tab, setTab] = useState("männlich");

  // Group by discipline
  const byDisziplin = {};
  data.filter((d) => d.geschlecht === tab).forEach((d) => {
    byDisziplin[d.discipline_id] = byDisziplin[d.discipline_id] || {
      name: d.discipline_name,
      groups: [],
    };
    byDisziplin[d.discipline_id].groups.push(d);
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
          {overall ? (
            <DisziplinTable group={disc.groups[0]} discId={discId} />
          ) : (
            disc.groups.map((g) => (
              <div key={g.jahrgang} style={{ marginBottom: 12 }}>
                <div className="section-title">Jahrgang {g.jahrgang}</div>
                <DisziplinTable group={g} discId={discId} />
              </div>
            ))
          )}
        </div>
      ))}
    </>
  );
}

export default function Auswertung({ mode }) {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [overall, setOverall] = useState(false);

  useEffect(() => {
    setLoading(true);
    const req = mode === "gesamt"
      ? api.getGesamt()
      : api.getDisziplin(overall);
    req.then(setData).finally(() => setLoading(false));
  }, [mode, overall]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
        <div className="page-title" style={{ marginBottom: 0 }}>
          {mode === "gesamt" ? "Gesamt-Ranking" : "Disziplin-Ranking"}
        </div>
        {mode === "disziplin" && (
          <Toggle value={overall} onChange={setOverall} />
        )}
      </div>

      {loading
        ? <div className="spinner" />
        : mode === "gesamt"
          ? <GesamtRanking data={data} />
          : <DisziplinRanking data={data} overall={overall} />}
    </div>
  );
}
