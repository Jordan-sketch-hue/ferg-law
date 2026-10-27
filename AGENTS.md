# Ferguson Law — Agent Handoff Document

> **CRITICAL RULES — READ FIRST**
> - DB is ALWAYS Supabase `ibtadbwtrxglujkzqofs` — NEVER `ciggiwpztuxkmbaccrlp`
> - Custom domain is ALWAYS `ferguson-law.com` — NEVER `*.vercel.app` in any reference, QA registry, or link
> - H.O.M.E. subdomain: `home.fergusonlaw.com`
> - NEVER delete: `fl_clients`, `fl_bookings`, `fl_matters`, `fl_inbound_emails`, `fl_matter_files`
> - After every deploy: `vercel alias set <deployment-url> ferguson-law.vercel.app`
> - ALWAYS `git pull origin main` before editing or deploying — local can be 30+ commits behind

---

## What this is

Full-stack law firm platform for Owen Ferguson (Ferguson Law, Jamaica).
Services: online booking + WiPay payment → consultation confirmation, AI chatbot, admin CMS, inbound email triage, H.O.M.E. property portal sub-brand, client portal with KYC + matter files + Zoom, push notifications, blast emails.

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 (App Router) / TypeScript |
| Styling | Tailwind 4 + custom CSS variables (see design system) |
| Database | Supabase `ibtadbwtrxglujkzqofs` (fl_* tables) |
| Auth | Supabase Auth (admin) + custom passkey/WebAuthn (admin) + access-code login (clients) |
| Payments | WiPay Jamaica — mock mode by default; flip to live via env only |
| Email | Resend — outbound + inbound webhook |
| Chat | Groq (llama-3.3-70b) → Gemini (2.0-flash) → OpenRouter fallback |
| Video | Zoom — meeting creation via API |
| Push | Web Push API (VAPID) |
| WhatsApp | Twilio or internal Cloud API |
| Fonts | Fraunces (serif) + Inter (sans) via next/font |

---

## Required Env Vars

| Var | Purpose |
|-----|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (ibtadbwtrxglujkzqofs) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key (browser client) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-only API routes) |
| `RESEND_API_KEY` | Email delivery + inbound webhook |
| `RESEND_WEBHOOK_SECRET` | Verify signed Resend inbound webhooks |
| `GROQ_API_KEY` | Chat LLM (primary — recommended) |
| `GEMINI_API_KEY` | Chat LLM fallback |
| `OPENROUTER_API_KEY` | Chat LLM fallback |
| `WIPAY_ENV` | `mock` (default) or `live` |
| `WIPAY_ACCOUNT_NUMBER` | WiPay merchant account (live only) |
| `WIPAY_API_KEY` | WiPay API key (live only) |
| `WIPAY_DEVELOPER_ID` | WiPay developer ID (live only) |
| `ZOOM_CLIENT_ID` | Zoom OAuth app client ID |
| `ZOOM_CLIENT_SECRET` | Zoom OAuth app secret |
| `ZOOM_ACCOUNT_ID` | Zoom server-to-server OAuth account |
| `VAPID_PUBLIC_KEY` | Web push VAPID public key |
| `VAPID_PRIVATE_KEY` | Web push VAPID private key |
| `VAPID_SUBJECT` | mailto: URI for VAPID |
| `CRON_SECRET` | Bearer token for cron route auth |
| `NEXT_PUBLIC_SITE_URL` | `https://ferguson-law.com` |
| `CHAT_PROVIDER_ORDER` | `groq,gemini,openrouter` (optional override) |

---

## Page Routes (42 total)

### Public / Marketing
| Route | Purpose |
|-------|---------|
| `/` | Homepage — firm overview, services, CTA to booking |
| `/faq` | FAQ accordion |
| `/glossary` | Legal terms glossary |
| `/get-started` | Lead capture / onboarding entry point |
| `/cost-estimator` | Property transaction cost estimator tool |
| `/value-estimator` | Property value estimator |

### Booking Flow
| Route | Purpose |
|-------|---------|
| `/booking` | Booking modal entry — service selection + slot picker |
| `/booking/type-select` | Select consultation type |
| `/booking/complete` | Booking confirmation / success screen |
| `/receipt` | WiPay payment receipt page |

