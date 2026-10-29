# Evidentia

Evidence-first RAG app. Upload sources, ask questions with cited answers, or paste a draft and have every sentence fact-checked against your sources.

**Stack:** Next.js 14 (App Router) · NVIDIA NIM API (`nv-embedqa-e5-v5` embeddings + `llama-3.1-70b-instruct`) · Vercel

## How it works
1. Sources are chunked in the browser and embedded via `/api/embed` (NVIDIA, `passage` mode).
2. Vectors are stored in the browser (localStorage), so it works on Vercel's stateless serverless runtime with no database.
3. Questions are embedded (`query` mode), top-k chunks are found by cosine similarity, and `/api/chat` answers only from those passages with `[n]` citations.
4. "Verify draft" retrieves evidence per sentence and returns supported / partial / unsupported verdicts.

## Run locally
```
npm install
cp .env.example .env.local   # add NVIDIA_API_KEY from https://build.nvidia.com
npm run dev
```

## Deploy to Vercel
1. Push this folder to GitHub.
2. Import the repo at vercel.com/new (framework auto-detected: Next.js).
3. Add env var `NVIDIA_API_KEY` (optionally `NVIDIA_EMBED_MODEL`, `NVIDIA_CHAT_MODEL`).
4. Deploy.

## Next steps
Swap localStorage for Supabase pgvector (multi-user, large corpora), add PDF parsing, stream responses.
