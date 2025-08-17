import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import type { FieldDef } from "pg";

export const runtime = "nodejs";

function isReadOnly(sql: string) {
  const s = sql.trim().toUpperCase();
  return /^(SELECT|EXPLAIN|SHOW|WITH\s+.*SELECT)/.test(s);
}

export async function POST(req: Request) {
  const { sql } = await req.json();

  if (!sql || typeof sql !== "string") {
    return NextResponse.json({ error: "Missing 'sql' string" }, { status: 400 });
  }
  if (!isReadOnly(sql)) {
    return NextResponse.json({ error: "Only read-only queries allowed" }, { status: 400 });
  }

  try {
    // Optional extra safety: parse first
    await pool.query(`EXPLAIN (FORMAT JSON) ${sql}`);

    const res = await pool.query(sql);
    return NextResponse.json({
      fields: (res.fields as FieldDef[] | undefined)?.map((f) => f.name) ?? [],
      rows: res.rows ?? [],
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "query failed" }, { status: 400 });
  }
}