### H.O.M.E. Portal (Ferguson Home)
| Route | Purpose |
|-------|---------|
| `/home` | H.O.M.E. brand landing |
| `/buyers-guide` | Property buyer's guide landing |
| `/buyers-guide/guide` | Full buyer's guide content |
| `/buyers-guide/payment` | WiPay payment for buyer's guide access |
| `/ebook` | H.O.M.E. ebook landing |
| `/ebook/access` | Ebook access gate (post-purchase) |

### Explainers (6)
| Route | Purpose |
|-------|---------|
| `/explainers/agent` | Real estate agent explainer |
| `/explainers/banker` | Banker/mortgage explainer |
| `/explainers/buyer` | Buyer's journey explainer |
| `/explainers/costs` | Transaction costs explainer |
| `/explainers/nht` | NHT (National Housing Trust) explainer |
| `/explainers/seller` | Seller's journey explainer |
| `/explainers/surveyor` | Surveyor explainer |

### Client Portal
| Route | Purpose |
|-------|---------|
| `/directory/client` | Client portal dashboard |
| `/directory/client-login` | Client portal login (access-code auth) |
| `/directory/*` | Partner/directory pages |
| `/auth` | Admin auth (Supabase + passkey) |
| `/auth/callback` | Supabase OAuth callback |
| `/reset` | Password reset |

### Admin (password-protected)
| Route | Purpose |
|-------|---------|
| `/admin` | Admin dashboard — bookings, CMS, analytics |
| `/admin/*` | Sub-sections: ebook leads, email, analytics, push, zoom, blast |

### Payments / Utility
| Route | Purpose |
|-------|---------|
| `/pay/mock` | Internal WiPay mock payment simulator |
| `/pwa` | PWA shell (service worker registration) |

---

## API Routes (90+ total)

### Booking
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/booking/slots` | GET | Return available slots for a service + date |
| `/api/booking/create` | POST | Create booking + initiate WiPay payment |
| `/api/admin/booking/create` | POST | Admin-side booking creation |

### Auth (admin + client)
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/forgot` | POST | Admin password reset email |
| `/api/auth/client-forgot` | POST | Client access-code recovery |
| `/api/auth/client-signup` | POST | Client self-registration |
| `/api/auth/passkey-register` | POST | WebAuthn passkey registration challenge |
| `/api/auth/passkey-verify` | POST | WebAuthn passkey authentication |
| `/api/webauthn/register` | POST | WebAuthn credential storage |
| `/api/webauthn/authenticate` | POST | WebAuthn authentication flow |
| `/auth/callback` | GET | Supabase OAuth redirect handler |

### Chat
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/chat` | POST | AI chatbot — streams reply via Groq/Gemini/OpenRouter |

### Admin CMS
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/admin/cms/notify` | POST | Send push notification |
| `/api/admin/cms/upload` | POST | Upload asset (matter files) |
| `/api/admin/cms/payment` | POST | Record manual payment |
| `/api/admin/cms/receipt` | GET | Fetch receipt data |
| `/api/admin/cms/mark-read` | POST | Mark email/message as read |
| `/api/admin/cms/purge-client` | DELETE | Remove client record (soft) |
| `/api/admin/cms/invite-client` | POST | Send client portal invite |

### Email
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/email/send` | POST | Transactional email send via Resend |
| `/api/email/inbound` | POST | Resend inbound webhook → fl_inbound_emails |
| `/api/admin/send-email` | POST | Admin compose + send email to client |
| `/api/admin/sent-emails` | GET | List sent emails for a client |
| `/api/admin/suggest-reply` | POST | AI-assisted reply drafting |
| `/api/admin/resend-confirmation` | POST | Resend booking confirmation email |
| `/api/admin/send-followup` | POST | Send post-consultation follow-up |

### Push Notifications
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/push/subscribe` | POST | Register push subscription |
| `/api/push/send` | POST | Send push to subscriber(s) |
| `/api/admin/push-test` | POST | Test push from admin panel |
| `/api/admin/push-unsubscribe` | DELETE | Remove push subscription |

