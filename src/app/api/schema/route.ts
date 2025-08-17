import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { rows } = await pool.query(`
      SELECT
        c.table_name   AS table,
        c.column_name  AS name,
        c.data_type    AS "dataType",
        (c.is_nullable = 'YES') AS "isNullable"
      FROM information_schema.columns c
      JOIN information_schema.tables t
        ON c.table_name = t.table_name AND c.table_schema = t.table_schema
      WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
      ORDER BY c.table_name, c.ordinal_position;
    `);
    return NextResponse.json({ columns: rows });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "schema failed" },
      { status: 500 }
    );
  }
}