/**
 * Creates a video meeting room.
 * Tries Zoom first, then Daily.co, then Jitsi (always works, no config).
 * Returns { url, provider } — never null.
 */

export type MeetingResult = { url: string; provider: "daily" | "zoom" | "jitsi" };

export async function createMeetingRoom(
  topic: string,
  startsAt: string,
  durationMinutes: number,
): Promise<MeetingResult> {
  const zoom = await tryZoom(topic, startsAt, durationMinutes);
  if (zoom) return zoom;
  const daily = await tryDaily(startsAt, durationMinutes);
  if (daily) return daily;
  return tryJitsi();
}

function tryJitsi(): MeetingResult {
  const roomId = "FergusonLaw-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  return { url: `https://meet.jit.si/${roomId}`, provider: "jitsi" };
}

async function tryDaily(startsAt: string, durationMinutes: number): Promise<MeetingResult | null> {
  const apiKey = process.env.DAILY_API_KEY;
  if (!apiKey) return null;
  try {
    const exp = Math.floor(new Date(startsAt).getTime() / 1000) + (durationMinutes + 60) * 60;
    const slug = "fl-consult-" + Date.now().toString(36);
    const res = await fetch("https://api.daily.co/v1/rooms", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: slug,
        privacy: "public",
        properties: { exp, enable_chat: true, enable_screenshare: true, start_video_off: false },
      }),
    });
    if (!res.ok) return null;
    const data = await res.json() as { url: string };
    return { url: data.url, provider: "daily" };
  } catch { return null; }
}

async function tryZoom(topic: string, startsAt: string, durationMinutes: number): Promise<MeetingResult | null> {
  const accountId = process.env.ZOOM_ACCOUNT_ID;
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;
  if (!accountId || !clientId || !clientSecret) return null;
  try {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const tokenRes = await fetch(
      `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
      { method: "POST", headers: { Authorization: `Basic ${credentials}` } },
    );
    if (!tokenRes.ok) return null;
    const { access_token } = await tokenRes.json() as { access_token: string };
    const meetingRes = await fetch("https://api.zoom.us/v2/users/me/meetings", {
      method: "POST",
      headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        topic,
        type: 2,
        start_time: startsAt,
        duration: durationMinutes,
        settings: { join_before_host: true, waiting_room: false },
      }),
    });
    if (!meetingRes.ok) return null;
    const data = await meetingRes.json() as { join_url: string };
    return { url: data.join_url, provider: "zoom" };
  } catch { return null; }
}
