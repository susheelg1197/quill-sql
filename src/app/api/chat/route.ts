import { NextResponse } from "next/server";
import { openai } from "@/lib/ai";

export const runtime = "nodejs";

const SYSTEM_PROMPT = [
  "You are a Postgres SQL assistant.",
  "You only see schema, never data.",
  "- Generate safe, efficient SQL for Postgres 16.",
  "- Use only tables/columns present in the provided schema JSON.",
  "- If unsure, ask a brief clarifying question.",
  "- IMPORTANT: Only put SQL inside a fenced block like:",
  "",
  "```sql",
  "SELECT 1;",
  "```",
  "",
  "- Do NOT wrap explanations in code fences."
].join("\n");

function schemaToText(schema: any): string {
  try {
    const byTable: Record<string, string[]> = {};
    for (const c of schema?.columns ?? []) {
      (byTable[c.table] ||= []).push(`${c.name} ${c.dataType}`);
    }
    return Object.entries(byTable)
      .map(([t, cols]) => `TABLE ${t} (\n  ${cols.join(",\n  ")}\n)`)
      .join("\n");
  } catch {
    return "NO_SCHEMA";
  }
}

export async function POST(req: Request) {
  try {
    const { message, schema } = await req.json();
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Missing 'message' string" }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      // Deterministic fallback if no key present
      const fallback = [
        "No OPENAI_API_KEY configured. Example only:",
        "",
        "```sql",
        "SELECT * FROM products ORDER BY created_at DESC LIMIT 10;",
        "```",
      ].join("\n");
      return NextResponse.json({ content: fallback });
    }

    const schemaText = schemaToText(schema);
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Schema:\n\n${schemaText}` },
        { role: "user", content: `User: ${message}` },
      ],
    });

    const content = completion.choices[0]?.message?.content ?? "No response";
    return NextResponse.json({ content });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "chat failed" }, { status: 500 });
  }
}