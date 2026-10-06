import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token || token.length < 8) {
    return new NextResponse(confirmationPage("Invalid link", "This unsubscribe link is invalid or has already been used."), {
      headers: { "Content-Type": "text/html" },
      status: 400,
    });
  }

  const supabase = createAdminClient();

  // Look up the token
  const { data: row, error: lookupErr } = await supabase
    .from("fl_email_optouts")
    .select("id, email, opted_out_at")
    .eq("token", token)
    .single();

  if (lookupErr || !row) {
    return new NextResponse(confirmationPage("Not found", "We could not find a matching subscription record for this link."), {
      headers: { "Content-Type": "text/html" },
      status: 404,
    });
  }

  if (row.opted_out_at) {
    return new NextResponse(confirmationPage("Already unsubscribed", "You have already been removed from this list."), {
      headers: { "Content-Type": "text/html" },
    });
  }

  const { error: updateErr } = await supabase
    .from("fl_email_optouts")
    .update({ opted_out_at: new Date().toISOString() })
    .eq("token", token);

  if (updateErr) {
    return new NextResponse(confirmationPage("Error", "Something went wrong. Please reply to the email to unsubscribe manually."), {
      headers: { "Content-Type": "text/html" },
      status: 500,
    });
  }

  return new NextResponse(confirmationPage("Unsubscribed", "You have been removed from Ferguson Law partner communications. You will not receive further emails from this list."), {
    headers: { "Content-Type": "text/html" },
  });
}

function confirmationPage(title: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} - Ferguson Law</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Georgia,serif;background:#f9f7f4;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
  .card{background:#fff;border:1px solid #e8e0d4;border-radius:4px;max-width:480px;width:100%;padding:48px 40px;text-align:center}
  .logo{font-size:13px;letter-spacing:0.18em;text-transform:uppercase;color:#8b7355;margin-bottom:32px}
  h1{font-size:22px;font-weight:400;color:#1a1a1a;margin-bottom:16px}
  p{font-size:14px;color:#666;line-height:1.7}
  .divider{width:32px;height:1px;background:#c8a65c;margin:24px auto}
  a{color:#8b7355;font-size:13px;text-decoration:none}
</style>
</head>
<body>
<div class="card">
  <div class="logo">Ferguson Law</div>
  <h1>${title}</h1>
  <div class="divider"></div>
  <p>${message}</p>
  <div class="divider"></div>
  <a href="https://fergusonlawja.com">fergusonlawja.com</a>
</div>
</body>
</html>`;
}
