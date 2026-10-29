const BASE = "https://integrate.api.nvidia.com/v1";

async function call(path, body) {
  const key = process.env.NVIDIA_API_KEY;
  if (!key) throw new Error("NVIDIA_API_KEY is not set");
  const r = await fetch(BASE + path, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`NVIDIA ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return r.json();
}

// type: "passage" for documents, "query" for questions
export async function embed(input, type) {
  const j = await call("/embeddings", {
    model: process.env.NVIDIA_EMBED_MODEL || "nvidia/nv-embedqa-e5-v5",
    input, input_type: type, encoding_format: "float", truncate: "END",
  });
  return j.data.map((d) => d.embedding);
}

export async function chat(messages) {
  const j = await call("/chat/completions", {
    model: process.env.NVIDIA_CHAT_MODEL || "meta/llama-3.1-70b-instruct",
    messages, temperature: 0.1, max_tokens: 1200,
  });
  return j.choices[0].message.content;
}
