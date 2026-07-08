/**
 * GET /api/ebook/return
 *
 * WiPay returns here after ebook checkout. We update the ebook_purchases row
 * and redirect to a confirmation/access page.
 */
import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { parseReturn } from "@/lib/payments/wipay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function redirect(req: NextRequest, ref: string, status: "paid" | "failed", email?: string) {
  const origin = new URL(req.url).origin;
  const params = new URLSearchParams({ ref, status });
  if (email) params.append("email", email);
  const url = `${origin}/ebook/access?${params.toString()}`;
  return Response.redirect(url, 302);
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const query: Record<string, string | undefined> = {};
  url.searchParams.forEach((v, k) => {
    query[k] = v;
  });

  const { orderId, status, txn } = parseReturn(query);

  if (!orderId) return redirect(req, "", "failed");

  const supabase = createAdminClient();

  // Look up and update the ebook_purchases row atomically.
  const paid = status === "paid";
  const { data: rows, error } = await supabase
    .from("ebook_purchases")
    .select("id, email, status")
    .eq("order_id", orderId)
    .single();

  if (error || !rows) {
    return redirect(req, orderId, "failed");
  }

  const { email } = rows as { email: string };

  if (paid) {
    // Mark as paid; update only if not already paid (idempotent).
    await supabase
      .from("ebook_purchases")
      .update({ status: "paid", provider_txn: txn || null })
      .eq("order_id", orderId)
      .neq("status", "paid");
  } else {
    // Mark as failed.
    await supabase
      .from("ebook_purchases")
      .update({ status: "failed" })
      .eq("order_id", orderId);
  }

  return redirect(req, orderId, paid ? "paid" : "failed", email);
}
