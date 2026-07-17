import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = "https://ibtadbwtrxglujkzqofs.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlidGFkYnd0cnhnbHVqa3pxb2ZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2OTE2NTUsImV4cCI6MjA5NDI2NzY1NX0.ihwCJOvYU2hZL3aruKzgrN9BqA42o-fivqc-yMjm6Qw";

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  if (host.includes("vercel.app")) {
    const url = request.nextUrl.clone();
    url.host = "fergusonlawja.com";
    url.port = "";
    return NextResponse.redirect(url, { status: 301 });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user && request.nextUrl.pathname.startsWith("/directory/client")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon).*)"],
};
