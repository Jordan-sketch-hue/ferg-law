import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get("x-admin-token") ?? "";
    const supabase = await createClient();
    const { data: isAdmin, error: authErr } = await supabase.rpc("fl_is_admin", { p_token: token });
    if (authErr || !isAdmin) return NextResponse.json({ error: "Not authorised." }, { status: 403 });

    const admin = createAdminClient();

    const [msgRes, fileRes, bookingRes] = await Promise.all([
      admin.from("fl_matter_messages")
        .select("id, created_at, matter_id, sender_role, body")
        .eq("sender_role", "client")
        .order("created_at", { ascending: false })
        .limit(10),
      admin.from("fl_matter_files")
        .select("id, created_at, matter_id, file_name")
        .order("created_at", { ascending: false })
        .limit(10),
      admin.from("fl_appointments")
        .select("id, created_at, name, service, status")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    interface ActivityItem { id: string; kind: string; label: string; sub: string; ts: string; tab: string }
    const items: ActivityItem[] = [];

    for (const m of (msgRes.data ?? [])) {
      items.push({
        id: `msg-${m.id}`,
        kind: "message",
        label: "Client message",
        sub: (m.body as string)?.slice(0, 80) ?? "",
        ts: m.created_at as string,
        tab: "cms",
      });
    }
    for (const f of (fileRes.data ?? [])) {
      items.push({
        id: `file-${f.id}`,
        kind: "file",
        label: "File uploaded",
        sub: (f.file_name as string) ?? "Document",
        ts: f.created_at as string,
        tab: "cms",
      });
    }
    for (const b of (bookingRes.data ?? [])) {
      items.push({
        id: `booking-${b.id}`,
        kind: "booking",
        label: `Booking: ${(b.service as string) ?? "Consultation"}`,
        sub: `${(b.name as string) ?? "Client"} · ${(b.status as string) ?? "pending"}`,
        ts: b.created_at as string,
        tab: "bookings",
      });
    }

    items.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

    return NextResponse.json({ items: items.slice(0, 20) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
