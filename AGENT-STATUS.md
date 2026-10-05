# Ferguson Law — Agent Status & Change Log

> Last updated: 2026-10-05
> Supabase project: **ibtadbwtrxglujkzqofs** (J Supreme Conglomerate — ONLY correct DB, NEVER ciggiwpztuxkmbaccrlp)
> Production URL: ferguson-law.vercel.app (MUST alias after every deploy)

---

## PUSH STATUS

**NOT pushed to production as of 2026-10-05. Jordan must explicitly approve before any deploy.**

Deploy sequence:
```
cd "C:\Users\jader\J Supreme Tech\ferguson-law"
git pull origin main
vercel deploy --prod --scope team_OvCeLYYttwt9SMpreFi8Fns5
vercel alias set <deployment-url> ferguson-law.vercel.app
```

---

## COMMITS READY FOR PRODUCTION (not pushed)

| Commit | Description |
|--------|-------------|
| 8118ebe | fix: Items 1+2 — mobile PWA push + WhatsApp button |
| a5b8440 | feat: Items 9/10/11 — 11 intake types + 1-click matter + provider-aware video |
| 34cbf77 | docs: AGENT-STATUS.md |
| 095a1f1 | fix: triple-quote useState bug + meeting_provider type on AttentionAppt.meta |
| ef68cf0 | fix: busy-state flicker in createClientFromAppt when called from createMatterFromAppt |
| 0417d92 | docs: full AGENT-STATUS rewrite |
| 15ca04c | feat: expand all 11 workflow types to client portal + admin (was only 2-3) |

---

## ITEM STATUS

### Item 1 — Mobile PWA push notifications (COMMITTED, not pushed)
Problem: Desktop push worked, mobile was silent. Owen missed 2 meetings.
Fix: src/app/api/push/subscribe/route.ts — commit 8118ebe
Test: Subscribe on mobile after deploy, confirm welcome push arrives.

### Item 2 — WhatsApp "Chat with Us" button (COMMITTED, not pushed)
Problem: Button was opening Jordan's number, not the client-facing number.
Fix: Commit 8118ebe
Test: Click Chat with Us on live site, confirm correct number opens.

### Item 3 — Attendance confirmation email x10 spam (DEPLOYED, verify live)
Problem: Confirmation email firing multiple times per booking.
Fix: Commit 3e28d99 — already deployed to production.
Test: Owen to confirm no duplicate emails after a booking.

### Item 4 — Email body "(no content available)" (DEPLOYED, verify live)
Problem: Admin email panel showing empty body text.
Fix: Commit 761b0c5 — already deployed.
Test: Owen to open admin Emails tab and confirm body text is visible.

### Item 5 — Create Matter FK database error (DEPLOYED, verify live)
Problem: Creating a matter threw a foreign key constraint error.
Fix: Commit 21c29dd — already deployed.
Test: Owen to create a matter and confirm no DB error.

### Item 6 — Revert Referral/Partnership Invitation page text (OPEN — not started)
Problem: Commit d61fc6c rewrote the copy. Owen wants the previous version.
Next agent: Run `git show d61fc6c` to see what changed, then restore the prior text.

### Item 7 — Hide past blocked calendar time slots (OPEN — not started)
Problem: Past blocked slots still visible in public booking list.
Next agent: Find where blocked slots are fetched and add filter: date >= today.

### Item 8 — Buyer's Guide ad post (OPEN — Jordan decision)
Not a code task. Owen asked Oct 4. Jordan reviewing.

### Item 9 — 7 new property intake workflow types (COMMITTED, not pushed)
Files changed:
- src/app/booking/type-select/page.tsx — MATTER_TYPES now 11 items, new SVG icons, MATTER_LABELS exported
- src/app/booking/page.tsx — MATTER_TYPE_LABELS updated
- src/app/api/client/start-matter/route.ts — intent type union expanded (commit 15ca04c)
- src/app/directory/client-login/page.tsx — signup intent state + dropdown expanded (commit 15ca04c)
- src/app/directory/client/page.tsx — start-matter state + dropdown expanded (commit 15ca04c)
- src/components/admin/AdminDashboard.tsx — WorkflowTemplatesTab dropdown expanded (commit 15ca04c)

New workflow IDs: transfer, power_of_attorney, power_of_attorney_limited, lost_title,
first_registration, adverse_possession, subdivision

Existing (unchanged): property_purchase, property_sale, lease_agreement, title_search

No DB migration needed — workflow_type is a plain string column in fl_matters.

WHERE EACH DROPDOWN APPEARS:
- /booking/type-select — public booking intake (11 tile grid, client picks before booking)
- /directory/client-login — signup form "What can we help you with?" (captured at account creation)
- /directory/client (empty-matters state) — authenticated client wants to self-open a matter
- Admin > WorkflowTemplatesTab > Create matter — admin opens a matter manually for a client

