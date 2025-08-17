import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const runtime = "nodejs";

function isReadOnly(sql: string) {
  const s = sql.trim().toUpperCase();
  return /^(SELECT|EXPLAIN|SHOW|WITH\s+.*SELECT)/.test(s);
}

export async function POST(req: Request) {
  const { sql } = await req.json();
  if (!sql || typeof sql !== "string") {
    return NextResponse.json({ ok: false, error: "Missing 'sql' string" }, { status: 400 });
  }
  if (!isReadOnly(sql)) {
    return NextResponse.json({ ok: false, error: "Only read-only queries allowed" }, { status: 400 });
  }

  try {
    await pool.query(`EXPLAIN (FORMAT JSON) ${sql}`);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const msg: string = e?.message || "Invalid SQL";
    let reason = msg;
    if (/relation .* does not exist/i.test(msg)) reason = "Unknown table referenced.";
    if (/column .* does not exist/i.test(msg))  reason = "Unknown column referenced.";
    return NextResponse.json({ ok: false, error: reason, detail: msg });
  }
}