### Ebook / Buyer's Guide Payments
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/ebook/purchase` | POST | Initiate WiPay payment for ebook |
| `/api/ebook/return` | GET | WiPay return handler for ebook |
| `/api/ebook/register` | POST | Grant ebook access post-payment |
| `/api/payments/buyers-guide` | POST | Initiate WiPay payment for buyer's guide |
| `/api/payments/return` | GET | WiPay return handler (booking + buyer's guide) |

### Cron (require Bearer CRON_SECRET)
| Route | Schedule | Purpose |
|-------|----------|---------|
| `/api/cron/reminders` | Daily | Send booking reminder emails |
| `/api/cron/nurture` | Weekly | Nurture sequence emails to leads |
| `/api/cron/digest-morning` | Daily 6AM | Morning digest to admin |
| `/api/cron/digest-evening` | Daily 6PM | Evening digest to admin |
| `/api/cron/weekly-digest` | Weekly | Weekly summary report |
| `/api/cron/monthly-report` | Monthly | Monthly analytics report |
| `/api/cron/valuation-scraper` | Weekly | Scrape/update property valuations |

### Client Portal
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/client/kyc` | POST | Submit KYC documents |
| `/api/client/start-matter` | POST | Open a new legal matter |
| `/api/client/file-url` | GET | Get signed URL for matter file download |
| `/api/client/delete-account` | DELETE | Client self-deletion request |
| `/api/client/export-data` | GET | GDPR-style data export |
| `/api/client/notification-prefs` | PATCH | Update notification preferences |

### Zoom
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/admin/zoom/create-meeting` | POST | Create Zoom meeting for booking |
| `/api/admin/zoom/upcoming` | GET | List upcoming Zoom meetings |
| `/api/admin/zoom/reschedule` | PATCH | Reschedule meeting |
| `/api/admin/zoom/cancel` | DELETE | Cancel meeting |
| `/api/admin/zoom/recreate` | POST | Recreate meeting (link expired) |
| `/api/admin/zoom/resend` | POST | Resend Zoom invite email |

### Blast Email
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/blast/parse` | POST | Parse uploaded CSV for blast recipients |
| `/api/blast/upload-image` | POST | Upload image for blast email |
| `/api/blast/gen-body` | POST | AI-generate blast email body |
| `/api/blast/send` | POST | Send blast email campaign |

### Directory / Partners
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/directory/partner-joined` | POST | Record partner directory join |

### Notifications / Analytics / Lead
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/notifications` | GET/POST | Get/update in-app notifications |
| `/api/pwa/analytics` | POST | Track PWA install/usage events |
| `/api/analytics/track` | POST | General event tracking |
| `/api/lead` | POST | Lead capture form submission |

