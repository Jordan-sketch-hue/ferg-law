/**
 * Server-side push notification helpers.
 * All functions are best-effort — they never throw or block the caller.
 *
 * pushToAdmins  — broadcasts to every subscribed admin device
 * pushToClient  — targets one client by their auth.users.id
 */

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://ferguson-law.vercel.app";

interface PushPayload {
  role?: "admin" | "client" | "partner";
  userRef?: string;
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

async function send(payload: PushPayload): Promise<void> {
  const secret = process.env.PUSH_INTERNAL_SECRET;
  if (!secret) return;
  try {
    await fetch(`${SITE}/api/push/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-push-secret": secret },
      body: JSON.stringify(payload),
    });
  } catch {
    /* push is best-effort — never blocks callers */
  }
}

export function pushToAdmins(
  title: string,
  body: string,
  url = "/admin",
  tag?: string,
): Promise<void> {
  return send({ role: "admin", title, body, url, tag });
}

export function pushToClient(
  userRef: string,
  title: string,
  body: string,
  url = "/directory/client",
  tag?: string,
): Promise<void> {
  return send({ role: "client", userRef, title, body, url, tag });
}
