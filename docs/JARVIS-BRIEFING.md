# Jarvis briefing — Ferguson Law platform

> **Current as of 2026-10-28.** Operational deployment details and verification
> limits are maintained in [WhatsApp alert operations](WHATSAPP-ALERTS-OPERATIONS.md).
> Do not copy credentials, private contact data, or deployment-provider URLs into
> this briefing.

## Current state

- Ferguson Law is a production Next.js application. Use the approved custom
  domain `https://ferguson-law.com`; its DNS was not resolving from the
  workstation during the 2026-10-27 verification, so verify before promising
  current reachability.
- Vercel reported production deployment `dpl_AuiE9m6qCGcD6vMEGWj6BPFjDt5C` as
  **Ready**, and inspection confirmed the required project alias pointed to it.
- The deployment included uncommitted local source changes based on `main`
  commit `bb79a7d`. The deployed production snapshot is ahead of that commit;
  preserve the worktree and reconcile/commit it before future edits.
- The platform includes booking, admin/client portal, email, H.O.M.E., and
  matter workflows. Payment-provider live activation depends on production
  configuration and must not be inferred from the presence of payment routes.

## WhatsApp alert routing

- Ferguson Law business events are generated from Ferguson Law booking,
  appointment, payment, and inbound-email workflows.
- Owen's business alerts go to Owen only. Jordan's operator alerts go to Jordan
  only. Client confirmations and matter notifications go to the recipient
  configured by that business workflow.
- All use the existing authenticated linked-device `/send` transport. The
  sender is the linked WhatsApp Business number; separate recipient JIDs and
  route-specific text determine who receives each notification.
- Jordan's personal WhatsApp conversation contents are not input to Owen's
  Ferguson Law business-alert functions. Never forward reader-captured private
  chat text to those functions.
- The separate Jarvis reader is configured for allowlisted client processing;
  both owners are denied from capture, auto-reply, and forwarding. On
  2026-10-27, its health endpoint reported linked, forwarding URL was unset,
  auto-reply was disabled, and five approved client entries were configured.
  Treat these as dated checks, not guarantees of current state.

## Validation and unresolved limits

- TypeScript check, production Webpack build, focused server/API lint, and
  mocked recipient-routing tests passed for the deployment.
- No real WhatsApp test message was sent.
- The production value of the sender URL was not independently inspected.
- Appointment alerts are based on firm booking records; an assigned-lawyer
  field was not found in the appointment schema. Do not describe the current
  behavior as filtered to matters assigned exclusively to Owen.
- The custom-domain DNS check failed from the workstation. Verify domain
  reachability separately.

For code paths, deployment evidence, privacy boundaries, and safe next steps,
read the linked operations record before making claims or changing routing.
