import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyNewMessageToStaff, notifyFileUploadedToStaff } from "@/lib/cms-notify.server";

/** Client-triggered staff notification — fires after the client sends a message or uploads a file. */
export async function POST(req: NextRequest) {
  try {
    const { matterId, kind, fileName } = (await req.json()) as {
      matterId: string;
      kind: "message" | "file";
      fileName?: string;
    };
    if (!matterId || !kind) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const { data: matter } = await supabase
      .from("fl_client_matters")
      .select("id, client_id")
      .eq("id", matterId)
      .eq("client_id", user.id)
      .maybeSingle();
    if (!matter) return NextResponse.json({ error: "Matter not found." }, { status: 404 });

    if (kind === "file") {
      await notifyFileUploadedToStaff(matterId, fileName ?? "a file");
    } else {
      await notifyNewMessageToStaff(matterId);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