### Email Drafts (admin)
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/email-draft/load` | GET | Load saved email draft |
| `/api/email-draft/save` | POST | Save email draft |
| `/api/email-draft-ai` | POST | AI-assisted email draft generation |

---

## Key Library Functions

### `src/lib/booking/services.ts`
| Export | Signature | Purpose |
|--------|-----------|---------|
| `SERVICE_META` | `Record<ServiceId, ServiceMeta>` | Canonical service catalog — id, title, durationMin for all 6 services |
| `isServiceId(v)` | `(v: unknown) => v is ServiceId` | Type guard for service IDs |
| `serviceTitle(id)` | `(id: string) => string` | Resolve service display name from ID |

Services: `corporate`, `realestate`, `family`, `divorce`, `ip`, `sports` — all 20 min, all J$8,000.

### `src/lib/booking/fees.ts`
| Export | Signature | Purpose |
|--------|-----------|---------|
| `CONSULT_FEES` | `Record<ServiceId, number>` | Flat J$8,000 fee per service |
| `CONSULT_DURATION_MIN` | `number` | 20 minutes (constant) |
| `consultFee(serviceId)` | `(serviceId: string) => number` | Lookup fee by service ID |
| `formatJmd(amount)` | `(amount: number) => string` | Format JMD display ("J$8,000") |

### `src/lib/booking/availability.ts` (inferred)
- Exports `ServiceId` type (union of 6 service slugs)
- Exports slot availability logic used by `/api/booking/slots`

### `src/lib/chat/llm.ts`
| Export | Signature | Purpose |
|--------|-----------|---------|
| `hasAnyLLMKey()` | `() => boolean` | True if at least one LLM provider key is set |
| `generateReply(opts)` | `({system, messages, maxTokens?}) => Promise<LLMResult>` | Try providers in order (Groq → Gemini → OpenRouter); returns first success |
| `ChatMsg` | type | `{role: "user"\|"assistant", content: string}` |
| `LLMResult` | type | `{ok: true, text, provider}` or `{ok: false, error}` |

Provider order controlled by `CHAT_PROVIDER_ORDER` env var. Default: `groq,gemini,openrouter`. Text-only — no tool calling.

### `src/lib/payments/wipay.ts`
| Export | Signature | Purpose |
|--------|-----------|---------|
| `isLive()` | `() => boolean` | True only when WIPAY_ENV=live + WIPAY_ACCOUNT_NUMBER + WIPAY_API_KEY all set |
| `createPayment(args)` | `(CreatePaymentArgs) => Promise<CreatePaymentResult>` | Create WiPay hosted checkout URL (or mock URL) |
| `parseReturn(query)` | `(Record<string, string|undefined>) => ParsedReturn` | Normalize WiPay return params → `{orderId, status, txn}` |
| `CreatePaymentArgs` | type | `{amount, orderId, customer, returnUrl}` |
| `CreatePaymentResult` | type | `{payUrl, mode: "mock"\|"live"}` |
| `ParsedReturn` | type | `{orderId, status: "paid"\|"failed", txn}` |

Mock mode is default — no env change needed. Live mode requires three env vars. Falls back to mock if live call fails.

### `src/lib/payments/fees.ts`
See booking services section above.

### `src/lib/supabase/client.ts`
| Export | Signature | Purpose |
|--------|-----------|---------|
| `createClient()` | `() => SupabaseClient` | Browser Supabase client (anon key) — CLIENT COMPONENTS ONLY |

Server routes use `createClient` from `@supabase/ssr` with service role key directly.

### `src/lib/whatsapp.server.ts`
- Server-only WhatsApp message sending
- Used by booking confirmation flow

### `src/lib/analytics.ts`
- Event tracking helpers
- Used by `/api/analytics/track`

### `src/lib/partners/api.ts`
- Directory partner CRUD operations
- Used by `/api/directory/*`

### `src/lib/meetings/create.ts`
- Zoom meeting creation wrapper
- Uses `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`, `ZOOM_ACCOUNT_ID`

---

## Key Components

| File | Purpose |
|------|---------|
| `src/components/chat/ChatWidget.tsx` | Floating AI chat widget — appears on all public pages |
| `src/components/pwa/BiometricLogin.tsx` | WebAuthn passkey login for PWA |
| `src/components/pwa/BookingPushPrompt.tsx` | Push notification opt-in after booking |
| `src/components/pwa/InstallPrompt.tsx` | PWA install banner |
| `src/components/pwa/NotificationCenter.tsx` | In-app notification center |
| `src/components/admin/AnalyticsTab.tsx` | Admin analytics dashboard tab |
| `src/components/admin/EbookLeadsTab.tsx` | Admin ebook purchase leads tab |
| `src/components/editor/ContentApply.tsx` | CMS content editor/applier |

---

## Supabase Tables (ibtadbwtrxglujkzqofs — fl_* namespace)

| Table | Purpose |
|-------|---------|
| `fl_bookings` | Consultation bookings (service, slot, client, status, payment) |
| `fl_clients` | Client portal accounts (access codes, KYC status) |
| `fl_matters` | Legal matters per client |
| `fl_matter_files` | Matter document uploads (signed URLs) |
| `fl_inbound_emails` | Inbound emails from Resend webhook |
| `fl_push_subscriptions` | Web push subscriptions |
| `fl_leads` | Lead form submissions |
| `fl_analytics` | Event tracking data |
| `fl_ebook_purchases` | Ebook/buyer's guide purchases |
| `fl_directory_partners` | Directory/partner records |
| `fl_email_drafts` | Saved email drafts (admin) |
| `fl_notifications` | In-app notifications |

---

## Workflow Maps

### 1. Booking + Payment Workflow
```
Visitor → /booking → select service → pick slot (/api/booking/slots)
  → enter details → /api/booking/create
  → createPayment() → mock URL (/pay/mock) or WiPay hosted URL
  → WiPay return → /api/payments/return → parseReturn()
  → if paid: confirm booking, send email (Resend), WhatsApp notify, Zoom meeting (optional)
  → redirect → /booking/complete
```
- All 6 services: J$8,000, 20 min
- Mock mode default until WIPAY_ENV=live + creds set
- Booking locked until payment confirmed

### 2. Auth Workflow (Admin)
```
/auth → email + password → Supabase Auth
  → OR passkey → /api/auth/passkey-verify → WebAuthn challenge
  → JWT cookie → protected /admin routes
```

### 3. Auth Workflow (Client Portal)
```
/directory/client-login → enter access code
  → /api/auth/client-signup (new) or lookup existing
  → session cookie → /directory/client dashboard
  → can view matters, upload KYC, download files, update notification prefs
```

### 4. Inbound Email Workflow
```
Email arrives → Resend inbound route (MX = Resend)
  → webhook POST → /api/email/inbound
  → insert into fl_inbound_emails
  → admin sees in /admin CMS email tab
  → admin replies via /api/admin/send-email
  → AI reply assist via /api/admin/suggest-reply
```

### 5. Chat Workflow
```
Visitor → ChatWidget → POST /api/chat → generateReply()
  → tries Groq → Gemini → OpenRouter
  → returns text reply
  → explicit booking → UI triggers booking modal (NOT the LLM)
  → explicit human handoff → admin notified
```

### 6. WiPay Mock → Live Flip
```
Current: WIPAY_ENV=mock (default) — /pay/mock simulator
  → set WIPAY_ENV=live + WIPAY_ACCOUNT_NUMBER + WIPAY_API_KEY + WIPAY_DEVELOPER_ID
  → wipay.ts isLive() = true → real WiPay API calls
  → TODO(WiPay-approval): confirm endpoint param names against merchant dashboard
```

### 7. Push Notification Workflow
```
User opts in → /api/push/subscribe → fl_push_subscriptions
Admin sends → /api/push/send → Web Push API (VAPID)
  → OR /api/admin/push-test (dev)
  → sw.js handles `push` event → notification displayed
  → /api/pwa/analytics tracks install/engagement
```

---

## Design System

### CSS Custom Properties (defined in `src/app/globals.css`)
| Token | Value | Use |
|-------|-------|-----|
| `--ink` | `#15130E` | Primary text, buttons |
| `--ink-2` | `#2A2620` | Warm charcoal accents |
| `--paper` | `#F6F2EA` | Page background (warm cream) |
| `--paper-2` | `#FBF8F1` | Slightly lighter surfaces |
| `--gold` | `#C8A65C` | Brand gold — CTAs, eyebrows, accents |
| `--gold-deep` | `#A8853E` | Darker gold — eyebrow text, hover states |
| `--sage` | `#9C7C3C` | Muted gold accent |
| `--text` | `#24211B` | Body copy |
| `--muted` | `#69736D` | Secondary/lead text |
| `--line` | `rgba(18,16,12,.12)` | Borders |
| `--r` | `18px` | Border radius |
| `--maxw` | `1180px` | Max container width |

### Typography
| Token | Font | Use |
|-------|------|-----|
| `--serif` | Fraunces | All headings (h1–h4) |
| `--sans` | Inter | Body, buttons, labels |

Injected via `next/font` in `layout.tsx` as CSS vars `--font-fraunces` and `--font-inter`.

### Utility Classes
| Class | Purpose |
|-------|---------|
| `.wrap` | Max-width container (1180px, 24px padding) |
| `.btn` | Base button (pill shape, 999px radius) |
| `.btn-primary` | Ink background, cream text |
| `.btn-gold` | Gold gradient, ink text, shadow |
| `.btn-ghost` | Transparent, ink border |
| `.eyebrow` | Uppercase label with gold leading line |
| `.section` | 96px vertical padding |
| `.lead` | 1.12rem muted subtitle text |

---

## UI/UX Rules
- All CTAs gold (`.btn-gold`) for primary actions; ink (`.btn-primary`) for secondary
- Headings always Fraunces serif
- Warm cream `--paper` background — not white
- Gold eyebrow labels precede every section heading
- Mobile-first — `.wrap` padding ensures 24px gutters on all widths
- Chat widget floats bottom-right on all public pages
- Push opt-in appears AFTER booking completion (not before)

---

## QA Checklist

### Critical Paths (must pass every deploy)
- [ ] `/` loads without JS errors
- [ ] Booking modal opens, service selection works, slots load from `/api/booking/slots`
- [ ] Mock payment flow: book → `/pay/mock` → click "Pay" → `/booking/complete` confirmation
- [ ] Chat widget opens and receives reply (Groq live key required)
- [ ] Admin login at `/auth` succeeds (Supabase + passkey)
- [ ] `/admin` dashboard loads bookings, emails, analytics tabs
- [ ] Inbound email → `fl_inbound_emails` insert (test via Resend webhook)
- [ ] Client portal login at `/directory/client-login` with valid access code
- [ ] Push subscription saves to `fl_push_subscriptions`

### Secondary Checks
- [ ] `/cost-estimator` form calculates without errors
- [ ] `/ebook/access` gated behind purchase (unauthenticated → redirect)
- [ ] `/buyers-guide/payment` WiPay flow completes
- [ ] Cron routes return 200 with CRON_SECRET header
- [ ] All API routes return JSON (no HTML error pages leaking)
- [ ] `npx tsc --noEmit` → zero errors
- [ ] No references to `ciggiwpztuxkmbaccrlp` anywhere in codebase

### After Every Deploy
- [ ] `vercel alias set <new-deployment-url> ferguson-law.vercel.app`
- [ ] Visit `https://ferguson-law.com` — confirm DNS resolves correctly
- [ ] Check `/api/booking/slots` returns valid JSON

---

## Custom Domain
- **Primary:** `https://ferguson-law.com`
- **H.O.M.E.:** `https://home.fergusonlaw.com`
- **NEVER reference:** `*.vercel.app` domains in any client-facing or QA context
- **Vercel project alias:** `ferguson-law.vercel.app` (must be re-aliased after every deploy)

---

## Known Gotchas

1. **Deploy alias required:** `vercel --prod` alone does NOT update `ferguson-law.vercel.app`. Always run `vercel alias set` after every deploy.

2. **Git pull before edit:** Local can be 32+ commits behind remote. ALWAYS `git pull origin main` first.

3. **WiPay mock default:** `WIPAY_ENV` defaults to mock. No live payments until WIPAY_ENV=live + 3 creds set. The `parseReturn()` function has TODOs for confirming param names once merchant account is approved.

4. **LLM fallback chain:** Chat requires at least ONE of `GROQ_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY`. If none set, chat returns "no provider configured".

5. **Inbound email = Resend ONLY:** MX records point to Resend. NEVER add forwardemail.net or any other MX. Webhook → `/api/email/inbound` → `fl_inbound_emails`.

6. **Client auth = access codes:** Clients do NOT use Supabase Auth. They use access codes stored in `fl_clients`. Admin uses Supabase Auth + WebAuthn passkey.

7. **DB project:** All fl_* tables live in `ibtadbwtrxglujkzqofs`. The dead project `ciggiwpztuxkmbaccrlp` must NEVER be written to. Grep for it if you suspect stale imports.

8. **Supabase client split:** `src/lib/supabase/client.ts` exports browser client (anon key). Server routes MUST import `createServerClient` from `@supabase/ssr` with service role key — never use the browser client in API routes.

9. **WiPay live TODOs:** `wipay.ts` has multiple `TODO(WiPay-approval)` comments — confirm endpoint path, param names, and return-hash verification against the merchant dashboard before going live.

10. **H.O.M.E. = separate brand:** Home/property content is a sub-brand under `home.fergusonlaw.com`. Do not fold H.O.M.E. pages into the Ferguson Law main nav.

---

## SOP for This Project

1. `git pull origin main` in `C:\Users\jader\projects\ferg-law`
2. Basis pre-check: `POST https://reality-encoder.vercel.app/api/encode`
3. Make changes
4. `npx tsc --noEmit` — must be zero errors
5. `vercel deploy --prod`
6. `vercel alias set <deployment-url> ferguson-law.vercel.app`
7. Verify `https://ferguson-law.com` live
8. Run QA checklist critical paths
9. Basis post-encode: `POST https://reality-encoder.vercel.app/api/encode`
