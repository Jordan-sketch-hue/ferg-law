import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/notifications?userRef=X&userRole=Y&site=Z
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userRef = searchParams.get('userRef');
  const userRole = searchParams.get('userRole') || 'client';
  const site = searchParams.get('site') || 'ferguson-law';
  if (!userRef) return Response.json({ ok: false, error: 'userRef required' }, { status: 400 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('fl_notifications')
    .select('id,title,body,deep_link,icon,event_type,read_at,created_at')
    .eq('user_ref', userRef)
    .eq('site', site)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  return Response.json({ ok: true, notifications: data ?? [] });
}

// POST /api/notifications — send to a user (internal use, no auth header needed as service-role)
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-push-secret');
  if (secret !== process.env.PUSH_INTERNAL_SECRET) {
    return Response.json({ ok: false }, { status: 401 });
  }

  const { userRef, userRole, site = 'ferguson-law', eventType, title, body, deepLink, icon, sendPush = false } =
    await req.json();

  if (!userRef || !title) return Response.json({ ok: false, error: 'userRef and title required' }, { status: 400 });

  const supabase = createAdminClient();
  const { data: notif, error } = await supabase
    .from('fl_notifications')
    .insert({ user_ref: userRef, user_role: userRole, site, event_type: eventType, title, body, deep_link: deepLink, icon })
    .select('id')
    .single();

  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

  // Optionally fire push notification too
  if (sendPush && process.env.PUSH_INTERNAL_SECRET) {
    fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://fergusonlawja.com'}/api/push/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-push-secret': process.env.PUSH_INTERNAL_SECRET },
      body: JSON.stringify({ userRef, role: userRole, title, body, url: deepLink || '/', icon }),
    }).catch(() => {});
  }

  return Response.json({ ok: true, id: notif?.id });
}

// PATCH /api/notifications — mark as read
export async function PATCH(req: NextRequest) {
  const { id, userRef } = await req.json();
  if (!id || !userRef) return Response.json({ ok: false, error: 'id and userRef required' }, { status: 400 });

  const supabase = createAdminClient();
  await supabase
    .from('fl_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_ref', userRef);

  return Response.json({ ok: true });
}
