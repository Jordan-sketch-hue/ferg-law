import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { sendPaymentConfirmedInternal, sendReceiptToClient } from "@/lib/email/cms";

/**
 * Payment lifecycle actions: confirm (marks funds received, pings staff to
 * issue a receipt) and issue-receipt (generates the receipt number, emails
 * the client). Kept as two explicit steps per the brief — nothing is auto-
 * receipted before a human confirms the money actually landed.
 */
export async function POST(req: NextRequest) {
  try {
    const { token, action, paymentId } = (await req.json()) as {
      token: string;
      action: "confirm" | "issue-receipt";
      paymentId: string;
    };
    if (!token || !action || !paymentId) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: isAdmin } = await supabase.rpc("fl_is_admin", { p_token: token });
    if (!isAdmin) return NextResponse.json({ error: "Not authorised." }, { status: 403 });

    const admin = createAdminClient();

    if (action === "confirm") {
      const { error } = await admin.rpc("fl_admin_cms_confirm_payment", { p_token: token, p_payment_id: paymentId });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      const { data: payment } = await admin
        .from("fl_matter_payments")
        .select("matter_id, amount_jmd, kind, fl_client_matters(title, matter_type)")
        .eq("id", paymentId)
        .single();
      if (payment) {
        const matter = payment.fl_client_matters as unknown as { title: string | null; matter_type: string };
        await sendPaymentConfirmedInternal(
          matter?.title || matter?.matter_type || "a matter",
          Number(payment.amount_jmd),
          payment.kind as string,
        ).catch(() => null);
      }
      return NextResponse.json({ ok: true });
    }

    // issue-receipt
    const { data: receiptRows, error: receiptErr } = await admin.rpc("fl_admin_cms_issue_receipt", {
      p_token: token,
      p_payment_id: paymentId,
    });
    if (receiptErr) return NextResponse.json({ error: receiptErr.message }, { status: 400 });
    const receipt = Array.isArray(receiptRows) ? receiptRows[0] : receiptRows;
    if (!receipt) return NextResponse.json({ error: "Receipt not issued." }, { status: 500 });

    const { data: matterRow } = await admin
      .from("fl_client_matters")
      .select("title, matter_type, client_id")
      .eq("id", receipt.matter_id)
      .single();
    if (matterRow) {
      const { data: userRes } = await admin.auth.admin.getUserById(matterRow.client_id as string);
      const email = userRes?.user?.email;
      if (email) {
        await sendReceiptToClient(
          email,
          (matterRow.title as string) || (matterRow.matter_type as string),
          receipt.receipt_number,
          Number(receipt.amount_jmd),
        ).catch(() => null);
      }
    }

    return NextResponse.json({ ok: true, receiptNumber: receipt.receipt_number });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
