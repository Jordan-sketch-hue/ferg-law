import Nav from "@/components/site/Nav";
import Footer from "@/components/site/Footer";
import PortalTestRunner from "@/components/testing/PortalTestRunner";

const PERSONAS = [
  {
    id: "buyer",
    label: "Persona A — Residential Buyer",
    cards: "BUYER-01, BUYER-03, BUYER-05",
    description: "You are a Jamaican resident looking to purchase a home — first-time, family, or investment. Use the name, email, and scenario on your assigned persona card.",
    steps: [
      { step: "Visit the homepage at fergusonlawja.com", check: "Without clicking for 20 seconds — what do you think the platform offers? Is the headline clear and confidence-building?" },
      { step: "Find the service most relevant to your situation", check: "Can you locate 'Real Estate & Conveyancing' from the nav or homepage? How many clicks does it take?" },
      { step: "Click 'Get started' or 'Book a consultation'", check: "Does the booking modal open with 4 steps: service, date, details, confirm?" },
      { step: "Pick a service in the booking flow", check: "Can you select 'Real Estate & Conveyancing'? Does it advance to Step 2?" },
      { step: "Check the date/time picker", check: "Are there available slots? Can you select one? If 'No open times' shows, note it." },
      { step: "Open the chatbot (bottom right)", check: "Does it greet you? Ask: 'How much does a property transfer cost?' — is the answer useful?" },
      { step: "Ask chatbot: 'How long does a property transfer take?'", check: "Is the answer clear and reassuring (not a generic fallback)?" },
      { step: "Navigate to Buyer's Guide (/buyers-guide)", check: "Is the content relevant to your persona's situation? Easy to find?" },
      { step: "Navigate to Glossary (/glossary)", check: "Does it load? Is the A-Z layout clear? Can you find 'Conveyance' or 'Title'?" },
      { step: "Navigate to FAQ (/faq)", check: "Are the questions relevant to a first-time buyer? Can you expand each answer?" },
      { step: "Find WhatsApp contact", check: "Is +1 876 320 0235 easy to find? Does clicking open WhatsApp?" },
      { step: "Try the readiness assessment via the H.O.M.E. link", check: "Follow the H.O.M.E. link from the homepage. Would you complete this before contacting the firm? Is it relevant to your scenario?" },
      { step: "Try the mortgage calculator", check: "Can you enter a property price and get a monthly payment estimate? Is the result clear and actionable?" },
    ],
  },
  {
    id: "seller",
    label: "Persona B — Residential Seller",
    cards: "SELLER-01, SELLER-02, SELLER-03, SELLER-04, SELLER-05",
    description: "You own property in Jamaica and are ready to sell. Each seller card has a distinct complication — title in a deceased person's name, overseas co-owner, rural boundary dispute, etc. Use your assigned card details.",
    steps: [
      { step: "Visit the homepage", check: "Can you immediately find any reference to selling property, or is it all buyer-focused?" },
      { step: "Ask chatbot: 'I want to sell my house — what do I need?'", check: "Does the bot give a step-by-step answer relevant to a Jamaican property sale?" },
      { step: "Ask chatbot about your specific complication (from your persona card)", check: "E.g. 'The title is still in my late husband's name' or 'My co-owner lives overseas'. Does it respond helpfully or hit a wall?" },
      { step: "Ask chatbot: 'What are your fees for a property sale?'", check: "Does it explain the consultation fee and what happens next?" },
      { step: "Find the Explainers section (/explainers)", check: "Is there content about sellers and the conveyancing process?" },
      { step: "Try to book a consultation", check: "Can you complete the booking form in under 2 minutes? Does service selection include seller-relevant options?" },
      { step: "Try the FAQ", check: "Are there seller-specific questions? Does anything address your persona's situation?" },
      { step: "Find and test the WhatsApp button", check: "Is it prominent? Does it open WhatsApp with a pre-filled message?" },
      { step: "Overall seller experience", check: "Did you feel this platform understood the seller's journey, or did it feel buyer-only?" },
    ],
  },
  {
    id: "diaspora",
    label: "Persona C — Diaspora Buyer",
    cards: "BUYER-02, BUYER-04",
    description: "You live in the UK, US, or Canada and want to buy property in Jamaica remotely. Your assigned card gives you a location, deposit amount, and scenario (e.g. remote signing, construction loan, investment).",
    steps: [
      { step: "Visit the homepage", check: "Is there anything that speaks to diaspora buyers specifically — overseas language, remote process, international references?" },
      { step: "Ask chatbot: 'Can foreigners buy property in Jamaica?'", check: "Clear yes/no with relevant details on eligibility and any restrictions?" },
      { step: "Ask chatbot: 'Can I sign documents from abroad?'", check: "Is the answer reassuring and practical? Does it mention Power of Attorney?" },
      { step: "Ask chatbot: 'I have US$55,000 for a deposit and earn in Canadian dollars — what are my options?'", check: "Can the bot handle a multi-currency diaspora scenario?" },
      { step: "Read the FAQ", check: "Is there a section on buying from overseas? Is it comprehensive?" },
      { step: "Try to book a consultation", check: "Is there an option for online or remote meetings? Can you select a time that suits a non-Jamaica timezone?" },
      { step: "Check the Buyer's Guide (/buyers-guide)", check: "Is it relevant to someone buying from abroad, or is it only written for residents?" },
      { step: "Find WhatsApp or contact options", check: "Would an overseas buyer feel confident they can reach the firm without calling a local number?" },
    ],
  },
  {
    id: "professional",
    label: "Persona D — Real Estate Professional",
    description: "You are a real estate agent, surveyor, or valuator who wants to list on the professional directory.",
    steps: [
      { step: "Find 'Find a Pro' from the homepage", check: "Is it easy to locate? Does the directory show existing listings?" },
      { step: "Click 'List your business' (/directory/join)", check: "Can you complete the registration form? Name, phone, bio, services?" },
      { step: "After registering, log in at /directory/login", check: "Can you sign in with the credentials you just created?" },
      { step: "In your dashboard, upload a profile photo or logo", check: "Does it upload and save without needing to click Save separately?" },
      { step: "View your public profile page", check: "Does your listing appear correctly with all your details?" },
      { step: "Test the WhatsApp / Call / Email buttons on your profile", check: "Do the contact buttons work correctly?" },
    ],
  },
  {
    id: "lender",
    label: "Persona H — Finance Professional / Lender",
    cards: "LENDER-01 through LENDER-08",
    description: "You are a mortgage officer, credit union loans officer, diaspora mortgage adviser, or commercial lender. You are exploring whether to refer clients to Ferguson Law and assessing the firm's financial literacy. Use your assigned card scenario.",
    steps: [
      { step: "Visit the homepage", check: "Does the platform convey financial sophistication — does it feel like a firm that understands how mortgages and financing work?" },
      { step: "Ask chatbot: 'My client earns J$420,000 gross monthly — what financing options does Ferguson Law support?'", check: "Can the bot engage with a lender-level question or does it deflect?" },
      { step: "Ask chatbot about your specific scenario (from your persona card)", check: "E.g. 'My client is self-employed with irregular income' or 'Construction loan for a small developer'. Is the response credible?" },
      { step: "Navigate to the professional directory (/directory)", check: "Are there listings that would be useful referral partners for your clients? Valuators, surveyors?" },
      { step: "Follow the readiness and financial planning tools via the H.O.M.E. link", check: "Would you send your mortgage applicants here before they engage a lawyer? Is the financial section thorough?" },
      { step: "Check the Buyer's Guide (/buyers-guide)", check: "Would you share this with a pre-approval client? Is the financing information accurate and complete?" },
      { step: "Try to book a professional consultation", check: "Is there a clear path for a finance professional to make a referral or schedule a call?" },
      { step: "Overall professional impression", check: "Would you confidently refer your clients to this firm? What is missing that would make the referral easier?" },
    ],
  },
  {
    id: "home-readiness",
    label: "Persona E — Readiness Assessment",
    description: "You are a first-time buyer checking if you are financially and practically ready to buy a home in Jamaica. Begin at the H.O.M.E. link from the Ferguson Law homepage.",
    steps: [
      { step: "Access the readiness platform via the Ferguson Law homepage", check: "Does the readiness area load clearly? Is the hero clear and does it feel part of the same experience?" },
      { step: "Click 'Get started' or 'Free assessment'", check: "Does the readiness quiz open?" },
      { step: "Complete the readiness assessment", check: "Can you fill in all sections (About you, Income, Savings, etc.)? Does it progress smoothly?" },
      { step: "Submit the assessment", check: "Do you receive a readiness score (0-100)? Is the result page clear and actionable?" },
      { step: "Check the Buyer's Guide upsell", check: "Is the guide displayed with price? Is the purchase flow visible?" },
      { step: "Try the Mortgage Calculator", check: "Can you enter a property price and get a monthly payment estimate? Is the math visible?" },
      { step: "Navigate to /faq", check: "Does the FAQ load with relevant questions for a buyer?" },
      { step: "Find the way back to Ferguson Law", check: "Is there a clear path back to booking a consultation or contacting the firm?" },
    ],
  },
  {
    id: "home-professional",
    label: "Persona F — Professional Listing (via H.O.M.E.)",
    description: "You are a professional who arrived at the H.O.M.E. readiness platform and want to list on the directory from this entry point.",
    steps: [
      { step: "Access the readiness platform and look for a professional listing path", check: "Is there a clear path for a professional to find or list on the directory?" },
      { step: "Navigate to /professionals", check: "Does it direct you to the Ferguson Law directory correctly?" },
      { step: "Book a consultation from this entry point", check: "Does 'Book a Consultation' open the booking flow smoothly — or does anything feel disconnected?" },
    ],
  },
];

