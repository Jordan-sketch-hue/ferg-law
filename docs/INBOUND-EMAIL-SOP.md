# Ferguson Law Inbound Email SOP
**Last updated:** 2026-11-02  
**Maintained by:** J Supreme Tech

---

## Architecture

```
External sender
  → MX: inbound-smtp.us-east-1.amazonaws.com (priority 9)
  → Resend routes to webhook: email.received
  → POST https://fergusonlawja.com/api/email/inbound
  → Supabase fl_inbound_emails (project ibtadbwtrxglujkzqofs)
  → Forward notification to Owen's hotmail (FERGUSON_STAFF_EMAIL)
  → WA alert to Jordan or Owen (depending on mailbox)
  → ops_ticket created + ACK sent to sender
```

---

## Required Vercel Env Vars

| Variable | Purpose |
|---|---|
| `RESEND_API_KEY` | Resend API — inbound fetch + outbound send |
| `RESEND_WEBHOOK_SECRET` | Svix signature verification on webhook POST |
| `FERGUSON_STAFF_EMAIL` | Owen's hotmail — forward destination for ALL mailboxes |
| `WHATSAPP_BOT_URL` | Railway WA bot base URL |
| `WHATSAPP_BOT_SECRET` | Railway WA bot auth secret |
| `CRON_SECRET` | Bearer token for cron + admin endpoints |
| `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | Supabase admin client |

---

## Forwarding Rule (CRITICAL)

ALL `@fergusonlawja.com` mailboxes forward to `FERGUSON_STAFF_EMAIL` (Owen's hotmail).  
The `forwardTo = defaultStaffEmail` is unconditional — DO NOT branch on mailbox.

**Forward is skipped when:**
- `isInternalSender` = true (sender is `@fergusonlawja.com` — prevents loop)
- `spam` = true (spam heuristics matched)
- `isServiceEmail` = true (sender matched SERVICE_SENDER_PATTERNS — TikTok, Higgsfield, noreply, etc.)

Service emails ARE saved to `fl_inbound_emails` for Jordan's admin view but:
- NOT forwarded to Owen
- NOT sent as WA alerts
- NOT creating ops_tickets
- NOT triggering push notifications

---

## WA Alert Routing

| Incoming mailbox | WA recipient |
|---|---|
| `owen@fergusonlawja.com` | Owen's WA only (`notifyOwenBusinessWA`) |
| Any other (`contact@`, etc.) | Jordan's WA only (`notifyJordanWA`) |

**Owen's WA must NEVER receive:**
- Jordan's operational inbox updates
- Lead pipeline data
- Any content from Jordan's personal/operational workflows

---

## Morning Digest (digest-morning/route.ts)

Runs daily at 8AM JA time (13:00 UTC via cron).

| Recipient | Content | Channel |
|---|---|---|
| Jordan | Full digest: bookings + leads + unread inbox | WA + direct email (iCloud TO, gmail BCC) |
| Owen | Bookings only: his daily schedule | WA + separate email (staffEmail) |

**These are two separate emails — Owen never receives Jordan's operational content.**

WA session health check runs BEFORE all sends. If Railway bot session is dead:
- WA sends are skipped gracefully, logged
- Emails still go out
- Response includes `waSessionLive: false`

---

## Attachment Pipeline

Inbound webhook fetches attachments from `GET /emails/receiving/{id}` (NOT `/emails/{id}` — that's sent-mail only).

Storage: `fl-matter-files` bucket, path `inbound-attachments/{safeEmailId}-{index}-{safeName}`

**Retroactive recovery:** `POST /api/admin/recover-attachments` (Bearer CRON_SECRET)  
- Finds rows where `email_id IS NOT NULL` AND `attachments IS NULL` AND body mentions "attach"
- Fetches from Resend, saves to storage, updates DB
- Pass `{ "test": true }` to preview without writing
- Note: Resend may have purged old data (404 = expired, logged and skipped)

**Body backfill:** `POST /api/admin/backfill-bodies` (Bearer CRON_SECRET)  
- Finds rows with `email_id` but empty `body_text`
- Re-fetches from Resend and patches body
- Pass `{ "test": true }` to preview

---

## Supabase Table: fl_inbound_emails

| Column | Notes |
|---|---|
| `id` | UUID PK |
| `email_id` | Resend inbound email ID — required for body/attachment fetch |
| `from_email`, `from_name` | Sender |
| `to_email` | Received mailbox |
| `subject`, `body_text`, `body_html` | Email content |
| `attachments` | JSONB — null if none; array of `{filename, content_type, size, url}` |
| `is_spam` | Spam heuristics result |
| `thread_id` | For reply threading |
| `read`, `replied` | Admin UI state |
| `direction` | inbound/outbound |

**Supabase project:** `ibtadbwtrxglujkzqofs` — ALWAYS this one, NEVER `ciggiwpztuxkmbaccrlp`

---

## Spam Heuristics

Checked in `isLikelySpam(fromEmail, subject)`:
- Subject patterns: trademark, copyright, dmca, wire transfer, bitcoin, etc.
- Domain patterns: .xyz, .pw, .top, known cold-email platforms
- Username: long consonant-only strings (bot-generated addresses)

---

## SERVICE_SENDER_PATTERNS (Do Not Forward to Owen)

Matched in `isServiceNotification(fromEmail)`:
- TikTok / ByteDance
- Higgsfield.ai, Ideogram.ai
- `noreply@`, `no-reply@`, `donotreply@`, `notifications@`, `alerts@`
- Vercel, Railway, Resend, GitHub, Supabase, Anthropic
- Generic: `support@`, `mailer-daemon`, `postmaster@`

**To add a new blocked sender:** append a regex to `SERVICE_SENDER_PATTERNS` in  
`src/app/api/email/inbound/route.ts` — no env var change needed.

---

## Loop Prevention

`isInternalSender = fromEmail.toLowerCase().endsWith("@fergusonlawja.com")`

When true: email is saved to DB but forward/WA/push/ops_ticket are ALL skipped.  
This prevents the morning digest email (sent FROM `contact@fergusonlawja.com`) from  
triggering an infinite loop if it somehow lands back in the inbound webhook.

---

## Deploy Checklist

1. `git pull origin main`
2. Make changes
3. `git add` + `git commit`
4. `vercel --prod --yes`
5. `vercel alias <deployment-url> ferguson-law.vercel.app`
6. Test: send email to `contact@fergusonlawja.com`, verify in admin + Owen's hotmail
7. Send email to `contact@fergusonlawja.com` FROM a service domain (e.g. test@tiktok.com) — verify NOT forwarded to Owen

---

## Testing Template

```bash
# 1. Test client email (should forward to Owen)
curl -X POST https://fergusonlawja.com/api/email/inbound \
  -H "Content-Type: application/json" \
  -d '{"type":"email.received","data":{"email_id":"test123","from":"client@gmail.com","to":"contact@fergusonlawja.com","subject":"Test enquiry","text":"Hello I need legal help"}}'

