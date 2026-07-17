import { SITE } from "@/lib/site";
import { faqAsText } from "@/lib/faq";

/**
 * FIRM_KB — the chatbot's grounding ("gnosis").
 *
 * Everything the Ferguson Law concierge bot is allowed to assert lives here.
 * Keep it accurate to the live site and the approved pitch. The model is
 * instructed (see src/lib/chat/prompt.ts) never to invent facts beyond this KB.
 *
 * Contact + brand values are pulled from SITE so there is a single source of
 * truth and the bot never quotes a stale phone number or email.
 */

export interface PracticeArea {
  name: string;
  blurb: string;
  fromFee: string; // "from" price — never a guarantee
  duration: string; // typical consult length
}

export const PRACTICE_AREAS: PracticeArea[] = [
  {
    name: "Corporate & Commercial",
    blurb:
      "Company formation and registration, shareholder and partnership agreements, contracts, commercial transactions, and corporate compliance — informed by 20+ years of banking and finance experience.",
    fromFee: "J$8,000",
    duration: "20 min",
  },
  {
    name: "Real Estate & Conveyancing",
    blurb:
      "Buying and selling property, title transfers, sale agreements, due diligence, and the full conveyancing process for residents and the diaspora.",
    fromFee: "J$8,000",
    duration: "20 min",
  },
  {
    name: "Family & Estate",
    blurb:
      "Wills, probate and administration of estates, powers of attorney, and family matters handled with care and discretion.",
    fromFee: "J$8,000",
    duration: "20 min",
  },
  {
    name: "Divorce & Matrimonial",
    blurb:
      "Separation, custody, maintenance and settlements handled with discretion and care.",
    fromFee: "J$8,000",
    duration: "20 min",
  },
  {
    name: "Intellectual Property",
    blurb:
      "Trademarks, copyright and IP protection for creators, brands and businesses.",
    fromFee: "J$8,000",
    duration: "20 min",
  },
  {
    name: "Sports Law",
    blurb:
      "Contracts, image rights and representation for athletes, clubs and sporting bodies.",
    fromFee: "J$8,000",
    duration: "20 min",
  },
];

const practiceAreasText = PRACTICE_AREAS.map(
  (a) =>
    `- ${a.name} (${a.fromFee}, typical consult ${a.duration}): ${a.blurb}`,
).join("\n");

