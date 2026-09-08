import { NextRequest } from 'next/server';
import webpush from 'web-push';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  webpush.setVapidDetails(
    'mailto:info@fergusonlawja.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  // Internal-only — guard with a shared secret
  const secret = req.headers.get('x-push-secret');
  if (secret !== process.env.PUSH_INTERNAL_SECRET) {
    return Response.json({ ok: false }, { status: 401 });
  }

  const {
    role,          // 'admin' | 'client' | 'partner' | 'public' — or omit for all
    userRef,       // specific user ref to target
    title,
    body,
    url = '/',
    tag,
    zoomUrl,
    actions = [],
    requireInteraction = false,
  } = await req.json();

  const supabase = createAdminClient();

  let query = supabase.from('fl_push_subscriptions').select('endpoint,p256dh,auth');
  if (role) query = query.eq('user_role', role);
  if (userRef) query = query.eq('user_ref', userRef);

  const { data: subs, error } = await query;
  if (error || !subs) return Response.json({ ok: false, error: error?.message }, { status: 500 });

  const payload = JSON.stringify({ title, body, url, tag, zoomUrl, actions, requireInteraction,
    icon: '/favicon-512.png', badge: '/favicon-180.png' });

  let sent = 0;
  const dead: string[] = [];

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        sent++;
      } catch (e: unknown) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) dead.push(sub.endpoint);
      }
    })
  );

  // Clean up dead subscriptions
  if (dead.length > 0) {
    await supabase.from('fl_push_subscriptions').delete().in('endpoint', dead);
  }

  return Response.json({ ok: true, sent, dead: dead.length });
}
