const BASE = "https://integrate.api.nvidia.com/v1";

async function call(path, body) {
  const key = process.env.NVIDIA_API_KEY;
  if (!key) throw new Error("NVIDIA_API_KEY is not set");
  const r = await fetch(BASE + path, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const err = new Error(`NVIDIA ${r.status}: ${(await r.text()).slice(0, 300)}`);
    err.status = r.status;
    throw err;
  }
  return r.json();
}

// Try each model in order; skip to the next if it is retired (404/410)
async function withFallback(models, fn) {
  let last;
  for (const m of models) {
    try { return await fn(m); }
    catch (e) { last = e; if (e.status !== 404 && e.status !== 410) throw e; }
  }
  throw last;
}

const list = (envVal, defaults) => [envVal, ...defaults].filter(Boolean);

// type: "passage" for documents, "query" for questions
export async function embed(input, type) {
  const models = list(process.env.NVIDIA_EMBED_MODEL, [
    "nvidia/llama-nemotron-embed-1b-v2",
    "nvidia/llama-3.2-nv-embedqa-1b-v2",
  ]);
  return withFallback(models, async (model) => {
    const j = await call("/embeddings", {
      model, input, input_type: type, encoding_format: "float", truncate: "END",
    });
    return j.data.map((d) => d.embedding);
  });
}

export async function chat(messages) {
  const models = list(process.env.NVIDIA_CHAT_MODEL, [
    "meta/llama-3.3-70b-instruct",
    "nvidia/llama-3.3-nemotron-super-49b-v1.5",
  ]);
  return withFallback(models, async (model) => {
    const j = await call("/chat/completions", {
      model, messages, temperature: 0.1, max_tokens: 1200,
    });
    return j.choices[0].message.content;
  });
}