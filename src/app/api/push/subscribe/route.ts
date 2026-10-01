import { NextRequest } from 'next/server';
import webpush from 'web-push';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { subscription, userRole = 'public', userRef, site = 'ferguson-law' } = await req.json();
    if (!subscription?.endpoint) {
      return Response.json({ ok: false, error: 'Invalid subscription' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from('fl_push_subscriptions').upsert(
      {
        endpoint: subscription.endpoint,
        p256dh: subscription.keys?.p256dh ?? '',
        auth: subscription.keys?.auth ?? '',
        user_role: userRole,
        user_ref: userRef ?? null,
        site,
        last_used: new Date().toISOString(),
      },
      { onConflict: 'endpoint' }
    );

    if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

    // Send a welcome test push immediately so the user confirms it works
    const vapidPublic = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "").replace(/=+$/, "");
    const vapidPrivate = (process.env.VAPID_PRIVATE_KEY ?? "").replace(/=+$/, "");
    if (vapidPublic && vapidPrivate) {
      try {
        webpush.setVapidDetails('mailto:contact@fergusonlawja.com', vapidPublic, vapidPrivate);
        await webpush.sendNotification(
          { endpoint: subscription.endpoint, keys: { p256dh: subscription.keys?.p256dh, auth: subscription.keys?.auth } },
          JSON.stringify({
            title: 'Notifications are on',
            body: 'You\'ll now receive updates from Ferguson Law on this device.',
            url: '/directory/client',
            icon: '/favicon-512.png',
            badge: '/favicon-180.png',
            tag: 'fl-welcome',
          })
        );
      } catch { /* best-effort — subscription already saved */ }
    }

    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}
