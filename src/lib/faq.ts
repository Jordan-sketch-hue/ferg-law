import { SITE } from "@/lib/site";

/**
 * FAQ — single source of truth.
 *
 * Consumed by:
 *  - the public /faq page (src/app/faq/page.tsx)
 *  - the chatbot grounding (src/lib/kb/ferguson.ts → FIRM_KB)
 *
 * Keep every answer accurate to what the firm can actually deliver. Contact
 * details pull from SITE so a phone/email change never leaves a stale answer.
 *
 * Source: Ferguson Law "Frequently Asked Questions" + "Overseas Buyers FAQ"
 * supplied by the firm.
 */

export interface FaqItem {
  q: string;
  /** Intro paragraph(s). Use "\n\n" to separate paragraphs. */
  a: string;
  /** Optional bullet list rendered under the intro. */
  bullets?: string[];
  /** Optional closing paragraph rendered under the bullets. */
  after?: string;
}

export interface FaqGroup {
  id: string;
  title: string;
  intro?: string;
  items: FaqItem[];
}

export const FAQ_GROUPS: FaqGroup[] = [
  {
    id: "general",
    title: "Real Estate & Services",
    intro: "The questions clients ask most often about property, conveyancing, and working with the firm.",
    items: [
      {
        q: "What services does Ferguson Law provide?",
        a: "Ferguson Law provides legal services in the areas of:",
        bullets: [
          "Real Estate and Conveyancing",
          "Property Development",
          "Mortgages and Loan Documentation",
          "Commercial and Business Law",
          "Intellectual Property Law",
          "Sports Law and Athlete Representation Matters",
          "Wills and Estate Planning",
          "Probate and Letters of Administration",
          "Contract Drafting and Review",
          "Divorce",
        ],
      },
      {
        q: "Does Ferguson Law assist first-time homebuyers?",
        a: "Yes. Ferguson Law regularly assists first-time homebuyers with every stage of the purchase process, including contract review, title investigations, mortgage transactions, NHT purchases, developer purchases, and closing procedures.",
      },
      {
        q: "Does Ferguson Law work with clients living overseas?",
        a: "Absolutely. A significant portion of the firm's work involves assisting Jamaicans and foreign nationals who are purchasing, selling, inheriting, or managing property in Jamaica while residing overseas.\n\nThe firm utilizes secure electronic communication, video conferencing, and digital document management systems to make the process as convenient as possible for overseas clients.",
      },
      {
        q: "Can Ferguson Law help with mortgage financing matters?",
        a: "Yes. Due to the firm's extensive banking and financial services background, clients benefit from practical guidance regarding mortgage financing, lending requirements, loan approvals, refinancing, and transaction structuring.",
      },
      {
        q: "How are legal fees charged?",
        a: "Legal fees vary depending on the nature and complexity of the matter.\n\nCommon fee structures include:",
        bullets: [
          "Fixed fees for certain conveyancing and transactional matters",
          "Percentage-based fees for real estate transactions where appropriate",
          "Hourly rates for consultations and advisory services",
          "Project-based fees for commercial and business transactions",
        ],
        after:
          "Clients are provided with a fee quotation or engagement terms before work commences.",
      },
      {
        q: "Do you offer consultations?",
        a: "Yes. Consultations may be arranged in person, by telephone, or via video conference for overseas clients.",
      },
      {
        q: "How long does a property transaction usually take?",
        a: "Transaction timelines vary depending on factors such as financing approval, title issues, developer requirements, and regulatory processes. During the consultation, the firm can provide an estimated timeline based on the specific circumstances of the transaction.",
      },
      {
        q: "Why choose Ferguson Law?",
        a: "Clients choose Ferguson Law because of:",
        bullets: [
          "More than 10 years of legal experience",
          "More than 20 years of banking and financial services experience",
          "Specialized training in conveyancing and real estate transactions",
          "Experience serving overseas-based clients",
          "Clear communication and practical advice",
          "A client-focused approach aimed at reducing stress and uncertainty throughout the legal process",
        ],
      },
      {
        q: "How can I contact Ferguson Law?",
        a: [
          `WhatsApp: ${SITE.whatsappDisplay}`,
          "Business Hours: Monday – Friday, 9:00 am to 4:00 pm",
          "",
          "For urgent enquiries, prospective clients may contact the firm via WhatsApp or by booking a consultation online.",
        ].join("\n"),
      },
    ],
  },
  {
    id: "overseas",
    title: "Buying property in Jamaica from overseas",
    intro:
      "For Jamaicans and foreign nationals purchasing property in Jamaica while living abroad.",
    items: [
      {
        q: "Can I buy property in Jamaica without travelling to Jamaica?",
        a: "In many cases, yes.\n\nFerguson Law regularly assists overseas clients with property purchases while they remain abroad. Much of the transaction process can be completed through electronic communication, video conferencing, courier services, and properly executed Powers of Attorney where appropriate.",
      },
      {
        q: "What should I know about a Power of Attorney (POA)?",
        a: "If you are unable to travel to Jamaica to sign in person, a Power of Attorney (POA) lets someone you trust act on your behalf. A few key points:",
        bullets: [
          "A POA allows the named agent to sign documents on your behalf",
          "In order to be used in a real estate transaction a POA must be stamped and registered at the Registrar General's Department (RGD). Your lawyer can assist with that",
          "Must be properly drafted, executed and (in some cases) notarised or apostilled",
          "Should be LIMITED to specific transactions — not a general / blanket POA",
        ],
        after:
          "Ferguson Law can draft, execute and register your POA correctly so your purchase is never held up by a paperwork technicality.",
      },
      {
        q: "Is it safe to purchase property in Jamaica while living overseas?",
        a: "Yes, provided proper due diligence is conducted.\n\nOne of the most important protections available to an overseas buyer is engaging an independent Attorney-at-Law who will:",
        bullets: [
          "Verify ownership of the property",
          "Investigate the title",
          "Review contractual terms",
          "Identify encumbrances and restrictions",
          "Confirm planning and development approvals where necessary",
          "Ensure funds are properly accounted for",
        ],
        after:
          "Legal due diligence significantly reduces the risk of fraud, title defects, and unexpected liabilities.",
      },
      {
        q: "How do I know the seller actually owns the property?",
        a: "Before completion of the transaction, Ferguson Law conducts title investigations through the National Land Agency and reviews supporting ownership documentation to verify the seller's legal right to sell the property.\n\nWhere necessary, additional investigations may be undertaken to identify mortgages, caveats, easements, judgments, or other encumbrances affecting the property.",
      },
      {
        q: "What documents will I need to purchase property in Jamaica?",
        a: "Requirements vary depending on the transaction, but typically include:",
        bullets: [
          "Valid government-issued identification",
          "Proof of address",
          "Tax Registration Number (TRN)",
          "Source of funds documentation",
          "Financing documents (if applicable)",
        ],
        after:
          "Additional documentation may be required for corporate purchasers, trusts, or estates.",
      },
      {
        q: "Can Ferguson Law help me obtain a TRN while I am overseas?",
        a: "Yes.\n\nThe firm can advise on the process and documentation required to obtain a Jamaican Tax Registration Number (TRN), which is generally required to complete property transactions in Jamaica.",
      },
      {
        q: "Can I obtain mortgage financing from overseas?",
        a: "Yes.\n\nMany Jamaican financial institutions offer mortgage products for Jamaicans residing overseas. Eligibility requirements vary among lenders and may depend on:",
        bullets: [
          "Country of residence",
          "Employment status",
          "Income source",
          "Credit history",
          "Debt obligations",
        ],
        after:
          "Ferguson Law's banking and financial services experience enables the firm to provide practical guidance throughout the financing process.",
      },
      {
        q: "How much down payment is usually required?",
        a: "The amount varies depending on the transaction and financing arrangements.\n\nFor many property purchases, a down payment of approximately 10% is commonly required upon signing the Agreement for Sale. However, specific requirements may differ depending on the seller, developer, or lending institution.",
      },
      {
        q: "What additional costs should I budget for?",
        a: "In addition to the purchase price, buyers should generally budget for:",
        bullets: [
          "Transfer Tax (where applicable)",
          "Stamp Duty (where applicable)",
          "Registration fees",
          "Legal fees",
          "Survey costs (if required)",
          "Mortgage-related expenses",
          "Valuation fees",
          "Insurance requirements",
        ],
        after:
          "The firm can provide a detailed estimate of transaction costs at the outset of the transaction.",
      },
      {
        q: "What are the biggest mistakes overseas buyers make?",
        a: "Common mistakes include:",
        bullets: [
          "Purchasing without independent legal advice",
          "Paying down payments before due diligence is completed",
          "Relying solely on verbal representations",
          "Failing to verify title ownership",
          "Underestimating transaction costs",
          "Not obtaining financing pre-approval",
          "Using unqualified intermediaries",
        ],
        after:
          "Early legal guidance can help avoid costly delays and disputes.",
      },
      {
        q: "How long does the buying process usually take?",
        a: "The timeline depends on several factors, including:",
        bullets: [
          "Financing approval",
          "Title status",
          "Seller readiness",
          "Regulatory requirements",
          "Developer obligations (for new developments)",
        ],
        after:
          "A straightforward transaction may proceed relatively quickly, while more complex matters may require additional time.",
      },
      {
        q: "Can Ferguson Law represent me throughout the entire process?",
        a: "Yes.\n\nThe firm can assist from the initial review of the property through to completion and registration, including:",
        bullets: [
          "Contract review",
          "Title investigations",
          "Mortgage documentation",
          "Communication with lenders",
          "Completion arrangements",
          "Registration and post-closing matters",
        ],
        after:
          "This allows overseas clients to have a single point of contact throughout the transaction.",
      },
      {
        q: "Why do overseas buyers choose Ferguson Law?",
        a: "Clients benefit from:",
        bullets: [
          "More than 10 years of legal practice",
          "More than 20 years of banking and financial services experience",
          "Specialized conveyancing training through the National Land Agency Conveyancing Course",
          "Experience serving overseas-based clients",
          "Clear, practical communication",
          "A commitment to making property ownership in Jamaica as straightforward as possible",
        ],
      },
    ],
  },
];

/** Closing reassurance line ("Home Ownership Made Easy") from the source FAQ. */
export const FAQ_CLOSER = {
  title: "Home Ownership Made Easy",
  body: "At Ferguson Law, we understand that buying property from overseas can feel overwhelming. Our goal is to provide the guidance, protection, and confidence you need to make informed decisions and complete your transaction with peace of mind.",
};

/** Render the whole FAQ as plain text for the chatbot knowledge base. */
export function faqAsText(): string {
  const block = FAQ_GROUPS.map((g) => {
    const items = g.items
      .map((it) => {
        const bullets = it.bullets?.length
          ? "\n" + it.bullets.map((b) => `  - ${b}`).join("\n")
          : "";
        const after = it.after ? `\n${it.after}` : "";
        const a = it.a.replace(/\n+/g, " ");
        return `Q: ${it.q}\nA: ${a}${bullets}${after}`;
      })
      .join("\n\n");
    return `### ${g.title}\n${items}`;
  }).join("\n\n");
  return `${block}\n\n${FAQ_CLOSER.title}: ${FAQ_CLOSER.body}`;
}
