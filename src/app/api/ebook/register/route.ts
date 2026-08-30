import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PDF_URL = "https://home.fergusonlawja.com/HOME-Guide-Ferguson-Law.pdf";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false, error: "Invalid request body." }, { status: 400, headers: CORS });
  }

  const name    = String(body.full_name ?? body.name ?? "").trim();
  const email   = String(body.email   ?? "").trim().toLowerCase();
  const source  = String(body.source  ?? "home-by-ferg-law").trim();

  if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ ok: false, error: "Name and valid email are required." }, { status: 400, headers: CORS });
  }

  try {
    const supabase = createAdminClient();
    await supabase.from("ebook_leads").upsert(
      {
        name,
        email,
        phone:              String(body.phone              ?? ""),
        country:            String(body.country            ?? ""),
        purchase_timeframe: String(body.purchase_timeframe ?? body.timeframe ?? ""),
        purchase_location:  String(body.purchase_location  ?? ""),
        financing_type:     String(body.financing_type     ?? ""),
        first_time_buyer:   body.first_time_buyer === true || body.first_time_buyer === "true",
        budget_band:        String(body.budget_band        ?? ""),
        source,
        consent:            body.consent === true,
      },
      { onConflict: "email" },
    );

    // Fire-and-forget analytics event (non-blocking)
    void supabase.from("analytics_events").insert({
      event_name: "ebook_form_submit",
      site: "ferguson-law",
      page_path: "/ebook",
      country: String(body.country ?? ""),
      properties: { budget_band: String(body.budget_band ?? ""), financing_type: String(body.financing_type ?? ""), source },
    });

    return Response.json({ ok: true, pdf_url: PDF_URL, pdfUrl: PDF_URL }, { headers: CORS });
  } catch {
    return Response.json({ ok: false, error: "Something went wrong. Please try again." }, { status: 500, headers: CORS });
  }
}
