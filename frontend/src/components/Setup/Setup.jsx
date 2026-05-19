import { useState, useEffect } from "react";
import { api } from "../../api.js";

export default function Setup({ onImport }) {
  const [disciplines, setDisciplines] = useState([]);
  const [uploading, setUploading]     = useState(false);
  const [msg, setMsg]                 = useState(null);

  useEffect(() => {
    api.getDisciplines().then(setDisciplines).catch(() => {});
  }, []);

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true);
    setMsg(null);
    try {
      const res = await api.importStudents(file);
      setMsg({ type: "success", text: `${res.imported} Schüler importiert.${res.errors.length ? ` (${res.errors.length} Fehler)` : ""}` });
      onImport();
    } catch (e) {
      setMsg({ type: "error", text: `Fehler: ${e.message}` });
    } finally {
      setUploading(false);
    }
  };

  const toggleDiscipline = async (id, current) => {
    const next = !current;
    await api.setEnabled(id, next);
    setDisciplines((ds) => ds.map((d) => d.id === id ? { ...d, enabled: next ? 1 : 0 } : d));
  };

  return (
    <div>
      <div className="page-title">Setup</div>

      {/* Upload */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="section-title">Schülerliste importieren</div>
        <p style={{ color: "var(--muted)", marginBottom: 14, lineHeight: 1.6 }}>
          CSV oder TSV mit Spalten: <code>#&nbsp; Nachname&nbsp; Vorname&nbsp; Klasse&nbsp; Geschlecht</code><br />
          Geschlecht: <code>männlich</code> / <code>weiblich</code> (auch <code>m</code>/<code>w</code> möglich).<br />
          <strong>Achtung:</strong> Ein erneuter Import überschreibt alle vorhandenen Schüler.
        </p>

        {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

        <label
          className="upload-zone"
          style={{ display: "block" }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
        >
          {uploading ? (
            <div className="spinner" />
          ) : (
            <>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📂</div>
              <div>Datei hier ablegen oder klicken</div>
              <input
                type="file"
                accept=".csv,.tsv,.txt"
                style={{ display: "none" }}
                onChange={(e) => handleFile(e.target.files[0])}
              />
            </>
          )}
        </label>
      </div>

      {/* Disciplines */}
      <div className="card">
        <div className="section-title">Disziplinen auswählen</div>
        <div className="check-list">
          {disciplines.map((d) => (
            <label key={d.id} className="check-item">
              <input
                type="checkbox"
                checked={!!d.enabled}
                onChange={() => toggleDiscipline(d.id, !!d.enabled)}
              />
              {d.name}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
