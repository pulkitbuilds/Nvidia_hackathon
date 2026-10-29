"use client";
import { useState, useEffect } from "react";

const post = async (url, body) => {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || "Request failed");
  return j;
};

function chunk(text, size = 800) {
  const out = []; let cur = "";
  for (const p of text.split(/\n{2,}/)) {
    if ((cur + p).length > size && cur) { out.push(cur.trim()); cur = ""; }
    cur += p + "\n\n";
    while (cur.length > size * 1.5) { out.push(cur.slice(0, size)); cur = cur.slice(size); }
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

async function embedAll(texts, type) {
  const out = [];
  for (let i = 0; i < texts.length; i += 32) {
    const { embeddings } = await post("/api/embed", { texts: texts.slice(i, i + 32), type });
    out.push(...embeddings.map((e) => e.map((x) => +x.toFixed(4))));
  }
  return out;
}

const cos = (a, b) => {
  let d = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return d / (Math.sqrt(na * nb) || 1);
};

export default function Home() {
  const [docs, setDocs] = useState([]);
  const [paste, setPaste] = useState("");
  const [tab, setTab] = useState("ask");
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ans, setAns] = useState(null);
  const [checks, setChecks] = useState(null);

  useEffect(() => { try { setDocs(JSON.parse(localStorage.getItem("evidentia") || "[]")); } catch {} }, []);
  const save = (d) => { setDocs(d); try { localStorage.setItem("evidentia", JSON.stringify(d)); } catch {} };

  const run = async (fn) => { setBusy(true); setErr(""); try { await fn(); } catch (e) { setErr(e.message); } setBusy(false); };

  const ingest = (name, text) => run(async () => {
    const parts = chunk(text);
    const embs = await embedAll(parts, "passage");
    save([...docs, { id: Date.now(), name, chunks: parts.map((t, i) => ({ text: t, emb: embs[i] })) }]);
  });

  const onFiles = async (e) => {
    const files = [...e.target.files];
    e.target.value = "";
    for (const f of files) await ingest(f.name, await f.text());
  };

  const all = docs.flatMap((d) => d.chunks.map((c) => ({ ...c, source: d.name })));
  const retrieve = (qe, k) =>
    all.map((c) => ({ ...c, score: cos(qe, c.emb) })).sort((a, b) => b.score - a.score).slice(0, k);

  const ask = () => run(async () => {
    if (!all.length) throw new Error("Add a source first");
    const [qe] = await embedAll([q], "query");
    const passages = retrieve(qe, 5).map((p, i) => ({ id: i + 1, text: p.text, source: p.source }));
    const { answer } = await post("/api/chat", { mode: "ask", question: q, passages });
    setAns({ answer, passages });
  });

  const verify = () => run(async () => {
    if (!all.length) throw new Error("Add a source first");
    const sents = (draft.match(/[^.!?\n]+[.!?]*/g) || []).map((s) => s.trim()).filter((s) => s.length > 25).slice(0, 20);
    if (!sents.length) throw new Error("Write a few sentences first");
    const embs = await embedAll(sents, "query");
    const claims = sents.map((claim, i) => ({
      claim, passages: retrieve(embs[i], 2).map((p, j) => ({ id: j + 1, text: p.text, source: p.source })),
    }));
    const { results } = await post("/api/chat", { mode: "verify", claims });
    setChecks(claims.map((c, i) => ({ ...c, ...(results.find((r) => r.i === i) || { verdict: "unsupported", note: "No verdict returned" }) })));
  });

  return (
    <>
      <header><h1>Evidentia<span>.</span></h1><p>Every claim, backed by your sources. Powered by NVIDIA.</p></header>
      <main>
        <aside className="stack">
          <div className="card">
            <h2>Sources</h2>
            <label className="btn">Upload .txt / .md<input type="file" accept=".txt,.md,.csv,.json" multiple hidden onChange={onFiles} /></label>
            <textarea style={{ marginTop: 10 }} placeholder="…or paste text here" value={paste} onChange={(e) => setPaste(e.target.value)} />
            <div className="row"><button className="ghost" disabled={busy || !paste.trim()} onClick={() => { ingest("Pasted text " + (docs.length + 1), paste); setPaste(""); }}>Add pasted text</button></div>
            <div style={{ marginTop: 12 }}>
              {docs.map((d) => (
                <div className="doc" key={d.id}><div>{d.name}<br /><small>{d.chunks.length} chunks</small></div>
                  <button className="ghost" onClick={() => save(docs.filter((x) => x.id !== d.id))}>✕</button></div>
              ))}
              {!docs.length && <small style={{ color: "var(--mut)" }}>No sources yet.</small>}
            </div>
          </div>
        </aside>

        <section className="card">
          <div className="tabs">
            <button className={tab === "ask" ? "on" : ""} onClick={() => setTab("ask")}>Ask</button>
            <button className={tab === "verify" ? "on" : ""} onClick={() => setTab("verify")}>Verify draft</button>
          </div>

          {tab === "ask" ? (
            <>
              <input type="text" placeholder="Ask a question about your sources…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && q.trim() && !busy && ask()} />
              <div className="row"><button disabled={busy || !q.trim()} onClick={ask}>{busy ? "Thinking…" : "Ask"}</button></div>
              {ans && (<>
                <div className="answer">{ans.answer}</div>
                <h2 style={{ marginTop: 18 }}>Evidence</h2>
                {ans.passages.map((p) => <div className="src" key={p.id}><b>[{p.id}] {p.source}</b><br />{p.text.slice(0, 320)}{p.text.length > 320 ? "…" : ""}</div>)}
              </>)}
            </>
          ) : (
            <>
              <textarea style={{ minHeight: 180 }} placeholder="Paste your draft. Each sentence is checked against your sources." value={draft} onChange={(e) => setDraft(e.target.value)} />
              <div className="row"><button disabled={busy || !draft.trim()} onClick={verify}>{busy ? "Checking…" : "Verify claims"}</button></div>
              {checks && checks.map((c, i) => (
                <div className="claim" key={i}>
                  <span className={"badge " + c.verdict}>{c.verdict}</span> {c.claim}
                  <div style={{ color: "var(--mut)", fontSize: 13, marginTop: 4 }}>{c.note}</div>
                  {c.passages[0] && <div className="src">{c.passages[0].source}: {c.passages[0].text.slice(0, 200)}…</div>}
                </div>
              ))}
            </>
          )}
          {err && <div className="err">{err}</div>}
        </section>
      </main>
    </>
  );
}
