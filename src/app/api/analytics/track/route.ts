import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      event_name: string;
      site?: string;
      page_path?: string;
      referrer?: string;
      properties?: Record<string, unknown>;
    };

    if (!body.event_name) {
      return Response.json({ ok: false }, { status: 400, headers: CORS });
    }

    const country = req.headers.get("x-vercel-ip-country") ?? "";
    const city    = req.headers.get("x-vercel-ip-city")    ?? "";
    const ua      = req.headers.get("user-agent")          ?? "";
    const device  = /mobile|android|iphone/i.test(ua)
      ? "mobile"
      : /tablet|ipad/i.test(ua)
        ? "tablet"
        : "desktop";

    const supabase = createAdminClient();
    await supabase.from("analytics_events").insert({
      event_name: body.event_name,
      site:       body.site ?? "ferguson-law",
      page_path:  body.page_path ?? "",
      referrer:   body.referrer  ?? req.headers.get("referer") ?? "",
      country,
      city,
      device_type: device,
      properties:  body.properties ?? {},
    });

    return Response.json({ ok: true }, { headers: CORS });
  } catch {
    return Response.json({ ok: false }, { status: 500, headers: CORS });
  }
}
