import { NextRequest } from 'next/server';
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
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}
