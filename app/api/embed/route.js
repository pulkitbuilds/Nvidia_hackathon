import { embed } from "@/lib/nvidia";
export const maxDuration = 60;

export async function POST(req) {
  try {
    const { texts, type } = await req.json();
    if (!Array.isArray(texts) || !texts.length || texts.length > 64)
      return Response.json({ error: "texts must be 1-64 strings" }, { status: 400 });
    const embeddings = await embed(texts, type === "query" ? "query" : "passage");
    return Response.json({ embeddings });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