# 2. Test service email (should NOT forward to Owen)
curl ... -d '{"data":{"from":"noreply@tiktok.com",...}}'

# 3. Test attachment recovery (test mode)
curl -X POST https://fergusonlawja.com/api/admin/recover-attachments \
  -H "Authorization: Bearer <CRON_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"test":true}'

# 4. Test body backfill (test mode)
curl -X POST https://fergusonlawja.com/api/admin/backfill-bodies \
  -H "Authorization: Bearer <CRON_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"test":true}'
```

---

## Common Issues

| Symptom | Cause | Fix |
|---|---|---|
| Owen getting TikTok/Higgsfield emails | Sender not in SERVICE_SENDER_PATTERNS | Add pattern to `isServiceNotification()` |
| Owen getting Jordan's leads/inbox | Digest email routing wrong | Check `digest-morning/route.ts` — Owen's email must only contain `owenMsg` |
| Attachments not saved | Pre-Oct-29 email | Run `recover-attachments` endpoint |
| Empty email bodies | Pre-Sep-27 email | Run `backfill-bodies` endpoint |
| WA "waiting to be received" | Railway bot session dropped | Check `waSessionLive` in digest response; reconnect bot session |
| Infinite forward loop | Internal sender not filtered | Check `isInternalSender` — must cover all `@fergusonlawja.com` senders |