### Item 10 — Post-consultation 1-click matter creation (COMMITTED, not pushed)
File: src/components/admin/AppointmentAttentionPanel.tsx

Changes:
- createClientFromAppt() now returns Promise<string|null>, stores client ID in createdClientId state
- createMatterFromAppt() — resolves client first (auto-creates if needed), calls fl_open_matter RPC
- Matter title format: "${appt.name} — ${MATTER_LABELS[matterType]}"
- Replaced navigate-to-/admin button with: workflow type dropdown + "Open matter" 1-click button
- New state: createdClientId, matterType, matterCreated
- createClientFromAppt(silent=false) — pass silent=true when called from createMatterFromAppt

NOTE: Post-consultation SEND FOLLOWUP EMAIL was already in source code before this session.
src/app/api/admin/send-followup/route.ts — calls sendConsultationFollowUp(), sends client email
with admin BCC. This session only added the Create Matter UI; the email route was pre-existing.

### Item 11 — Provider-aware video call UI (COMMITTED, not pushed)
File: src/components/admin/AppointmentAttentionPanel.tsx

Changes:
- Join button: "Join Zoom" OR "Join video call (browser)" based on appt.meta.meeting_provider
- Status text also shows correct provider name

HOW MEETING CREATION WORKS (src/lib/meetings/create.ts — waterfall):
1. Zoom — if ZOOM_ACCOUNT_ID + ZOOM_CLIENT_ID + ZOOM_CLIENT_SECRET are set
2. Daily.co — if DAILY_API_KEY is set
3. Jitsi — always works, zero config, meet.jit.si/FergusonLaw-<id>

Every appointment stores meeting_provider ("zoom" | "daily" | "jitsi" | null).
null = legacy record, assume zoom. Jitsi/Daily links open in any browser.

### Item 12 — JamProp (CANCELLED)
Owen is not paying for or using JamProp. DO NOT integrate.
/value-estimator uses internal hardcoded parish/community price averages.
Do not add JamProp or NLA API calls without explicit sign-off from Jordan and Owen.

### Item 13 — Invoice settlement follow-up (NOT a code task)
Business/billing task. Jordan to handle.

### Item 14 — Community / Property Value Estimator (SCOPE UNDEFINED)
Owen: "Including the community would help" = neighborhood-level pricing for /value-estimator.
Currently uses hardcoded parish averages. Needs community/neighborhood data layer.
JamProp is cancelled. Do not build until Jordan/Owen define scope and data source.

---

## BUG FIXES CAUGHT IN AUDIT (this session)

1. Triple-quote bug — useState<string>(""") (3 quotes) in AppointmentAttentionPanel.tsx.
   Introduced by patch script string escaping. Fixed to useState<string>(""). Commit 095a1f1.

2. Missing type field — AttentionAppt.meta in AttentionOverview.tsx was missing
   meeting_provider?: string | null, causing 4 TypeScript errors. Fixed in commit 095a1f1.

3. Busy-state flicker — createMatterFromAppt called createClientFromAppt internally,
   inner function reset busy to null mid-flow, re-enabling the button during matter RPC.
   Fixed via silent param in commit ef68cf0.

4. Workflow types gap — 7 new types added to /booking/type-select but NOT to 3 other
   locations where matters are created. Fixed in commit 15ca04c.

tsc --noEmit exits 0 after all fixes.

---

## KEY RPC SIGNATURES (Supabase ibtadbwtrxglujkzqofs)

fl_admin_upsert_client(p_token, p_name, p_email, p_phone, p_type, p_country, p_notes)
  returns: string (client ID as plain string, not UUID object)

fl_open_matter(p_client_id uuid, p_workflow_type text, p_title text)
  returns: uuid

fl_is_admin(p_token text)
  returns: boolean

MEETING PROVIDER VALUES: "zoom" | "daily" | "jitsi" | null
null = legacy record, assume zoom

AUTH: Admin token validated via fl_is_admin(p_token). Token from localStorage key fl_admin_token.

---

## ALWAYS-ON RULES (every agent working on this repo must follow)

- Supabase: ALWAYS ibtadbwtrxglujkzqofs, NEVER ciggiwpztuxkmbaccrlp
- After every deploy: vercel alias set <url> ferguson-law.vercel.app + --scope team_OvCeLYYttwt9SMpreFi8Fns5
- Before editing or deploying: git pull origin main first
- Do NOT push to production without Jordan's explicit approval
- Do NOT add JamProp/NLA integration
- Do NOT delete client data
- Do NOT add code comments — only update AGENT-STATUS.md for documentation
