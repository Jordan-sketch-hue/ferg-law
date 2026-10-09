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

## Value Estimator — DISABLED
The Valuation Estimator tool is **disabled** as of 2026-10-09 pending a fix.
- Nav link removed from `RESOURCE_LINKS` in `Nav.tsx`
- `/value-estimator` page shows a "temporarily unavailable" message

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

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
