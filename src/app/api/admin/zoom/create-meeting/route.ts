/**
 * POST /api/admin/zoom/create-meeting
 * Creates a Zoom meeting using Server-to-Server OAuth.
 * Body: { token, topic, start_time, duration_minutes?, agenda? }
 * Returns: { ok, join_url, start_url, meeting_id }
 */
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getZoomToken(): Promise<string> {
  const accountId    = process.env.ZOOM_ACCOUNT_ID!;
  const clientId     = process.env.ZOOM_CLIENT_ID!;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET!;
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
    { method: "POST", headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" } }
  );

  if (!res.ok) throw new Error(`Zoom token error ${res.status}: ${await res.text()}`);
  return ((await res.json()) as { access_token: string }).access_token;
}

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    token: string;
    topic: string;
    start_time: string;
    duration_minutes?: number;
    agenda?: string;
  };

  const { token, topic, start_time, duration_minutes = 60, agenda } = body;

  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("fl_is_admin", { p_token: token });
  if (!isAdmin) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });

  if (!process.env.ZOOM_ACCOUNT_ID || !process.env.ZOOM_CLIENT_ID || !process.env.ZOOM_CLIENT_SECRET) {
    return Response.json({ ok: false, error: "Zoom not configured. Add ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET to Vercel environment variables." }, { status: 503 });
  }

  if (!topic || !start_time) {
    return Response.json({ ok: false, error: "topic and start_time are required" }, { status: 400 });
  }

  try {
    const accessToken = await getZoomToken();

    const meeting = await fetch("https://api.zoom.us/v2/users/me/meetings", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        topic,
        type: 2,
        start_time,
        duration: duration_minutes,
        timezone: "America/Jamaica",
        agenda: agenda ?? "",
        settings: {
          host_video: true,
          participant_video: true,
          waiting_room: true,
          auto_recording: "none",
        },
      }),
    });

    if (!meeting.ok) {
      return Response.json({ ok: false, error: `Zoom API ${meeting.status}: ${await meeting.text()}` }, { status: 502 });
    }

    const data = await meeting.json() as { id: number; join_url: string; start_url: string; start_time: string };
    return Response.json({ ok: true, meeting_id: data.id, join_url: data.join_url, start_url: data.start_url, start_time: data.start_time });
  } catch (err) {
    return Response.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
