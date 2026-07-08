# Jarvis briefing — Ferguson Law platform
_Status as of 2026-06-26. Written for Jarvis (chief-of-staff) to relay to Jordan on request: "what's been added, and what we need to finalize."_

---

## One-line status
The Ferguson Law site has been rebuilt into a live client **platform** — site + booking + AI chat + CRM + in-place editor — running at **https://ferguson-law.vercel.app** (a separate project; the original pitch at ferguson-law-pitch.vercel.app is untouched). Core is working; a few keys + the client's inputs unlock the rest.

---

## ✅ What's been added (done & live unless noted)

1. **New Next.js platform** — full rebuild (Next 16 / React 19 / Supabase), separate Vercel project `ferguson-law`.
2. **Faithful homepage** — the approved editorial design, rebuilt as React, mobile-perfect.
3. **Real-calendar booking** — live availability (Mon–Fri, Jamaica time, taken slots greyed out), `FL-XXXXXX` reference, confirmation email; writes structured `appointments` + a CRM lead. *(Live.)*
4. **AI chatbot on FREE APIs** — wired to Groq → Gemini → OpenRouter fallback (no paid Anthropic), grounded in a firm knowledge base (services, fees, H.O.M.E., Jamaican home-buying), with law-firm guardrails (info, not advice). Falls back to a safe scripted reply when no key is set. *(Live; awaiting one free key to "go smart.")*
5. **Live chat + agent console** — `/agent`, real-time via Supabase; bot→human→WhatsApp handoff ladder, no dead ends. *(Live.)*
6. **One lead pipeline** — the contact form, booking, and chatbot all write to one `ferguson_leads` table.
7. **Consultation CRM** — `/admin` dashboard: leads, bookings, chats, with status updates; token-gated. *(Built this pass.)*
8. **In-place content editor** — `?edit=1` restores click-to-edit text/images + Publish, like the old pitch; reuses the firm's existing content store. *(Built this pass.)*
9. **Shared admin gate** — one back-office code (`fl-admin-7Q2x9KpZ`) unlocks both the editor and the CRM, with no service-role key shipped to the browser.
10. **Architecture + client docs** — chatbot/live-chat architecture spec, and a ready-to-send Owen update (WhatsApp + email + 12 firm-specific recommendations) with the live link embedded.

---

## 🔑 What we need to finalize everything

**Blocking the AI being smart:**
- **One free LLM key** — recommended **Groq** (console.groq.com/keys; free; supports the bot's actions). Gemini or OpenRouter also work. → paste it; redeploy; bot is smart.

**Blocking payments:**
- **WiPay merchant account** (API key + account #) — unlocks **pay-before-booking** and **free-appointment invite links**.

**Inputs from Owen (sharpen accuracy):**
- Real **fee schedule**, **office address**, and confirmed **hours** — to harden the bot's knowledge base and the site copy.

**Nice-to-have keys:**
- **Resend sending domain** + `FERGUSON_FROM_EMAIL` — branded booking-confirmation emails (currently skips/uses a default sender).
- **Supabase service-role key** — optional; the CRM already works via token-gated functions without it.

**Decisions:**
- Custom **domain** for the new platform, and **when to switch** the public site from the old pitch to the new build.

---

## 🗺️ Remaining roadmap (not yet built)
- Pay-to-book + free-invite links (needs WiPay).
- Animated H.O.M.E. logo on the homepage.
- More content / SEO pages (buying from abroad, NHT, closing costs) — also feeds the bot.
- Phase 3+ depth: client portal, digital KYC/AML, conveyancing matter tracker.
- Phase 8: self-managed professional directory (realtors / valuators / surveyors).

---

## Quick links
- Live platform: https://ferguson-law.vercel.app
- Back office (CRM): https://ferguson-law.vercel.app/admin  · code `fl-admin-7Q2x9KpZ`
- Edit mode: https://ferguson-law.vercel.app/?edit=1  · same code
- Live-chat console: https://ferguson-law.vercel.app/agent  · code `ferguson`
- Old pitch (unchanged): https://ferguson-law-pitch.vercel.app

> Jarvis: when Jordan asks for Ferguson Law status, summarize the ✅ list and lead with the two real blockers — the **Groq key** (smart bot) and the **WiPay account** (payments).
