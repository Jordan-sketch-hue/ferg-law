import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyMilestoneDone, notifyNewMessageToClient } from "@/lib/cms-notify.server";

/** Staff-triggered client notification — fires after a milestone completes or staff sends a message. */
export async function POST(req: NextRequest) {
  try {
    const { token, matterId, kind, milestoneName } = (await req.json()) as {
      token: string;
      matterId: string;
      kind: "milestone" | "message";
      milestoneName?: string;
    };

    if (!token || !matterId || !kind) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: isAdmin } = await supabase.rpc("fl_is_admin", { p_token: token });
    if (!isAdmin) return NextResponse.json({ error: "Not authorised." }, { status: 403 });

    if (kind === "milestone") {
      await notifyMilestoneDone(matterId, milestoneName ?? "A step");
    } else {
      await notifyNewMessageToClient(matterId);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
