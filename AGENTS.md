# Ferguson Law — Agent Context

## What this project is
Ferguson Law Jamaica client site. Live at **ferguson-law.vercel.app**.
Property law firm site with admin, CMS, chatbot, booking, directory, and resource tools.

## Stack
- Next.js (App Router, TypeScript)
- Tailwind CSS
- Supabase project: `ibtadbwtrxglujkzqofs` (J Supreme Conglomerate — ALWAYS use this, NEVER `ciggiwpztuxkmbaccrlp`)
- Vercel (hosting)

## Key routes
```
/                       → homepage
/value-estimator        → Valuation Estimator tool (CURRENTLY DISABLED — see below)
/cost-estimator         → Cost Estimator® (active)
/buyers-guide           → Buyer's Guide
/explainers             → Explainers
/glossary               → Glossary
/faq                    → FAQ
/directory              → Find a Pro
/admin                  → Admin panel
/auth                   → Auth
```

## File structure
```
src/
  app/
    value-estimator/
      page.tsx                  ← server page wrapper
      ValuationEstimatorClient.tsx ← client component with tool logic
  components/
    site/
      Nav.tsx                   ← NAV_LINKS + RESOURCE_LINKS arrays
    admin/
      SiteContentTab.tsx        ← CMS content management
  lib/
    site.ts                     ← SITE constants
    analytics.ts                ← track() helper
```

## Value Estimator — ACTIVE
The Valuation Estimator tool is live at `/value-estimator`.
- Bug fixed 2026-10-09: `fetchCommunities()` was never called in `useEffect`, so community-level rates never loaded
- Nav link restored in `RESOURCE_LINKS` in `Nav.tsx`
- Queries `valuation_benchmarks` (parish rates) and `community_benchmarks` (scheme-level rates) from Supabase; falls back to hardcoded rates if tables are empty

## Critical deployment rules
1. ALWAYS `git pull origin main` before editing or deploying — local can be commits behind
2. After every deploy: `vercel alias set <deployment-url> ferguson-law.vercel.app`
   (--prod alone does NOT update the alias)
3. ALWAYS use Supabase project `ibtadbwtrxglujkzqofs`

## Deployment
```bash
vercel deploy --prod
vercel alias set <deployment-url> ferguson-law.vercel.app
```

## Change log
| Date | Change | File | Agent |
|------|--------|------|-------|
| 2026-10-09 | Created AGENTS.md — baseline documentation | `AGENTS.md` | Claude (Jordan session) |
| 2026-10-09 | Disabled Valuation Estimator — removed nav link, page shows unavailable message | `Nav.tsx`, `value-estimator/page.tsx` | Claude (Jordan session) |
| 2026-10-09 | Digest spam filter — added `.eq("is_spam", false)` to morning digest unread query; null-safe name fallbacks for appointments, leads, inbox; expanded inbound spam patterns to catch cold email platforms | `digest-morning/route.ts`, `email/inbound/route.ts` | Claude (Jordan session) |
| 2026-10-09 | Re-enabled Valuation Estimator — fixed missing `fetchCommunities()` call in useEffect (community rates never loaded); restored nav link and page | `ValuationEstimatorClient.tsx`, `Nav.tsx`, `value-estimator/page.tsx` | Claude (Jordan session) |

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
