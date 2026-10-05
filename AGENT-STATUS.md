# Ferguson Law — Agent Status Log

> Last updated: 2026-10-05
> Session: Claude Sonnet 4.6 (worktree jsupremtech-mobile-hero-audit-6b2684)
> Supabase project: ibtadbwtrxglujkzqofs (J Supreme Conglomerate — ONLY correct DB)

---

## Items 1-2 (CRITICAL — commit 8118ebe, NOT pushed to production)
- Item 1 Mobile PWA push: Fixed in src/app/api/push/subscribe/route.ts
- Item 2 WhatsApp button: Fixed to use client phone not Jordan phone

## Items 3-5 (VERIFY LIVE)
- 3: spam fix commit 3e28d99 | 4: email content fix 761b0c5 | 5: matter FK fix 21c29dd
- Deployed to ferguson-law.vercel.app — Owen to confirm

## Item 6 (DONE) — referral page text reverted
## Item 7 (DONE) — past blocked slots hidden
## Item 8 (SKIP) — Buyers Guide ad post, Jordan decision

---

## Items 9-11 — Built 2026-10-05, commit a5b8440

### Item 9 — 7 new property intake types
Files: src/app/booking/type-select/page.tsx, src/app/booking/page.tsx

Added: transfer, power_of_attorney, power_of_attorney_limited, lost_title,
first_registration, adverse_possession, subdivision

MATTER_TYPES array now has 11 items. MATTER_LABELS + MATTER_TYPE_LABELS updated.
No DB changes needed — workflow_type is a plain string in fl_matters.

### Item 10 — Post-consultation gap closed
File: src/components/admin/AppointmentAttentionPanel.tsx

Already built (no change): sendFollowUp -> /api/admin/send-followup -> external email
Gaps fixed:
- createClientFromAppt() now returns Promise<string|null>, captures createdClientId
- New createMatterFromAppt(): auto-creates client if needed, calls fl_open_matter RPC
- Title format: "${appt.name} — ${MATTER_LABELS[matterType]}"
- UI: replaced navigate-to-/admin with matter-type dropdown + 1-click Open matter button
- New state: createdClientId, matterType, matterCreated

### Item 11 — Jitsi/provider-aware UI
File: src/components/admin/AppointmentAttentionPanel.tsx

Server-side already done (createMeetingRoom() Zoom->Daily->Jitsi fallback)
Gaps fixed:
- Join button: "Join Zoom" vs "Join video call (browser)" based on appt.meta.meeting_provider
- Status text updated to show correct provider name

---

## Items 12-14 — NOT built
- 12: JamProp cancelled — Owen not paying. Value estimator uses internal parish data. DO NOT add JamProp.
- 13: Invoice follow-up — business task, not code
- 14: Community feature — scope undefined, needs Owen decision

---

## Value Estimator architecture note
/value-estimator uses hardcoded internal parish/community price averages.
NO JamProp or NLA API integration. Intentional. Do not add JamProp without Jordan/Owen sign-off.

---

## Push status
NOT pushed to production as of 2026-10-05. Jordan must approve before push.

To deploy:
  cd "C:\Users\jader\J Supreme Tech\ferguson-law"
  git pull origin main
  vercel deploy --prod
  vercel alias ferguson-law.vercel.app  (MUST alias after every deploy)

---

## Key RPC signatures (Supabase ibtadbwtrxglujkzqofs)
fl_admin_upsert_client(p_token, p_name, p_email, p_phone, p_type, p_country, p_notes) -> string (client ID)
fl_open_matter(p_client_id, p_workflow_type, p_title) -> uuid
fl_is_admin(p_token) -> boolean

## meeting_provider values
"zoom" | "daily" | "jitsi" | null (null = legacy, assume zoom)