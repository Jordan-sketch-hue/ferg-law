import { createServerClient } from "@supabase/ssr";
import { createClient as createRawClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Server Supabase client (RSC / route handlers / server actions).
 * Reads & writes the auth cookie so sessions persist. In Next 16 `cookies()`
 * is async, so this helper is async too.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — safe to ignore when middleware
            // is refreshing sessions.
          }
        },
      },
    },
  );
}

/**
 * Privileged server client. Server-only — never import into client code.
 *
 * Prefers the service-role key (bypasses RLS — needed for CRM reads of
 * PII-protected tables). Falls back to the anon key when the service-role key
 * isn't set, so the public flows (chat, booking, leads) still work in preview/
 * pre-credential environments — their RLS policies already permit the anon
 * inserts/selects those flows perform.
 */
export function createAdminClient() {
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    SUPABASE_ANON_KEY;
  return createRawClient(SUPABASE_URL, key, {
    auth: { persistSession: false },
  });
}
