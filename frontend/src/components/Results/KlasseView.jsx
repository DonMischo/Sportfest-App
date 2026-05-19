import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../../api.js";

const TABS = ["männlich", "weiblich"];

function useDebounce(fn, delay = 700) {
  const timerRef = useRef(null);
  const fnRef    = useRef(fn);
  fnRef.current  = fn;
  return useCallback((...args) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fnRef.current(...args), delay);
  }, [delay]);
}

function ResultCell({ student, discipline, resultMap, onSave }) {
  const key = `${student.id}-${discipline.id}`;
  const existing = resultMap[key];
  const [val, setVal] = useState(existing?.value_raw ?? "");
  const [status, setStatus] = useState("idle"); // idle | saving | saved | error

  useEffect(() => {
    const raw = existing?.value_raw ?? "";
    setVal(raw);
  }, [existing?.value_raw]);

  const save = useCallback(async (raw) => {
    if (!raw.trim()) {
      try {
        await api.deleteResult(student.id, discipline.id);
        onSave(student.id, discipline.id, null);
        setStatus("saved");
      } catch { setStatus("error"); }
      return;
    }
    setStatus("saving");
    try {
      const res = await api.upsertResult(student.id, discipline.id, raw);
      onSave(student.id, discipline.id, { value_raw: raw, points: res.points });
      setStatus("saved");
    } catch { setStatus("error"); }
  }, [student.id, discipline.id, onSave]);

  const debouncedSave = useDebounce(save);

  const handleChange = (e) => {
    const v = e.target.value;
    setVal(v);
    setStatus("idle");
    debouncedSave(v);
  };

  const indicator = status === "saving" ? "⏳"
    : status === "saved" ? "✓"
    : status === "error"  ? "✗"
    : "";

  const indicatorColor = status === "saved" ? "#16a34a"
    : status === "error" ? "var(--danger)"
    : "var(--muted)";

  return (
    <td>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <input
          type="text"
          value={val}
          onChange={handleChange}
          placeholder={discipline.id === "ausdauerlauf" ? "mm:ss" : "m oder s"}
          style={{ width: 90 }}
        />
        <span style={{ fontSize: 11, color: indicatorColor, minWidth: 14 }}>{indicator}</span>
        {existing?.points != null && (
          <span className="points" style={{ fontSize: 11 }}>{existing.points}P</span>
        )}
      </div>
    </td>
  );
}

export default function KlasseView({ klasse }) {
  const [activeTab, setActiveTab] = useState("männlich");
  const [students, setStudents]   = useState([]);
  const [disciplines, setDisciplines] = useState([]);
  const [resultMap, setResultMap] = useState({});
  const [loading, setLoading]     = useState(true);
  const [sortByPoints, setSortByPoints] = useState(false); // false = by Nummer, true = by Punkte desc

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getStudents({ klasse }),
      api.getDisciplines(),
      api.getResults({ klasse }),
    ]).then(([studs, discs, res]) => {
      setStudents(studs);
      setDisciplines(discs.filter((d) => d.enabled));
      const map = {};
      res.forEach((r) => {
        map[`${r.student_id}-${r.discipline_id}`] = {
          value_raw: r.value != null ? String(r.value) : "",
          points: r.points,
        };
      });
      setResultMap(map);
    }).finally(() => setLoading(false));
  }, [klasse]);

  const handleSave = useCallback((studentId, disciplineId, data) => {
    const key = `${studentId}-${disciplineId}`;
    setResultMap((prev) => {
      if (data === null) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: data };
    });
  }, []);

  if (loading) return <div className="spinner" />;

  const totalPoints = (student) => disciplines.reduce((sum, d) => {
    const r = resultMap[`${student.id}-${d.id}`];
    return sum + (r?.points ?? 0);
  }, 0);

  const filtered = students
    .filter((s) => s.geschlecht === activeTab)
    .slice()
    .sort((a, b) =>
      sortByPoints ? totalPoints(b) - totalPoints(a) : a.nummer - b.nummer
    );

  return (
    <div>
      <div className="page-title">Klasse {klasse}</div>

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t} className={`tab ${activeTab === t ? "active" : ""}`} onClick={() => setActiveTab(t)}>
            {t === "männlich" ? "👦 Männlich" : "👧 Weiblich"}
            <span style={{ marginLeft: 6, fontSize: 11, color: "var(--muted)" }}>
              ({students.filter((s) => s.geschlecht === t).length})
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="alert alert-info">Keine Schüler in dieser Gruppe.</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                {disciplines.map((d) => <th key={d.id}>{d.name}</th>)}
                <th>
                  <button
                    onClick={() => setSortByPoints((v) => !v)}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      font: "inherit", fontWeight: 700, fontSize: 11,
                      color: sortByPoints ? "var(--primary)" : "inherit",
                      display: "flex", alignItems: "center", gap: 4,
                      textTransform: "uppercase", letterSpacing: ".05em", padding: 0,
                    }}
                    title="Sortierung umschalten"
                  >
                    Gesamt {sortByPoints ? "▼" : "⇅"}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td style={{ color: "var(--muted)", width: 32 }}>{s.nummer}</td>
                  <td><strong>{s.nachname}</strong>, {s.vorname}</td>
                  {disciplines.map((d) => (
                    <ResultCell
                      key={d.id}
                      student={s}
                      discipline={d}
                      resultMap={resultMap}
                      onSave={handleSave}
                    />
                  ))}
                  <td className="points">{totalPoints(s) || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