export const FIRM_KB = `
# FERGUSON LAW — FIRM KNOWLEDGE BASE

## Identity
- Firm: ${SITE.name}
- Tagline: "${SITE.tagline}"
- Location: 22B Old Hope Road, Kingston 5, Jamaica. In-person meetings are by appointment only.
- ${SITE.name} is a modern Jamaican law firm that pairs deep legal expertise with
  decades of banking and finance experience — a distinctive edge on commercial,
  real-estate and financial matters.

## Founder
- ${SITE.founder} — ${SITE.founderRole}.
- Attorney-at-Law with 10+ years in practice, on top of 20+ years in banking and
  finance, giving an uncommon command of the commercial and financial side of legal work.
- Called to the Bar after Norman Manley Law School (2013).
- Postgraduate qualifications in law and in business from the University of London.
- A Justice of the Peace (JP).
- Member of the Jamaican Bar and an International Bar association.

## Practice areas (every initial consultation is a flat J$8,000 / US$50 for 20 minutes)
${practiceAreasText}

Note on fees: an initial consultation is a flat J$8,000 (about US$50) for 20 minutes,
the same for any matter. Legal fees for the work itself are separate, depend on the
specifics, and are confirmed by the firm directly. Your consultation fee is credited
toward your legal fees once you engage Ferguson Law.

## H.O.M.E. — Home Ownership Made Easy
- ${SITE.name} powers H.O.M.E., a platform that guides Jamaicans (at home and abroad)
  through buying a home, step by step.
- The journey has four stages: Assess → Find → Finance → Close.
  - Assess: understand your readiness, budget and eligibility.
  - Find: identify a suitable property.
  - Finance: line up a mortgage / financing.
  - Close: complete the legal conveyancing and take ownership.
- Platform link: ${SITE.homeApp}

## General Jamaica home-buying basics (general information only)
- NHT (National Housing Trust): contributors can access NHT mortgage benefits toward a
  home purchase; eligibility depends on your contribution history.
  NHT loan limits (subject to eligibility):
  - Houses/apartments (standard open market): 1 applicant up to J$9 million; 2 co-applicants up to J$17 million; 3 co-applicants up to J$23 million.
    Special limit: single applicants purchasing a qualifying property priced at J$14 million or less may access up to J$12 million.
  - Land/residential lots only: 1 applicant up to J$5 million; 2 co-applicants up to J$7 million; 3 co-applicants up to J$10.5 million.
  IMPORTANT: Land purchase limits are significantly lower than house/apartment limits. Always clarify which category applies to the contributor's specific purchase and communicate both sets of limits so the contributor understands the distinction.
- Down payment: buyers put down a deposit when the sale agreement is signed; the exact amount is
  negotiated per transaction and is not a fixed percentage — Owen will confirm the right figure for
  each client's deal.
- Conveyancing steps (typical): sale agreement → down payment → searches and due diligence →
  financing/mortgage → transfer of title and registration → closing and handover.
- Closing costs to budget for usually include: stamp duty and transfer tax, registration
  fees, and legal/conveyancing fees. These are shared or split by agreement and vary with
  the property value — figures should always be confirmed for the specific transaction.
- This is general guidance, not legal advice for any specific purchase. A consultation
  gives you accurate numbers and steps for your situation.

## Contact & hours
- WhatsApp: ${SITE.whatsappDisplay}
- Email: ${SITE.email}
- Website: ${SITE.website}
- Chatbot: Available 24/7 for information, questions, and booking.
- The chatbot can check real-time available consultation slots and book a specific time directly.
- Office hours: Monday–Friday, 9:00 am–5:00 pm Jamaica time.
- Online booking is available anytime — consultations are confirmed during office hours.
- In-person meetings are by appointment only. Consultations are also available by video or phone.

## FAQ
Q: Where is your office? / What is your address?
A: Our address for deliveries is 22B Old Hope Road, Kingston 5, Jamaica.
   Please note that in-person meetings are by appointment only.
   Consultations are also available by video call or phone.

Q: How do I book a consultation?
A: I can book it right here in the chat — I'll take your name, contact and the matter,
   and the firm will confirm a time. You can also message us on WhatsApp (${SITE.whatsappDisplay}).

Q: What does a consultation cost?
A: Every consultation is a flat J$8,000 (about US$50) for 20 minutes, the same for any
   matter. Your consultation fee is credited toward your legal fees once you engage
   Ferguson Law.

Q: Do you help Jamaicans living overseas (the diaspora)?
A: Yes. ${SITE.name} regularly works with the diaspora — including conveyancing, estate
   matters and notarial/certified documents — and can handle much of it remotely.

Q: Can you help me buy a home in Jamaica?
A: Yes — through both our conveyancing practice and the H.O.M.E. platform, which walks you
   through Assess → Find → Finance → Close. ${SITE.homeApp}

Q: Can I walk in to your office?
A: In-person meetings are by appointment only. Book a consultation online or send a WhatsApp message to arrange a time. Video and phone consultations are also available.

Q: Can you give me legal advice on my specific situation?
A: I can share general information, but specific legal advice needs an attorney who has
   reviewed your matter. I'm happy to book a consultation or connect you with the team.

Q: Can I speak to a real person?
A: Of course — reach us directly on WhatsApp at ${SITE.whatsappDisplay}, or book a consultation and the firm will call you back.

## Full FAQ (firm services, fees, and overseas property buyers)
The following are the firm's published answers. Use them verbatim where possible.

${faqAsText()}
`.trim();

/** Convenience accessor in case callers prefer a function form. */
export function kbAsText(): string {
  return FIRM_KB;
}
