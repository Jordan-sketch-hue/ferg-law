# Ferguson Law — AI Chatbot + Live Chat + WhatsApp
## Full architecture & conversation flow ("the gnosis framework")

This is the complete design for the firm's conversational layer. One widget, three
channels, one inbox. A visitor never has to know which one they're talking to.

---

## 1. The three channels (and why all three)

| Channel | Who answers | When it shines | Cost / effort |
|---|---|---|---|
| **AI chatbot** | Claude, grounded in the firm's knowledge | 24/7, instant, after-hours, FAQs, qualifying, booking | ~cents per chat, zero staffing |
| **Live chat** | A real person in the agent console | Office hours, nuanced/sensitive matters, closing a hot lead | staff time, but only when escalated |
| **WhatsApp** | Owen / staff on their phone | The client wants a human *now*, or to continue off-site | zero infra — you already use it |

The bot is the **front door**; live chat is the **escalation**; WhatsApp is the
**exit ramp** to a channel the client already trusts. The handoff ladder is the
whole point: **bot → live agent → WhatsApp**, never a dead end.

---

## 2. The "gnosis" framework — knowledge + tools + escalation

A good firm bot is not a FAQ parrot. It stands on three legs:

```
            ┌──────────────────────────────────────────────┐
            │                 THE BOT                       │
            │                                               │
   GNOSIS   │   1. KNOWLEDGE  (what it KNOWS)               │
 (grounding)│      src/lib/kb/ferguson.ts                   │
            │      • firm identity, founder bio             │
            │      • 6 practice areas + durations + "from"  │
            │        fees                                   │
            │      • H.O.M.E. 4-step pathway                │
            │      • Jamaica home-buying basics (NHT,        │
            │        conveyancing, closing costs)           │
            │      • hours, contact, FAQ                    │
            │                                               │
   TOOLS    │   2. TOOLS  (what it can DO)                  │
 (actions)  │      src/lib/chat/tools.ts                    │
            │      • book_consultation → ferguson_leads     │
            │      • capture_contact   → conversation       │
            │      • request_human     → status=waiting     │
            │                                               │
ESCALATION  │   3. GUARDRAILS + HANDOFF (what it WON'T do)  │
 (safety)   │      src/lib/chat/prompt.ts                   │
            │      • general info only, never legal advice  │
            │      • no fee/outcome guarantees              │
            │      • unsure / sensitive → offer human       │
            └──────────────────────────────────────────────┘
```

**Knowledge** keeps answers true to the firm. **Tools** turn a chat into a booked
consultation (the actual business goal). **Guardrails** keep a law firm safe —
the bot gives *information*, never *advice*, and escalates anything it shouldn't
touch. For a regulated profession, the guardrail leg is not optional.

---

## 3. Components & data model

```
 Visitor ──► ChatWidget (client, every page)
                 │  POST /api/chat { conversationId?, message }
                 ▼
            /api/chat/route.ts  (server, holds the secret keys)
                 │
        ┌────────┴─────────┐
        │ status == bot?   │── yes ─► Claude (model) ⇄ tools.ts ─► reply
        │                  │                                  └─► ferguson_leads
        │ status == agent? │── yes ─► just persist; DO NOT call the model
        └────────┬─────────┘
                 ▼
        Supabase  ── chat_conversations ── chat_messages ──► Realtime
                                                 │
              ┌──────────────────────────────────┴───────────────┐
              ▼                                                   ▼
      ChatWidget (visitor)                              Agent console / CRM inbox
      live-updates with agent replies                   /agent  (Phase 3: → /app CRM)
```

**Tables (`supabase/migrations/0002_chat.sql`):**

- `chat_conversations` — one per visitor session. `status` ∈
  `bot · waiting_agent · agent · closed`. Carries visitor name/email/phone as the
  bot captures them, plus `last_message_at` for inbox sorting.
- `chat_messages` — every line. `role` ∈ `visitor · bot · agent · system`.
- The conversation **`id` (a uuid) is a capability token**: it's unguessable, the
  widget only ever queries its own id, and it's stored in the visitor's
  `localStorage` so a returning visitor keeps their thread.
