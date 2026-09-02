import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const supabase = createAdminClient();

  await supabase.from('fl_pwa_analytics').upsert(
    {
      session_id: body.sessionId,
      site: body.site || 'ferguson-law',
      display_mode: body.displayMode,
      platform: body.platform,
      browser: body.browser,
      os: body.os,
      installed_pwa: body.installedPwa ?? false,
      notification_permission: body.notificationPermission,
      push_enabled: body.pushEnabled ?? false,
      install_prompt_shown: body.installPromptShown ?? false,
      install_prompt_accepted: body.installPromptAccepted ?? false,
      offline_event_count: body.offlineEventCount ?? 0,
      user_ref: body.userRef ?? null,
      user_role: body.userRole ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'session_id' }
  );

  return Response.json({ ok: true });
}
