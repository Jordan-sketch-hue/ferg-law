import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin CMS Guide | Ferguson Law",
  robots: { index: false, follow: false },
};

export default function CmsGuidePage() {
  return (
    <>
      <style>{`
        .cg-root {
          --green:   #0e2518;
          --green-2: #1a3828;
          --gold:    #c8a65c;
          --gold-lt: #e8c97e;
          --paper:   #f6f2ea;
          --paper-2: #ede8dc;
          --ink:     #102a1e;
          --ink-2:   #3d4f44;
          --ink-3:   #7a8c81;
          --line:    rgba(16,42,30,.12);
          --bg:      #f6f2ea;
          --surface: #fff;
          --text:    #102a1e;
          --muted:   #3d4f44;
        }
        @media (prefers-color-scheme: dark) {
          .cg-root {
            --bg:      #0b1e12;
            --surface: #132a1a;
            --text:    #e8e2d6;
            --muted:   #8fa593;
            --line:    rgba(200,166,92,.14);
          }
        }
        .cg-root { background: var(--bg); color: var(--text); font-family: system-ui,-apple-system,"Segoe UI",sans-serif; font-size: 15px; line-height: 1.7; min-height: 100vh; }
        .cg-page { max-width: 780px; margin: 0 auto; padding: 0 24px 80px; }
        .cg-cover { background: var(--green); margin: 0 -24px; padding: 56px 40px 48px; position: relative; overflow: hidden; }
        .cg-cover::before { content: ""; position: absolute; inset: 0; background: radial-gradient(ellipse 60% 80% at 100% 0%, rgba(200,166,92,.18) 0%, transparent 70%); pointer-events: none; }
        .cg-eyebrow { font-size: 10px; letter-spacing: .2em; text-transform: uppercase; color: var(--gold); font-weight: 600; margin-bottom: 16px; }
        .cg-cover h1 { font-family: Georgia,"Times New Roman",serif; font-size: clamp(2rem,5vw,3rem); font-weight: normal; line-height: 1.1; color: #fff; text-wrap: balance; margin-bottom: 16px; max-width: 540px; }
        .cg-cover h1 em { color: var(--gold); font-style: normal; }
        .cg-cover-sub { color: rgba(246,242,234,.7); font-size: 14px; max-width: 480px; }
        .cg-rule { width: 48px; height: 2px; background: var(--gold); margin: 28px 0 20px; }
        .cg-meta { display: flex; gap: 32px; flex-wrap: wrap; margin-top: 32px; }
        .cg-meta-item { font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: rgba(246,242,234,.5); }
        .cg-meta-item strong { display: block; color: rgba(246,242,234,.85); letter-spacing: 0; text-transform: none; font-size: 13px; margin-top: 2px; }
        .cg-toc { background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 28px 32px; margin: 40px 0; }
        .cg-toc-label { font-size: 10px; letter-spacing: .18em; text-transform: uppercase; color: var(--gold); font-weight: 700; margin-bottom: 14px; }
        .cg-toc ol { padding-left: 18px; display: flex; flex-direction: column; gap: 6px; }
        .cg-toc li { font-size: 14px; color: var(--muted); }
        .cg-toc a { color: inherit; text-decoration: none; }
        .cg-toc a:hover { color: var(--gold); }
        .cg-section { margin-top: 56px; }
        .cg-section-header { display: flex; align-items: baseline; gap: 16px; margin-bottom: 28px; padding-bottom: 16px; border-bottom: 1px solid var(--line); }
        .cg-num { font-family: Georgia,serif; font-size: 13px; color: var(--gold); flex-shrink: 0; width: 24px; }
        .cg-section h2 { font-family: Georgia,"Times New Roman",serif; font-size: 1.45rem; font-weight: normal; color: var(--text); text-wrap: balance; line-height: 1.2; }
        .cg-steps { display: flex; flex-direction: column; }
        .cg-step { display: grid; grid-template-columns: 32px 1fr; gap: 0 16px; }
        .cg-step + .cg-step { margin-top: 4px; }
        .cg-step-col { display: flex; flex-direction: column; align-items: center; padding-top: 2px; }
        .cg-step-num { width: 28px; height: 28px; border-radius: 50%; background: var(--green); color: var(--gold); font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-family: Georgia,serif; }
        .cg-step-line { width: 1px; flex: 1; background: var(--line); margin-top: 6px; min-height: 20px; }
        .cg-step:last-child .cg-step-line { display: none; }
        .cg-step-body { padding: 4px 0 28px; }
        .cg-step-title { font-weight: 600; color: var(--text); font-size: 14.5px; line-height: 1.4; margin-bottom: 5px; }
        .cg-step-desc { font-size: 13.5px; color: var(--muted); line-height: 1.65; }
        .cg-tip { display: inline-flex; align-items: center; gap: 6px; background: rgba(200,166,92,.1); border: 1px solid rgba(200,166,92,.25); border-radius: 6px; padding: 5px 10px; font-size: 12px; color: var(--gold); margin-top: 8px; font-weight: 500; }
        .cg-bullets { display: flex; flex-direction: column; gap: 8px; margin-top: 4px; }
        .cg-bullet { display: flex; gap: 10px; font-size: 13.5px; color: var(--muted); line-height: 1.55; }
        .cg-bullet::before { content: "—"; color: var(--gold); flex-shrink: 0; margin-top: 1px; }
        .cg-bullet strong { color: var(--text); }
        .cg-tab-grid { display: flex; flex-direction: column; gap: 1px; background: var(--line); border-radius: 10px; overflow: hidden; border: 1px solid var(--line); margin-top: 8px; }
        .cg-tab-row { display: grid; grid-template-columns: 160px 1fr; background: var(--surface); }
        .cg-tab-name { padding: 11px 14px; font-size: 12.5px; font-weight: 700; color: var(--text); border-right: 1px solid var(--line); background: rgba(200,166,92,.06); }
        .cg-tab-desc { padding: 11px 14px; font-size: 13px; color: var(--muted); }
        .cg-callout { background: var(--green); border-radius: 12px; padding: 22px 26px; margin-top: 12px; }
        .cg-callout-label { font-size: 10px; letter-spacing: .16em; text-transform: uppercase; color: var(--gold); font-weight: 700; margin-bottom: 6px; }
        .cg-callout p { font-size: 13.5px; color: rgba(246,242,234,.82); line-height: 1.65; }
        .cg-callout p + p { margin-top: 8px; }
        .cg-divider { border: none; border-top: 1px solid var(--line); margin: 48px 0 0; }
        .cg-footer { margin-top: 64px; padding-top: 24px; border-top: 1px solid var(--line); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
        .cg-footer-brand { font-family: Georgia,serif; font-size: 13px; color: var(--muted); letter-spacing: .02em; }
        .cg-footer-brand span { color: var(--gold); }
        .cg-footer-note { font-size: 11px; color: var(--ink-3,#7a8c81); letter-spacing: .04em; }
        @media print {
          .cg-root { background: #fff; color: #102a1e; font-size: 13px; }
          .cg-cover { margin: 0; padding: 36px 32px 32px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .cg-toc, .cg-tab-row, .cg-tab-grid { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .cg-section { page-break-inside: avoid; }
          .cg-page { padding: 0 0 40px; }
          a { text-decoration: none; color: inherit; }
        }
        @media (max-width: 540px) {
          .cg-cover { padding: 40px 24px 36px; }
          .cg-tab-row { grid-template-columns: 1fr; }
          .cg-tab-name { border-right: none; border-bottom: 1px solid var(--line); }
          .cg-meta { gap: 20px; }
        }
      `}</style>

      <div className="cg-root">
        <div className="cg-page">

          <div className="cg-cover">
            <div className="cg-eyebrow">Ferguson Law · Internal Operations</div>
            <h1>Admin CMS<br /><em>Staff Guide</em></h1>
            <div className="cg-rule"></div>
            <p className="cg-cover-sub">A reference guide for managing matters, clients, bookings, and site content through the Ferguson Law back office.</p>
            <div className="cg-meta">
              <div className="cg-meta-item">Access<strong>fergusonlawja.com/admin</strong></div>
              <div className="cg-meta-item">Version<strong>July 2026</strong></div>
              <div className="cg-meta-item">For<strong>Internal Staff Only</strong></div>
            </div>
          </div>

          <nav className="cg-toc">
            <div className="cg-toc-label">Contents</div>
            <ol>
              <li><a href="#s1">Creating a New Matter</a></li>
              <li><a href="#s2">Working a Matter Day-to-Day</a></li>
              <li><a href="#s3">All Admin Tabs at a Glance</a></li>
              <li><a href="#s4">Editing Live Site Content</a></li>
              <li><a href="#s5">Blocking Availability &amp; Calendar</a></li>
              <li><a href="#s6">Account &amp; Access</a></li>
            </ol>
          </nav>

          <div className="cg-section" id="s1">
            <div className="cg-section-header">
              <div className="cg-num">01</div>
              <h2>Creating a New Matter</h2>
            </div>
            <div className="cg-steps">
              {[
                { title: "Log in to the admin", desc: <>Go to <strong>fergusonlawja.com/admin</strong> and enter your access code. Your session is saved in the browser — you won&apos;t need to re-enter it on the same device.</> },
                { title: "Open Case Management", desc: <>Click the <strong>Case Management</strong> tab. This shows all active and closed workflow matters.</> },
                { title: 'Click "+ New Matter"', desc: "A modal opens. Start typing the client's email — matching accounts appear as you type. Select the correct client.", tip: "The client must already have a portal account. If they don't, create one via the Clients tab first." },
                { title: "Choose workflow type", desc: <>Select one of three workflows: <strong>Property Purchase</strong>, <strong>Property Sale</strong>, or <strong>General</strong>. Each has its own set of milestone phases pre-loaded automatically.</> },
                { title: "Add a title (optional)", desc: 'Enter a short reference, e.g. "23 Mango Walk, Kingston 6" or "Estate of J. Brown". This appears in the client\'s portal.' },
                { title: 'Click "Open Matter"', desc: <>The system creates the matter, generates all milestone phases for the chosen workflow, and sets Phase 1 to <em>In Progress</em>. The new matter appears immediately in the list.</> },
              ].map((s, i) => (
                <div className="cg-step" key={i}>
                  <div className="cg-step-col"><div className="cg-step-num">{i + 1}</div><div className="cg-step-line"></div></div>
                  <div className="cg-step-body">
                    <div className="cg-step-title">{s.title}</div>
                    <div className="cg-step-desc">{s.desc}</div>
                    {s.tip && <div className="cg-tip">{s.tip}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="cg-section" id="s2">
            <div className="cg-section-header">
              <div className="cg-num">02</div>
              <h2>Working a Matter Day-to-Day</h2>
            </div>
            <p style={{ fontSize: "14px", color: "var(--muted)", marginBottom: "22px" }}>Click any matter row to open it. Five tabs manage every aspect of the file.</p>
            <div className="cg-bullets">
              <div className="cg-bullet"><div><strong>Timeline</strong> — View and tick off milestone phases. Completing all milestones in a phase automatically unlocks the next phase. Phases cannot be skipped.</div></div>
              <div className="cg-bullet"><div><strong>Messages</strong> — Send updates to the client. Each message triggers an email or WhatsApp notification depending on the client&apos;s preference. All messages are visible to the client in their portal.</div></div>
              <div className="cg-bullet"><div><strong>Files</strong> — Upload contracts, KYC documents, title searches, or any file relevant to the matter. Clients can also upload files from their side, which appear here.</div></div>
              <div className="cg-bullet"><div><strong>KYC</strong> — Review the client&apos;s identity verification and source-of-funds submission. Use <em>Approve</em> to clear it or <em>Flag</em> to request corrections before proceeding.</div></div>
              <div className="cg-bullet"><div><strong>Payments</strong> — Record a payment received, confirm it after verification, and issue a formal receipt. Every payment entry is timestamped and logged to the matter.</div></div>
            </div>
            <div className="cg-callout" style={{ marginTop: "20px" }}>
              <div className="cg-callout-label">Client Portal Access</div>
              <p>The client sees their matter in real time at <strong>fergusonlawja.com/directory/client</strong>. They can view milestones, read messages, and upload files — but cannot modify milestone statuses.</p>
              <p>If a client can&apos;t access their portal, check that their account exists in the Clients tab and that the matter is linked to the correct email address.</p>
            </div>
          </div>

          <div className="cg-section" id="s3">
            <div className="cg-section-header">
              <div className="cg-num">03</div>
              <h2>All Admin Tabs at a Glance</h2>
            </div>
            <div className="cg-tab-grid">
              {[
                ["Leads", "Inbound enquiries submitted via the website contact form. Mark as contacted or closed."],
                ["Appointments", "All booked consultations. Confirm, cancel, or mark complete. Payment status is shown per booking."],
                ["Chats", "Live chatbot conversations. Review transcripts and hand off to a staff member where needed."],
                ["Emails", "Inbound email inbox. Read messages, mark as replied, and view full email threads."],
                ["Clients", "Full client CRM. Create new client records, view contact history, and manage client type and status."],
                ["Matters", "CRM-style pipeline view of all matters with stage, priority, and payment status. Separate from the Case Management workflow tab."],
                ["Case Management", "Full workflow matter tracker — create, manage, and close structured matters with milestone phases."],
                ["Partners", "Directory listings for real estate agents, valuators, surveyors, and lenders. Approve or deactivate listings."],
                ["H.O.M.E. Inquiries", "Property enquiries submitted through the H.O.M.E. platform. Set status: new, contacted, or closed."],
                ["Availability", "Set the weekly booking schedule and block specific dates or time slots from being booked."],
                ["Invites", "Generate complimentary booking codes for clients who should receive a free consultation."],
                ["Account", "Change your admin email address or password."],
              ].map(([name, desc]) => (
                <div className="cg-tab-row" key={name}>
                  <div className="cg-tab-name">{name}</div>
                  <div className="cg-tab-desc">{desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="cg-section" id="s4">
            <div className="cg-section-header">
              <div className="cg-num">04</div>
              <h2>Editing Live Site Content</h2>
            </div>
            <div className="cg-steps">
              {[
                { title: "Open edit mode", desc: <>Go to <strong>fergusonlawja.com/?edit</strong> in your browser. Enter your admin access code when prompted.</> },
                { title: "Edit text inline", desc: "Any editable text on the page becomes clickable. Click it, type your changes, then click elsewhere to confirm." },
                { title: "Swap an image", desc: "Click any editable image. A file picker appears — select the replacement image from your device. The preview updates immediately." },
                { title: "Save or publish", desc: <>Use <strong>Save Draft</strong> to store changes privately for review. Use <strong>Publish</strong> to push changes live immediately. Drafts do not affect what visitors see.</> },
              ].map((s, i) => (
                <div className="cg-step" key={i}>
                  <div className="cg-step-col"><div className="cg-step-num">{i + 1}</div><div className="cg-step-line"></div></div>
                  <div className="cg-step-body">
                    <div className="cg-step-title">{s.title}</div>
                    <div className="cg-step-desc">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="cg-section" id="s5">
            <div className="cg-section-header">
              <div className="cg-num">05</div>
              <h2>Blocking Availability &amp; Calendar</h2>
            </div>
            <div className="cg-bullets">
              <div className="cg-bullet"><div>Go to the <strong>Availability</strong> tab in the admin.</div></div>
              <div className="cg-bullet"><div>The <strong>Weekly Schedule</strong> panel sets which days and hours are open for bookings by default.</div></div>
              <div className="cg-bullet"><div>The <strong>Blocked Slots</strong> panel lets you select a specific date and toggle individual time slots off — useful for travel days, court appearances, or holidays.</div></div>
              <div className="cg-bullet"><div>Blocked slots take effect immediately. Clients attempting to book that time will not see it as available.</div></div>
              <div className="cg-bullet"><div>To unblock a slot, click it again in the Blocked Slots list and confirm removal.</div></div>
            </div>
          </div>

          <div className="cg-section" id="s6">
            <div className="cg-section-header">
              <div className="cg-num">06</div>
              <h2>Account &amp; Access</h2>
            </div>
            <div className="cg-bullets">
              <div className="cg-bullet"><div><strong>Access code login</strong> — Enter your firm access code on the admin login screen. The code is remembered on this device until you clear your browser data.</div></div>
              <div className="cg-bullet"><div><strong>Email + password login</strong> — Use the email/password tab on the login screen if you have a named admin account. Contact the firm to set one up.</div></div>
              <div className="cg-bullet"><div><strong>Change password</strong> — Go to the Account tab, enter your current password, then your new one (minimum 8 characters).</div></div>
              <div className="cg-bullet"><div><strong>Change email</strong> — Enter the new email address in the Account tab. This updates the email used for email+password login.</div></div>
              <div className="cg-bullet"><div><strong>Logging out</strong> — Clear your browser&apos;s local storage for fergusonlawja.com, or simply close a private/incognito window.</div></div>
            </div>
            <div className="cg-callout" style={{ marginTop: "20px" }}>
              <div className="cg-callout-label">Keep your access code secure</div>
              <p>The admin access code grants full control over all client data, matters, and site content. Do not share it via WhatsApp, email, or any unencrypted channel. If you believe the code has been compromised, contact the developer immediately to have it rotated.</p>
            </div>
          </div>

          <hr className="cg-divider" />

          <div className="cg-footer">
            <div className="cg-footer-brand">Ferguson <span>Law</span> · Internal Use Only</div>
            <div className="cg-footer-note">fergusonlawja.com · July 2026</div>
          </div>

        </div>
      </div>
    </>
  );
}