- Both tables are in the **Realtime** publication → agent replies appear in the
  visitor's widget instantly, and visitor messages light up the agent inbox.

---

## 4. The conversation flow, step by step

1. **Open** — widget loads, restores `conversationId` from localStorage (or starts
   fresh on first message). Bot greets.
2. **Visitor types** → `POST /api/chat`. Server stores the message, bumps
   `last_message_at`.
3. **Routing decision** (server):
   - `status == 'bot'` → call Claude with the system prompt (persona + KB) and the
     last ~20 messages. Claude may **call a tool** (book, capture contact, request
     human); the server executes it, feeds the result back, and Claude writes the
     final reply. Persist as `role='bot'`.
   - `status == 'waiting_agent'` or `'agent'` → **a human owns this thread.** The
     server only persists the visitor's message; it does **not** call the model.
     Realtime delivers it to the agent console.
4. **Escalation** — if the visitor clicks "Talk to a person" (or the bot calls
   `request_human`), status → `waiting_agent`. The agent console surfaces it.
5. **Agent reply** — agent types in `/agent`; message saved as `role='agent'`,
   status → `agent`. Realtime pushes it into the visitor's widget live.
6. **WhatsApp exit** — at any point the visitor can hit the WhatsApp button and
   continue on their phone (pre-filled message). Used heavily after hours.
7. **After hours / no agent online** — the bot handles everything and, when it
   can't, offers WhatsApp + "leave your number and we'll call you" (which fires
   `capture_contact` + a `ferguson_leads` row, so no lead is ever lost).

---

## 5. Resilience & guardrails (law-firm grade)

- **Works with no AI key** — if `ANTHROPIC_API_KEY` is absent, the route returns a
  friendly canned reply that still offers WhatsApp + a human + booking, and still
  logs the lead. The widget is never "broken" in a demo or an outage.
- **No silent failures** — every error path returns a usable message, never a bare
  500. The visitor always gets a way forward.
- **Information, not advice** — the system prompt forbids definitive legal advice,
  case-outcome predictions, and fee guarantees beyond published "from" prices.
- **PII discipline** — the agent console is access-gated (a stopgap code now;
  Supabase Auth roles in Phase 3). Appointments/leads are never exposed to anon
  reads.

---

## 6. Where it plugs into the rest of the platform

- **Leads** the bot captures land in the same `ferguson_leads` table as the contact
  form and the booking modal → one CRM pipeline (Phase 3).
- **Bookings** the bot makes go through the same availability engine as the
  calendar modal (Phase 2) → no double-booking.
- The standalone **`/agent`** console is the seed of the CRM's **live-chat inbox**;
  in Phase 3 it moves behind auth into `/app` alongside leads, matters and clients.

---

## 7. Configuration

| Env var | Purpose | Needed for |
|---|---|---|
| `ANTHROPIC_API_KEY` | the AI brain | bot answers (graceful without) |
| `CHAT_MODEL` | model id (default `claude-haiku-4-5-20251001`) | cost/quality tuning |
| `NEXT_PUBLIC_AGENT_CODE` | agent-console access code (stopgap) | live chat |
| `NEXT_PUBLIC_SUPABASE_URL` / `…_ANON_KEY` | DB + realtime | everything |
| `SUPABASE_SERVICE_ROLE_KEY` | server-side writes that bypass RLS | tools, inbox |

Default model is **Haiku** (cheap, fast — right for a public FAQ bot). Bump
`CHAT_MODEL` to `claude-sonnet-4-6` if you want richer answers.

---

## 8. Roadmap beyond v1

- Move `/agent` into the authenticated CRM inbox (Phase 3).
- Two-way **WhatsApp Business API** so the agent inbox and WhatsApp are literally
  the same thread (you already run a WhatsApp bot — wire it here).
- Feed the bot live **availability** so "book me Tuesday at 2" just works.
- Analytics: deflection rate, escalation rate, booked-from-chat conversion.
- Tighten the KB with Owen's real fee schedule + office address once confirmed.