const GENERAL = [
  "Does the platform load quickly on mobile — under 3 seconds on a standard mobile connection?",
  "Is the navigation clear on mobile — hamburger menu works, all links reachable without zooming?",
  "Is the language easy to understand with no unexplained legal jargon for a first-time reader?",
  "Did you feel confident about what the next step would be at every stage of your journey?",
  "Did anything feel broken, confusing, or missing — note it exactly as you experienced it.",
  "On iOS: did fonts render clearly? Did any inputs zoom in unexpectedly when tapped? Did buttons respond?",
  "On Android: did the platform feel native? Were any layout elements cut off or misaligned?",
];

export default function TestGuidePage() {
  return (
    <>
      <Nav />
      <main style={{ minHeight: "100vh", background: "#faf9f6", paddingTop: 80 }}>
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "48px 24px 80px" }}>

          <div style={{ marginBottom: 48 }}>
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2, color: "#b8872a", textTransform: "uppercase" }}>
              Beta Testing — Testers Only
            </span>
            <h1 style={{ fontSize: 36, fontWeight: 800, color: "#1a1a1a", marginTop: 8, marginBottom: 12 }}>
              Ferguson Law — Test Guide
            </h1>
            <p style={{ color: "#555", lineHeight: 1.7, fontSize: 16 }}>
              This guide covers the Ferguson Law platform and six tester personas. Follow your assigned persona card,
              complete the steps, and submit feedback in the tab you opened at{" "}
              <a href="/testing" target="_blank" rel="noopener noreferrer" style={{ color: "#b8872a", fontWeight: 600 }}>fergusonlawja.com/testing</a>.
            </p>
          </div>

          <div style={{ background: "#1a1a1a", borderRadius: 12, padding: "20px 24px", marginBottom: 48 }}>
            <p style={{ color: "#e0c97a", fontWeight: 700, marginBottom: 8, fontSize: 14, letterSpacing: 1 }}>BEFORE YOU START</p>
            <ul style={{ color: "#ccc", lineHeight: 1.9, paddingLeft: 20, margin: 0, fontSize: 14 }}>
              <li>You have been assigned a <strong style={{ color: "#fff" }}>persona card</strong> (e.g. BUYER-01, SELLER-03, LENDER-05) — use the name, email, phone, and scenario on that card throughout your test</li>
              <li>Test on your own device — mobile first, then laptop if time allows</li>
              <li>Test as a real client or professional, not a developer — note what confused you, not what you fixed in your head</li>
              <li>Open the feedback form now in a new tab so you can log notes in real time:{" "}
                <a href="/testing" target="_blank" rel="noopener noreferrer" style={{ color: "#e0c97a", fontWeight: 600 }}>fergusonlawja.com/testing</a>
              </li>
              <li>Your starting URL: <strong style={{ color: "#fff" }}>fergusonlawja.com</strong></li>
              <li>For Persona D registration: use a test email like <strong style={{ color: "#fff" }}>yourname+test@gmail.com</strong></li>
            </ul>
          </div>

          {PERSONAS.map((persona) => (
            <div key={persona.id} style={{ marginBottom: 24 }}>
              <div style={{
                background: "#fff",
                borderRadius: 16,
                padding: "28px 28px 24px",
                boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
                border: "1px solid #f0ede6",
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 4 }}>
                  <h3 style={{ fontSize: 17, fontWeight: 800, color: "#1a1a1a", margin: 0 }}>{persona.label}</h3>
                  {"cards" in persona && persona.cards && (
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: "#b8872a", background: "#fdf6e8", padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap" }}>
                      {persona.cards}
                    </span>
                  )}
                </div>
                <p style={{ color: "#666", fontSize: 14, marginBottom: 20, lineHeight: 1.6, borderBottom: "1px solid #f0ede6", paddingBottom: 16 }}>
                  <strong>Your scenario:</strong> {persona.description}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {persona.steps.map((s, i) => (
                    <div key={i} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                      <span style={{
                        flexShrink: 0,
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: "#f0ede6",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: 13,
                        color: "#b8872a",
                      }}>{i + 1}</span>
                      <div>
                        <p style={{ fontWeight: 600, color: "#1a1a1a", margin: "0 0 2px", fontSize: 14 }}>{s.step}</p>
                        <p style={{ color: "#777", margin: 0, fontSize: 13 }}>Check: {s.check}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {/* Persona I — Client Portal automated test */}
          <div style={{ marginBottom: 56, border: "2px solid #c9a86a", borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 32px rgba(184,135,42,0.15)" }}>
            <div style={{ background: "#0e2518", padding: "20px 28px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 2, color: "#c9a86a", textTransform: "uppercase", marginBottom: 4 }}>
                    Persona I
                  </p>
                  <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#fff" }}>
                    Client Portal — Automated Test
                  </h2>
                </div>
                <span style={{ background: "#c9a86a", color: "#0e2518", fontSize: 11, fontWeight: 800, padding: "6px 14px", borderRadius: 20, letterSpacing: 1, whiteSpace: "nowrap" }}>
                  PORTAL-01 thru PORTAL-05
                </span>
              </div>
            </div>
            <div style={{ background: "#fff", padding: "28px 28px 24px" }}>
              <p style={{ color: "#666", fontSize: 14, marginBottom: 20, lineHeight: 1.6, borderBottom: "1px solid #f0ede6", paddingBottom: 16 }}>
                <strong>Your scenario:</strong> You are a client with an active property purchase matter. Log into the client portal with the pre-loaded credentials below. The system auto-advances your matter milestones every 90 seconds and emails you a notification for each step. Confirm each email arrives and check the portal updates in real time.
              </p>
              <PortalTestRunner />
            </div>
          </div>

          <div style={{ background: "#fff", borderRadius: 16, padding: "28px 28px 24px", boxShadow: "0 2px 16px rgba(0,0,0,0.06)", marginBottom: 40 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1a1a1a", marginBottom: 16 }}>General Checks (All Testers)</h2>
            <ul style={{ display: "flex", flexDirection: "column", gap: 12, paddingLeft: 0, listStyle: "none", margin: 0 }}>
              {GENERAL.map((item, i) => (
                <li key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", fontSize: 14, color: "#444", lineHeight: 1.5 }}>
                  <span style={{ flexShrink: 0, width: 20, height: 20, borderRadius: 4, border: "2px solid #e0ddd6", marginTop: 1 }} />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div style={{ textAlign: "center", padding: "32px 24px", background: "#1a1a1a", borderRadius: 16 }}>
            <p style={{ color: "#ccc", marginBottom: 16, fontSize: 15 }}>Done testing? Submit your feedback here. Opens in a new tab.</p>
            <a
              href="/testing"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-block",
                background: "#b8872a",
                color: "#fff",
                padding: "14px 36px",
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 16,
                textDecoration: "none",
              }}
            >
              Submit Feedback
            </a>
          </div>

        </div>
      </main>
      <Footer />
    </>
  );
}
