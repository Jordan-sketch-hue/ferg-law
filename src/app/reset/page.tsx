import type { Metadata } from "next";
import ResetClient from "./ResetClient";

export const metadata: Metadata = {
  title: "Reset password — Ferguson Law",
  robots: { index: false, follow: false },
};

// Next 16: searchParams is async.
export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; request?: string; type?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const request = sp.request === "admin" || sp.request === "partner" || sp.request === "client" ? sp.request : null;
  const isRecovery = sp.type === "recovery";
  return <ResetClient token={sp.token ?? null} request={request} isRecovery={isRecovery} />;
}
