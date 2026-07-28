import Nav from "@/components/site/Nav";
import Footer from "@/components/site/Footer";

const ADMIN_PERSONA = {
  label: "Persona G — Admin / Staff",
  description: "You are a Ferguson Law staff member managing the back office. This is an internal test — do not share this link with general testers.",
  steps: [
    { step: "Visit /admin and sign in with your access code", check: "Does the admin dashboard load after entering the code?" },
    { step: "Check the Overview dashboard", check: "Does it show lead counts, upcoming bookings, conversion funnel, and recent leads?" },
    { step: "Open the Leads tab", check: "Are all leads listed with name, service, date, and status?" },
    { step: "Open the Bookings tab", check: "Are bookings listed with FL reference numbers and status controls (confirmed/cancelled/completed)?" },
    { step: "Open the Availability tab", check: "Are Monday-Friday schedule slots configured? If blank, set up hours before bookings open." },
    { step: "Open the CMS tab", check: "Are matters listed with their current stage (intake, in_progress, awaiting_client)?" },
    { step: "Open the Directory tab", check: "Are partner listings shown with Approve/Suspend controls?" },
    { step: "Open the Calendar tab", check: "Does the calendar view load? Are upcoming consultations visible?" },
    { step: "Open the Chats tab", check: "Can you see the chat history? Is the chatbot inbox populated?" },
    { step: "Try the Refresh button", check: "Does it reload data without breaking the page or losing your position?" },
    { step: "Test a status change on a booking (if one exists)", check: "Can you mark a booking confirmed or cancelled? Does the change persist after refresh?" },
    { step: "Test a lead status update", check: "Can you update a lead's status? Does the change save correctly?" },
  ],
};

export default function TestGuideAdminPage() {
  return (
    <>
      <Nav />
      <main style={{ minHeight: "100vh", background: "#faf9f6", paddingTop: 80 }}>
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "48px 24px 80px" }}>

          <div style={{ marginBottom: 48 }}>
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2, color: "#c0392b", textTransform: "uppercase" }}>
              Internal Only — Do Not Share
            </span>
            <h1 style={{ fontSize: 36, fontWeight: 800, color: "#1a1a1a", marginTop: 8, marginBottom: 12 }}>
              Admin Back Office — Test Guide
            </h1>
            <p style={{ color: "#555", lineHeight: 1.7, fontSize: 16 }}>
              This page is for Ferguson Law staff only. Complete the steps below using the admin access code provided by Owen.
              Submit your feedback at{" "}
              <a href="/testing" target="_blank" rel="noopener noreferrer" style={{ color: "#b8872a", fontWeight: 600 }}>fergusonlawja.com/testing</a>{" "}
              — select <strong>Persona G</strong> and <strong>fergusonlawja.com/admin</strong>.
            </p>
          </div>

          <div style={{ background: "#2c1a00", borderRadius: 12, padding: "20px 24px", marginBottom: 40 }}>
            <p style={{ color: "#e0c97a", fontWeight: 700, marginBottom: 8, fontSize: 14, letterSpacing: 1 }}>BEFORE YOU START</p>
            <ul style={{ color: "#ccc", lineHeight: 1.9, paddingLeft: 20, margin: 0, fontSize: 14 }}>
              <li>You need the admin access code — get it from Owen directly</li>
              <li>Open the feedback form in a new tab now:{" "}
                <a href="/testing" target="_blank" rel="noopener noreferrer" style={{ color: "#e0c97a" }}>fergusonlawja.com/testing</a>
              </li>
              <li>Admin panel:{" "}
                <a href="https://fergusonlawja.com/admin" target="_blank" rel="noopener noreferrer" style={{ color: "#e0c97a" }}>fergusonlawja.com/admin</a>
              </li>
              <li>Note anything that is slow, unclear, or missing from the back office workflow</li>
            </ul>
          </div>

          <div style={{ marginBottom: 56 }}>
            <div style={{
              background: "#2c1a00",
              borderRadius: "16px 16px 0 0",
              padding: "20px 28px",
              marginBottom: 2,
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 2, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", marginBottom: 4 }}>
                    Testing area
                  </p>
                  <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#fff" }}>
                    Site 3 — Admin Back Office (fergusonlawja.com/admin)
                  </h2>
                </div>
                <a
                  href="https://fergusonlawja.com/admin"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-block",
                    background: "rgba(255,255,255,0.15)",
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 600,
                    padding: "8px 16px",
                    borderRadius: 8,
                    textDecoration: "none",
                    border: "1px solid rgba(255,255,255,0.25)",
                    whiteSpace: "nowrap",
                    alignSelf: "center",
                  }}
                >
                  Open admin →
                </a>
              </div>
            </div>

            <div style={{
              background: "#fff",
              padding: "28px 28px 24px",
              boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
            }}>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: "#1a1a1a", marginBottom: 4 }}>{ADMIN_PERSONA.label}</h3>
              <p style={{ color: "#666", fontSize: 14, marginBottom: 20, lineHeight: 1.6, borderBottom: "1px solid #f0ede6", paddingBottom: 16 }}>
                <strong>Your scenario:</strong> {ADMIN_PERSONA.description}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {ADMIN_PERSONA.steps.map((s, i) => (
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
            <div style={{ height: 8, background: "#f0ede6", borderRadius: "0 0 16px 16px" }} />
          </div>

          <div style={{ textAlign: "center", padding: "32px 24px", background: "#2c1a00", borderRadius: 16 }}>
            <p style={{ color: "#ccc", marginBottom: 16, fontSize: 15 }}>Done? Submit your admin feedback here.</p>
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
