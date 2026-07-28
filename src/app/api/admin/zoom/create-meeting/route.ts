/**
 * POST /api/admin/zoom/create-meeting
 * Creates a Zoom meeting via Server-to-Server OAuth.
 * Body: { token, topic, start_time, duration_minutes? }
 * Returns: { ok, join_url, meeting_id }
 */
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getZoomToken(): Promise<string> {
  const accountId = process.env.ZOOM_ACCOUNT_ID!;
  const clientId = process.env.ZOOM_CLIENT_ID!;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET!;
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
    { method: "POST", headers: { Authorization: `Basic ${credentials}` } },
  );
  if (!res.ok) throw new Error(`Zoom OAuth ${res.status}`);
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    token: string;
    topic: string;
    start_time: string;
    duration_minutes?: number;
  };

  const { token, topic, start_time, duration_minutes = 60 } = body;

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
    const res = await fetch("https://api.zoom.us/v2/users/me/meetings", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        topic,
        type: 2,
        start_time,
        duration: duration_minutes,
        settings: { join_before_host: true, waiting_room: false, host_video: true, participant_video: true },
      }),
    });

    if (!res.ok) {
      return Response.json({ ok: false, error: `Zoom API ${res.status}: ${await res.text()}` }, { status: 502 });
    }

    const data = await res.json() as { join_url: string; id: number };
    return Response.json({ ok: true, join_url: data.join_url, meeting_id: data.id });
  } catch (err) {
    return Response.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
