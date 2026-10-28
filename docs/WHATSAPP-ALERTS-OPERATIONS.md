# Ferguson Law WhatsApp Alerts — Operations Record

> **Source of truth for agents. Updated 2026-10-28.** This records the deployed
> state verified on 2026-10-27. Re-check live provider settings before claiming
> a delivery path or account state is currently healthy.

## What is deployed

- Ferguson Law production deployment `dpl_AuiE9m6qCGcD6vMEGWj6BPFjDt5C` was
  reported **Ready**, targeting production, on 2026-10-27.
- The required Ferguson Law project alias was applied and `vercel inspect`
  confirmed it resolved to that Ready production deployment.
- The primary domain is `https://ferguson-law.com`. Its DNS lookup from the
  deployment workstation failed at that time, so custom-domain availability was
  **not verified**.
- The deployed source included local worktree changes that were not committed
  on `main` (`bb79a7d`) at deployment time. Check `git status` before pulling,
  rebasing, or editing; do not discard those changes. The deployment is live,
  but the source delta is not reproducible from the branch commit alone until
  it is committed and pushed.
- This operations record and the related documentation updates were written
  after that deployment. They are local documentation changes and do not alter
  the already deployed app.
- No real WhatsApp test message was sent.

## Alert routing model

Ferguson Law sends through the existing authenticated linked-device `/send`
transport. This is the same WhatsApp Business number; **the recipient JID and
message text are selected by each Ferguson Law workflow**:

| Workflow | Recipient | Source |
|---|---|---|
| Booking, paid-booking, appointment reminders/attendance, booking digests, and configured Owen-mailbox alerts | Owen only | Ferguson Law booking, appointment, payment, and inbound-email workflows |
| Website leads, public live-chat/handoff, general operator notices, and general inbox alerts | Jordan only | Ferguson Law lead, chat, digest, and email workflows |
| Client confirmations, reminders, and matter updates | The client or explicitly configured matter notification contact | Ferguson Law booking and matter workflows |

Key implementation:

- `src/lib/wa-notify.ts` exposes `notifyJordanWA()` and
  `notifyOwenBusinessWA()`. Each sends to exactly one recipient JID; neither
  uses a shared “send to both” list.
- `src/app/api/booking/create/route.ts`,
  `src/app/api/admin/booking/create/route.ts`,
  `src/app/api/payments/return/route.ts`,
  `src/app/api/cron/reminders/route.ts`,
  `src/app/api/cron/digest-morning/route.ts`,
  `src/app/api/cron/digest-evening/route.ts`, and
  `src/app/api/email/inbound/route.ts` call the Owen business-alert helper for
  firm-record events.
- `src/lib/whatsapp.server.ts` sends client/matter messages through the same
  transport to the recipient chosen by that firm workflow.
- Configure the sender credential server-side only. The alert helper has a
  legacy `NEXT_PUBLIC_WHATSAPP_BOT_SECRET` fallback; do not set or rely on a
  public client-exposed secret. The client-message helper also recognizes the
  legacy `WA_SEND_SECRET` name.
- `src/app/api/admin/wa-send/route.ts` uses the shared sender for an
  administrator-initiated message and returns explicit errors for invalid
  input, missing configuration, or delivery failure.

**Privacy boundary:** Owen's business alerts are constructed from Ferguson Law
records in these server workflows. They are not sourced from the contents of
Jordan's personal WhatsApp conversations. Never pass reader-captured chat text
or personal-message data to `notifyOwenBusinessWA()`.

The sender does not determine whether arbitrary text is appropriate: it
authenticates and sends the supplied JID/text. Keep the separation in the
workflow call sites and review any new alert call site before adding it.

## WhatsApp reader is a separate function

`Jordan-sketch-hue/jarvis-wa-reader` is the Baileys linked-device reader and
the transport endpoint. It reads only configured client allowlist chats for
its Jarvis card/notification workflow. The deployed safeguards deny both owner
numbers from client capture, auto-reply, and inbound forwarding. Reader
message notifications are addressed to Jordan, not Owen.

State verified on 2026-10-27:

- Reader `/healthz` returned `linked: true`.
- Reader settings were `paused: false`, `autoreply_enabled: false`, with five
  approved client entries and neither owner in that allowlist.
- `INBOUND_FORWARD_URL` was unset; therefore the reader was not forwarding
  WhatsApp conversations into Ferguson Law.
- Do not infer the current state from this dated snapshot; check health and
  settings through authorized operations before relying on them.

`Jordan-sketch-hue/whatsapp-jarvis-bot` is a different repository. The local
checkout inspected in October 2026 contains an AI voice-sales application, not
the active Baileys reader. Do not point Ferguson Law at it or treat its name as
proof that it is the live WhatsApp sender.

## Verification and limits

- Ferguson Law `npx tsc --noEmit`: passed.
- Ferguson Law `npm run build` (`next build --webpack`): passed.
- Focused ESLint on the changed WhatsApp server/API files: passed.
- Mocked routing assertions verified different recipient JIDs, the shared
  sender contract, and fail-closed behavior when sender configuration is
  absent. These tests made no network request and sent no WhatsApp messages.
- The dashboard lint had existing diagnostics; the message-send edit added no
  new rule-count diagnostics.
- The production value of `WHATSAPP_BOT_URL` was not read or independently
  verified. The reader health check verifies that the reader was linked; it
  does **not** prove which exact URL is configured in Vercel.
- Appointment alerts currently use firm booking/appointment records. The
  appointment schema inspected for this work had no explicit assigned-lawyer
  field, so do not claim notifications are filtered to matters assigned
  exclusively to Owen.

## Safe follow-up

1. Preserve the existing single-sender setup and separate recipient helpers.
2. Verify production sender configuration and current reader settings without
   printing secret values.
3. Keep personal-message reader data out of Ferguson Law business alert inputs.
4. Before claiming “Owen's matters only,” identify or add a trustworthy
   matter/appointment owner assignment field and filter on it.
5. After any production deploy, verify the production target and apply the
   required Ferguson Law project alias. Do not send test messages without
   explicit authorization.
