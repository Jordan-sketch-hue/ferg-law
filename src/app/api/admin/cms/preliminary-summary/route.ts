import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const token = req.headers.get("x-admin-token");
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { matterId, summary } = (await req.json()) as {
    matterId: string;
    summary: {
      objective: string;
      recommendation: string;
      how_we_assist: string;
      expected_timing: string;
      what_happens_next: string;
    };
  };

  if (!matterId || !summary) return NextResponse.json({ error: "missing fields" }, { status: 400 });

  const admin = createAdminClient();
  const { data: isAdmin, error: authErr } = await admin.rpc("fl_is_admin", { p_token: token });
  if (authErr || !isAdmin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const payload = { ...summary, created_at: new Date().toISOString() };
  const { error } = await admin
    .from("fl_client_matters")
    .update({ preliminary_summary: payload })
    .eq("id", matterId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, summary: payload });
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const matterId = req.nextUrl.searchParams.get("matterId");
  if (!token || !matterId) return NextResponse.json({ error: "missing params" }, { status: 400 });

  const admin = createAdminClient();
  const { data: isAdmin, error: authErr } = await admin.rpc("fl_is_admin", { p_token: token });
  if (authErr || !isAdmin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await admin
    .from("fl_client_matters")
    .select("preliminary_summary, client_name, client_email, title, matter_type, workflow_type")
    .eq("id", matterId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, summary: data?.preliminary_summary ?? null });
}