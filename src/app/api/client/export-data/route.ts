import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exportClientData } from "@/lib/client-purge.server";

/** Right-to-access companion to /api/client/delete-account — a JSON dump of everything on file. */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const data = await exportClientData({ clientId: user.id, email: user.email });
  return NextResponse.json(data, {
    headers: {
      "Content-Disposition": `attachment; filename="ferguson-law-my-data-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
