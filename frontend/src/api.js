const BASE = "";

async function req(method, path, body) {
  const opts = { method, headers: {} };
  if (body instanceof FormData) {
    opts.body = body;
  } else if (body !== undefined) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(BASE + path, opts);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text);
  }
  return res.json();
}

export const api = {
  // Students
  importStudents: (file) => {
    const fd = new FormData();
    fd.append("file", file);
    return req("POST", "/students/import", fd);
  },
  getStudents:   (params = {}) => req("GET", "/students?" + new URLSearchParams(params)),
  getKlassen:    ()             => req("GET", "/students/klassen"),
  getJahrgaenge: ()             => req("GET", "/students/jahrgaenge"),

  // Disciplines
  getDisciplines:   ()                       => req("GET",  "/disciplines"),
  setEnabled:       (id, enabled)            => req("PUT",  `/disciplines/${id}/enabled?enabled=${enabled}`),

  // Results
  upsertResult:  (studentId, disciplineId, value_raw) =>
    req("PUT", `/results/${studentId}/${disciplineId}`, { value_raw }),
  deleteResult:  (studentId, disciplineId) =>
    req("DELETE", `/results/${studentId}/${disciplineId}`),
  getResults:    (params = {}) => req("GET", "/results?" + new URLSearchParams(params)),

  // Auswertung
  getGesamt:     () => req("GET", "/auswertung/gesamt"),
  getDisziplin:  () => req("GET", "/auswertung/disziplin"),
};
