import { chat } from "@/lib/nvidia";
export const maxDuration = 60;

const fmt = (ps) => ps.map((p) => `[${p.id}] (${p.source}) ${p.text}`).join("\n\n");

export async function POST(req) {
  try {
    const { mode, question, passages, claims } = await req.json();

    if (mode === "ask") {
      const answer = await chat([
        { role: "system", content:
          "You are Evidentia, an evidence-first assistant. Answer ONLY using the numbered passages. " +
          "Cite every statement with its passage number like [1]. If the passages do not contain the answer, " +
          "say exactly what is missing instead of guessing. Be concise." },
        { role: "user", content: `Passages:\n${fmt(passages)}\n\nQuestion: ${question}` },
      ]);
      return Response.json({ answer });
    }

    if (mode === "verify") {
      const body = claims.map((c, i) => `CLAIM ${i}: ${c.claim}\nEVIDENCE:\n${fmt(c.passages)}`).join("\n\n---\n\n");
      const raw = await chat([
        { role: "system", content:
          "You fact-check claims strictly against the provided evidence. For each claim output a verdict: " +
          "'supported', 'partial', or 'unsupported' (also use 'unsupported' if evidence is silent). " +
          'Reply with ONLY a JSON array: [{"i":0,"verdict":"supported","cite":[1],"note":"short reason"}]' },
        { role: "user", content: body },
      ]);
      const m = raw.match(/\[[\s\S]*\]/);
      return Response.json({ results: m ? JSON.parse(m[0]) : [] });
    }

    return Response.json({ error: "bad mode" }, { status: 400 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
