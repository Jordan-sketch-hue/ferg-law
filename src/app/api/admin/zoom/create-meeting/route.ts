/**
 * POST /api/admin/zoom/create-meeting
 * Creates a meeting room (Daily.co first, Zoom fallback).
 * Body: { token, topic?, start_time?, duration_minutes? }
 * Returns: { ok, url, provider }
 */
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createMeetingRoom } from "@/lib/meetings/create";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    token: string;
    topic?: string;
    start_time?: string;
    duration_minutes?: number;
  };

  const { token, topic = "Ferguson Law Consultation", start_time, duration_minutes = 60 } = body;

  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("fl_is_admin", { p_token: token });
  if (!isAdmin) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const startsAt = start_time ?? new Date().toISOString();
  const meeting = await createMeetingRoom(topic, startsAt, duration_minutes);
  return Response.json({ ok: true, url: meeting.url, provider: meeting.provider });
}
