/**
 * POST /api/admin/run-migration
 * One-time admin endpoint to apply schema migrations via service role.
 * KEEP THIS LOCKED DOWN — token check is mandatory.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const { token, migration } = (await req.json()) as { token?: string; migration?: string };
  if (!token || !migration) return NextResponse.json({ error: "Missing params" }, { status: 400 });

  const supabase = createAdminClient();
  const { data: valid } = await supabase.rpc("fl_is_admin", { p_token: token });
  if (!valid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const migrations: Record<string, string> = {
    "add-email-id": `
      ALTER TABLE fl_inbound_emails
      ADD COLUMN IF NOT EXISTS email_id TEXT;
    `,
  };

  const sql = migrations[migration];
  if (!sql) return NextResponse.json({ error: "Unknown migration" }, { status: 400 });

  const { error } = await supabase.rpc("fl_run_sql", { p_sql: sql }).single();
  if (error) {
    // Try direct query if RPC doesn't exist — use raw SQL via postgrest
    // Since we can't run DDL via anon, return instructions
    console.error("Migration error:", error);
    return NextResponse.json({ error: error.message, hint: "Run migration manually in Supabase SQL editor" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, migration });
}
