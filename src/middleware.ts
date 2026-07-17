import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

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
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // NOTE: /admin is intentionally NOT gated here — the back office uses its
  // own fl_is_admin(p_token) login (AdminDashboard.tsx), not Supabase Auth.
  // This matcher previously pointed at /admin/:path*, which meant every visit
  // to the admin link redirected straight to "/" before the page could even
  // render (no visitor has a Supabase Auth session unless they're also
  // logged into the separate client portal). The client portal below already
  // self-gates in directory/client/page.tsx; this middleware adds a
  // belt-and-suspenders redirect for it specifically.
  matcher: ["/directory/client/:path*", "/((?!_next/static|_next/image|favicon).*)"],
};
