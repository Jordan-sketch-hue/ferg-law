"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { waLink } from "@/lib/site";

const emailRe = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default function LeadForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const [errName, setErrName] = useState(false);
  const [errPhone, setErrPhone] = useState(false);
  const [errEmail, setErrEmail] = useState(false);
  const [errMsg, setErrMsg] = useState(false);

  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorHtml, setErrorHtml] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const nameBad = !name.trim();
    const phoneBad = !phone.trim();
    const emailBad = !!email.trim() && !emailRe.test(email.trim());
    const msgBad = !message.trim();
    setErrName(nameBad);
    setErrPhone(phoneBad);
    setErrEmail(emailBad);
    setErrMsg(msgBad);
    if (nameBad || phoneBad || emailBad || msgBad) return;

    setErrorHtml(null);
    setSending(true);

    const lead = {
      source: "contact_form" as const,
      status: "new",
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || null,
      message: message.trim(),
      meta: { page: typeof location !== "undefined" ? location.pathname : "/" },
    };

    let ok = false;
    try {
      const supabase = createClient();
      const { error } = await supabase.from("ferguson_leads").insert(lead);
      ok = !error;
    } catch {
      ok = false;
    }

    if (ok) {
      setSuccess(true);
    } else {
      // Lossless fallback — never silently drop a lead.
      const txt = encodeURIComponent(
        `Hi Ferguson Law — ${lead.name} (${lead.phone})\n${lead.message}`,
      );
      setErrorHtml(
        `Couldn’t send just now — <a href="${waLink()}&text=${txt}" target="_blank" rel="noopener">tap to reach us on WhatsApp</a>.`,
      );
      setSending(false);
    }
  }

  return (
    <div className="lead-card" id="leadCard">
      {!success ? (
        <>
          <div className="lead-or">
            <span>Or send a message — we&apos;ll reply within one business day.</span>
          </div>
          <form id="leadForm" className="lead-form" noValidate onSubmit={onSubmit}>
            <div className="two">
              <div className="field">
                <label htmlFor="lfName">Name</label>
                <input
                  id="lfName"
                  name="name"
                  type="text"
                  autoComplete="name"
                  placeholder="Marsha Brown"
                  required
                  className={errName ? "err" : undefined}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setErrName(false);
                  }}
                />
                <span className="errmsg">Please enter your name</span>
              </div>
              <div className="field">
                <label htmlFor="lfPhone">WhatsApp / phone</label>
                <input
                  id="lfPhone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+1 876 000 0000"
                  required
                  className={errPhone ? "err" : undefined}
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setErrPhone(false);
                  }}
                />
                <span className="errmsg">Enter a contact number</span>
              </div>
            </div>
            <div className="field">
              <label htmlFor="lfEmail">
                Email{" "}
                <span style={{ color: "var(--muted)", fontWeight: 400 }}>
                  (optional)
                </span>
              </label>
              <input
                id="lfEmail"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@email.com"
                className={errEmail ? "err" : undefined}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrEmail(false);
                }}
              />
              <span className="errmsg">Enter a valid email</span>
            </div>
            <div className="field">
              <label htmlFor="lfMsg">How can we help?</label>
              <textarea
                id="lfMsg"
                name="message"
                rows={3}
                placeholder="A sentence about your matter…"
                required
                className={errMsg ? "err" : undefined}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  setErrMsg(false);
                }}
              />
              <span className="errmsg">Tell us briefly what you need</span>
            </div>
            <button
              className="btn btn-primary lead-submit"
              type="submit"
              id="lfSubmit"
              disabled={sending}
            >
              <span>{sending ? "Sending…" : "Send message"}</span>
            </button>
            <p className="lead-note">
              🔒 Private &amp; confidential. Goes straight to Ferguson Law.
            </p>
            {errorHtml && (
              <p
                className="lead-err"
                id="leadErr"
                dangerouslySetInnerHTML={{ __html: errorHtml }}
              />
            )}
          </form>
        </>
      ) : (
        <div className="lead-success" id="leadSuccess">
          <div className="check">✓</div>
          <h3>Message received.</h3>
          <p>
            Thank you — Ferguson Law has your details and will be in touch
            shortly.
          </p>
        </div>
      )}
    </div>
  );
}
