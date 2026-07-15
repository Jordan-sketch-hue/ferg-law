"use client";

import { useEffect, useMemo, useState } from "react";
import { waLink } from "@/lib/site";
import { createClient } from "@/lib/supabase/client";
import { consultFee, formatJmd } from "@/lib/payments/fees";

type Service = { id: string; ic: string; t: string; s: string };
type QuizOption = { l: string; w: Record<string, number> };
type QuizQuestion = { q: string; opts: QuizOption[] };

const SERVICES: Service[] = [
  {
    id: "realestate",
    ic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7M5 10v10h14V10M10 20v-6h4v6"/></svg>',
    t: "Real Estate & Conveyancing",
    s: "20 min consultation",
  },
  {
    id: "divorce",
    ic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    t: "Divorce & Matrimonial",
    s: "20 min consultation",
  },
  {
    id: "family",
    ic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9.5" r="2.2"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0M15.2 20a4.3 4.3 0 0 1 5.3-4.1"/></svg>',
    t: "Family & Estate",
    s: "20 min consultation",
  },
  {
    id: "sports",
    ic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10zM2 12h20"/></svg>',
    t: "Sports Law",
    s: "20 min consultation",
  },
  {
    id: "corporate",
    ic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V10m4 11V10m6 11V10m4 11V10M12 3l9 5H3z"/></svg>',
    t: "Corporate & Commercial",
    s: "20 min consultation",
  },
  {
    id: "ip",
    ic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>',
    t: "Intellectual Property",
    s: "20 min consultation",
  },
];

const QUIZ: QuizQuestion[] = [
  {
    q: "What best describes you right now?",
    opts: [
      { l: "A business or company", w: { corporate: 2, ip: 1 } },
      { l: "An individual or family", w: { family: 2, divorce: 1 } },
      { l: "Living overseas / diaspora", w: { realestate: 2, family: 1 } },
    ],
  },
  {
    q: "What do you mainly need?",
    opts: [
      { l: "Property / buying or selling", w: { realestate: 3 } },
      { l: "Contracts / company setup", w: { corporate: 3 } },
      { l: "Wills / estate / family", w: { family: 3 } },
      { l: "Divorce / separation", w: { divorce: 3 } },
      { l: "Sports / IP / brand protection", w: { sports: 2, ip: 2 } },
    ],
  },
  {
    q: "How soon do you need help?",
    opts: [
      { l: "Urgently — this week", w: { divorce: 1, corporate: 1 } },
      { l: "In the next month", w: { realestate: 1, family: 1 } },
      { l: "Just exploring options", w: { ip: 1, sports: 1 } },
    ],
  },
];

const LABELS = [
  "Step 1 of 4 · Choose a service",
  "Step 2 of 4 · Date & time",
  "Step 3 of 4 · Your details",
  "Step 4 of 4 · Review & confirm",
];

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Live availability returned by /api/booking/slots, grouped by day.
type ApiSlot = { iso: string; label: string; available: boolean };
type ApiDay = { date: string; label: string; slots: ApiSlot[] };
type SlotsResponse = { days: ApiDay[] };

export default function BookingModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [step, setStep] = useState(0); // 0..4
  const [inQuiz, setInQuiz] = useState(false);

  const [service, setService] = useState<string | null>(null);
  // `date` is the selected day key (yyyy-MM-dd); `slot` is the selected slot's
  // ISO start time. Labels for the review screen come from the fetched data.
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null); // ISO start time

  // Live availability for the chosen service.
  const [days, setDays] = useState<ApiDay[]>([]);
  const [slotsError, setSlotsError] = useState(false);
  const [slotsFor, setSlotsFor] = useState<string | null>(null); // service slots are loaded for

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [fName, setFName] = useState("");
  const [lName, setLName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [marked, setMarked] = useState(false); // show field errors

  // quiz: per-question selected option index
  const [quizPick, setQuizPick] = useState<Record<number, number>>({});

  const [bookingDone, setBookingDone] = useState(false);
  const [ref, setRef] = useState("FL-000000");

  // Free-invite bypass: read ?invite=CODE once on mount and validate it via the
  // PII-free fl_check_invite RPC. When valid we skip payment and book free.
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteValid, setInviteValid] = useState(false);

  // Lock body scroll while open; cleanup on close. (Step reset is handled by
  // BookingProvider remounting this component via `key` on each open.)
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Read ?invite=CODE once on mount and validate it. If valid, the booking goes
  // down the free path (no payment) and we show a gold note in the modal.
  useEffect(() => {
    let code: string | null = null;
    try {
      code = new URLSearchParams(window.location.search).get("invite");
    } catch {
      code = null;
    }
    if (!code) return;

    let cancelled = false;
    void (async () => {
      // Yield once so the setState below is not synchronous with mount.
      await Promise.resolve();
      if (cancelled) return;
      setInviteCode(code);
      try {
        const supabase = createClient();
        const { data, error } = await supabase.rpc("fl_check_invite", {
          p_code: code,
        });
        if (cancelled) return;
        // RPC returns a single { valid, label } row.
        const row = Array.isArray(data) ? data[0] : data;
        setInviteValid(!error && !!row && row.valid === true);
      } catch {
        if (!cancelled) setInviteValid(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch live availability whenever the date/time step is reached for a
  // service whose slots we haven't loaded yet. `loadedFor` is the service the
  // current `days` belong to; while it lags `service` we show the loading
  // state (derived, not stored — so no setState runs synchronously here).
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const slotsLoading =
    step === 1 && !inQuiz && !!service && loadedFor !== service && !slotsError;

  useEffect(() => {
    if (inQuiz) return;
    if (step !== 1) return;
    if (!service) return;
    if (slotsFor === service) return; // already loaded for this service

    let cancelled = false;
    const target = service;

    (async () => {
      try {
        const r = await fetch(
          `/api/booking/slots?service=${encodeURIComponent(target)}&days=14`,
        );
        if (!r.ok) throw new Error("bad status");
        const data = (await r.json()) as SlotsResponse;
        if (cancelled) return;
        const list = data.days || [];
        setDays(list);
        setSlotsFor(target);
        setLoadedFor(target);
        setSlotsError(false);
        // Preselect the first day that has at least one available slot.
        const firstOpen = list.find((d) => d.slots.some((s) => s.available));
        setDate(firstOpen ? firstOpen.date : null);
        setSlot(null);
      } catch {
        if (!cancelled) {
          setSlotsError(true);
          setLoadedFor(target);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, step, inQuiz, service, slotsFor]);

  const selectedDay = useMemo(
    () => days.find((d) => d.date === date) ?? null,
    [days, date],
  );

  const validDetails = useMemo(() => {
    const okEmail = emailRe.test(email.trim());
    const okPhone = phone.replace(/\D/g, "").length >= 7;
    return fName.trim() !== "" && lName.trim() !== "" && okEmail && okPhone;
  }, [fName, lName, email, phone]);

  const canAdvance = (): boolean => {
    if (inQuiz) return !!service;
    if (step === 0) return !!service;
    if (step === 1) return !!date && !!slot;
    if (step === 2) return validDetails;
    if (step === 3) return !submitting || bookingDone;
    return false;
  };

  // recommender scoring — runs whenever all questions answered
  function scoreQuiz(picks: Record<number, number>) {
    if (Object.keys(picks).length < QUIZ.length) return;
    const score: Record<string, number> = {};
    QUIZ.forEach((item, qi) => {
      const w = item.opts[picks[qi]].w;
      for (const k in w) score[k] = (score[k] || 0) + w[k];
    });
    let best: string | null = null;
    let bv = -1;
    for (const k in score) {
      if (score[k] > bv) {
        bv = score[k];
        best = k;
      }
    }
    if (best) setService(best);
  }

  const recService =
    Object.keys(quizPick).length === QUIZ.length && service
      ? SERVICES.find((s) => s.id === service)
      : null;

  function onPickQuiz(qi: number, oi: number) {
    const next = { ...quizPick, [qi]: oi };
    setQuizPick(next);
    scoreQuiz(next);
  }

  async function confirmBooking() {
    if (submitting) return;
    if (!service || !slot) {
      setSubmitError("Please choose a date and time.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);

    const recommender =
      Object.keys(quizPick).length === QUIZ.length && service ? service : null;

    try {
      const res = await fetch("/api/booking/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service,
          startsAt: slot,
          firstName: fName.trim(),
          lastName: lName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          notes: notes.trim(),
          recommender,
          // Only sent when a valid invite is applied → server books free.
          inviteCode: inviteValid ? inviteCode : null,
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok: boolean; ref?: string; error?: string; free?: boolean; payUrl?: string }
        | null;

      if (!res.ok || !data || !data.ok || !data.ref) {
        // 409 means the slot was just taken — push the visitor back to pick again.
        if (res.status === 409) {
          setSlotsFor(null); // force a fresh availability fetch
          setLoadedFor(null);
          setSlot(null);
        }
        setSubmitError(
          data?.error ||
            "We couldn't complete your booking. Please try another time or reach us on WhatsApp.",
        );
        return;
      }

      // Pay path: open the payment gateway in a new tab so the user stays on this page.
      if (data.payUrl) {
        setRef(data.ref);
        window.open(data.payUrl, "_blank", "noopener,noreferrer");
        setBookingDone(true);
        return;
      }

      // Free path (valid invite): show the existing success screen immediately.
      setRef(data.ref);
      setBookingDone(true);
    } catch {
      setSubmitError(
        "We couldn't reach the server. Please try again or reach us on WhatsApp.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function onNext() {
    if (inQuiz) {
      setInQuiz(false);
      setStep(1);
      return;
    }
    if (step === 2 && !validDetails) {
      setMarked(true);
      return;
    }
    if (step === 3) {
      if (bookingDone) onClose();
      else confirmBooking();
      return;
    }
    if (step < 3) setStep((s) => s + 1);
  }

  function onBack() {
    if (inQuiz) {
      setInQuiz(false);
      return;
    }
    if (step > 0) setStep((s) => s - 1);
  }

  function openHelper() {
    setInQuiz(true);
    setQuizPick({});
  }

  const sv = SERVICES.find((s) => s.id === service);

  // Consultation fee for the review step (skipped when an invite makes it free).
  const fee = service ? consultFee(service) : 0;

  // Human labels for the chosen day/slot, resolved from the fetched data.
  const dateLabel = selectedDay?.label ?? null;
  const slotLabel =
    selectedDay?.slots.find((s) => s.iso === slot)?.label ?? null;

  const freeBooking = inviteValid && !!inviteCode;
  const confirmLabel = freeBooking
    ? "Confirm booking"
    : `Pay ${formatJmd(fee)} & confirm`;
  const nextLabel = inQuiz
    ? "Use this service"
    : step === 3
      ? bookingDone
        ? "Done"
        : submitting
          ? freeBooking
            ? "Booking…"
            : "Redirecting…"
          : confirmLabel
      : "Continue";
  const headLabel = inQuiz ? "Find the right service" : LABELS[step];
  const backHidden = (step === 0 && !inQuiz) || bookingDone;

  const reviewRows: [string, string][] = [
    ["Attorney", "Owen K. Ferguson, JP"],
    ["Service", sv ? sv.t : "—"],
    ["Date", dateLabel || "—"],
    ["Time", slotLabel || "—"],
    ["Name", `${fName} ${lName}`.trim() || "—"],
    ["Email", email || "—"],
    ["Phone", phone || "—"],
    ["Brief description", notes.trim() || "—"],
  ];

  const waConfirmHref = `${waLink()}&text=${encodeURIComponent(
    `Hi Ferguson Law — I booked a consultation.\nRef: ${ref}\nService: ${
      sv ? sv.t : ""
    }\nWhen: ${dateLabel ?? ""} · ${slotLabel ?? ""}\nName: ${fName} ${lName}`,
  )}`;

  // active-step helper for the .mstep visibility
  const isActive = (dataStep: number | "quiz") => {
    if (inQuiz) return dataStep === "quiz";
    return dataStep === step;
  };

  return (
    <div
      className={`modal-overlay${open ? " open" : ""}`}
      id="bookModal"
      aria-hidden={!open}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Book a consultation with Ferguson Law"
      >
        <div className="modal-head">
          <div className="mh-top">
            <div className="mh-brand">
              <span className="crest">F</span> Ferguson Law
            </div>
            <button className="mclose" id="mClose" aria-label="Close" onClick={onClose}>
              ×
            </button>
          </div>
          <div className="steps" id="steps">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`st${i < step ? " done" : ""}${
                  i === step && !inQuiz ? " active" : ""
                }`}
              ></div>
            ))}
          </div>
          <div className="mh-label" id="mhLabel">
            {headLabel}
          </div>
        </div>

        <div className="modal-body" id="modalBody">
          {/* STEP 1 — service */}
          <div className={`mstep${isActive(0) ? " active" : ""}`} data-step="0">
            <h3>What can we help with?</h3>
            {freeBooking && (
              <div
                style={{
                  margin: "0 0 14px",
                  padding: "10px 13px",
                  borderRadius: 10,
                  background: "rgba(200,166,92,.14)",
                  border: "1px solid rgba(200,166,92,.5)",
                  color: "var(--gold-deep, #A8853E)",
                  fontSize: ".88rem",
                  fontWeight: 600,
                }}
              >
                ✓ Complimentary consultation invite applied
              </div>
            )}
            <p className="sub">
              Pick the service closest to your need — we&apos;ll confirm the
              details on the call.
            </p>
            <div className="svc-grid" id="svcGrid">
              {SERVICES.map((svc) => (
                <button
                  key={svc.id}
                  className={`svc-opt${service === svc.id ? " sel" : ""}`}
                  data-id={svc.id}
                  onClick={() => setService(svc.id)}
                >
                  <span
                    className="so-ic"
                    dangerouslySetInnerHTML={{ __html: svc.ic }}
                  />
                  <span className="so-txt">
                    <span className="so-t">{svc.t}</span>
                    <br />
                    <span className="so-s">{svc.s}</span>
                  </span>
                </button>
              ))}
            </div>
            <button className="helper-link" id="helperBtn" onClick={openHelper}>
              Not sure where to start? Help me choose →
            </button>
          </div>

          {/* STEP 1b — recommender */}
          <div className={`mstep${isActive("quiz") ? " active" : ""}`} data-step="quiz">
            <h3>Let&apos;s find the right fit.</h3>
            <p className="sub">Three quick questions — no commitment.</p>
            <div id="quizBox">
              {QUIZ.map((item, qi) => (
                <div className="quiz-q" key={qi}>
                  <div className="q-label">
                    {qi + 1}. {item.q}
                  </div>
                  <div className="quiz-opts">
                    {item.opts.map((o, oi) => (
                      <button
                        key={oi}
                        className={`qopt${quizPick[qi] === oi ? " sel" : ""}`}
                        onClick={() => onPickQuiz(qi, oi)}
                      >
                        {o.l}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div
              className="rec-result"
              id="recResult"
              style={{ display: recService ? "block" : "none" }}
            >
              <div className="rl">Recommended</div>
              <h4 id="recName">{recService ? recService.t : "—"}</h4>
              <p id="recWhy">
                {recService
                  ? "Based on your answers, this is the best place to start. You can change it on the next step."
                  : "—"}
              </p>
            </div>
          </div>

          {/* STEP 2 — date & time */}
          <div className={`mstep${isActive(1) ? " active" : ""}`} data-step="1">
            <h3>Choose a date &amp; time.</h3>
            <p className="sub">
              Consultations run Monday–Friday. All times shown in Jamaica (EST).
            </p>
            {slotsLoading ? (
              <p className="sub" aria-live="polite">
                Loading available times…
              </p>
            ) : slotsError ? (
              <p className="sub" aria-live="polite">
                We couldn&apos;t load live availability.{" "}
                <a href={waLink()} target="_blank" rel="noopener">
                  Reach us on WhatsApp
                </a>{" "}
                and we&apos;ll book you in.
              </p>
            ) : days.length === 0 ? (
              <p className="sub" aria-live="polite">
                No open times in the next two weeks.{" "}
                <a href={waLink()} target="_blank" rel="noopener">
                  Message us on WhatsApp
                </a>{" "}
                for the soonest slot.
              </p>
            ) : (
              <>
                <div className="date-row" id="dateRow">
                  {days.map((d) => {
                    const [dow, num, mon] = d.label.split(" ");
                    return (
                      <button
                        key={d.date}
                        className={`date-chip${date === d.date ? " sel" : ""}`}
                        onClick={() => {
                          setDate(d.date);
                          setSlot(null);
                        }}
                      >
                        <div className="dc-d">{dow}</div>
                        <div className="dc-n">{num}</div>
                        <div className="dc-m">{mon}</div>
                      </button>
                    );
                  })}
                </div>
                <div className="slot-grid" id="slotGrid">
                  {(selectedDay?.slots ?? []).map((s) => (
                    <button
                      key={s.iso}
                      className={`slot${slot === s.iso ? " sel" : ""}`}
                      disabled={!s.available}
                      onClick={() => s.available && setSlot(s.iso)}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* STEP 3 — details */}
          <div className={`mstep${isActive(2) ? " active" : ""}`} data-step="2">
            <h3>Your details.</h3>
            <p className="sub">
              So we can confirm your booking and prepare for your matter.
            </p>
            <div className="two">
              <div className="field">
                <label>First name</label>
                <input
                  id="fName"
                  type="text"
                  placeholder="Marsha"
                  className={marked && !fName.trim() ? "err" : undefined}
                  value={fName}
                  onChange={(e) => setFName(e.target.value)}
                />
                <span className="errmsg">Required</span>
              </div>
              <div className="field">
                <label>Last name</label>
                <input
                  id="lName"
                  type="text"
                  placeholder="Brown"
                  className={marked && !lName.trim() ? "err" : undefined}
                  value={lName}
                  onChange={(e) => setLName(e.target.value)}
                />
                <span className="errmsg">Required</span>
              </div>
            </div>
            <div className="field">
              <label>Email</label>
              <input
                id="email"
                type="email"
                placeholder="you@email.com"
                className={marked && !emailRe.test(email.trim()) ? "err" : undefined}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <span className="errmsg">Enter a valid email</span>
            </div>
            <div className="field">
              <label>WhatsApp / phone</label>
              <input
                id="phone"
                type="tel"
                placeholder="+1 800 000 0000"
                className={
                  marked && phone.replace(/\D/g, "").length < 7 ? "err" : undefined
                }
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <span className="errmsg">Enter a valid number</span>
            </div>
            <div className="field">
              <label>
                Brief description{" "}
                <span style={{ color: "var(--muted)", fontWeight: 400 }}>
                  (optional)
                </span>
              </label>
              <textarea
                id="notes"
                rows={2}
                placeholder="A sentence about what you need…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* STEP 4 — review / success */}
          <div className={`mstep${isActive(3) ? " active" : ""}`} data-step="3">
            <div id="reviewWrap" style={{ display: bookingDone ? "none" : "block" }}>
              <h3>Review &amp; confirm.</h3>
              <p className="sub">
                One last look before we lock in your consultation.
              </p>
              <div className="rev-list" id="revList">
                {reviewRows.map(([k, v]) => (
                  <div className="rev-row" key={k}>
                    <span className="rk">{k}</span>
                    <span className="rv">{v}</span>
                  </div>
                ))}
              </div>
              {freeBooking ? (
                <div
                  style={{
                    marginTop: 16,
                    padding: "12px 14px",
                    borderRadius: 10,
                    background: "rgba(200,166,92,.14)",
                    border: "1px solid rgba(200,166,92,.5)",
                    color: "var(--gold-deep, #A8853E)",
                    fontSize: ".9rem",
                    fontWeight: 600,
                  }}
                >
                  ✓ Complimentary consultation invite applied — no payment needed.
                </div>
              ) : (
                <>
                  <p className="sub" style={{ marginTop: 16 }}>
                    Consultation fee: <b>{formatJmd(fee)}</b> (≈US$50) — paid
                    securely to confirm your booking.
                  </p>
                  <p
                    className="sub"
                    style={{
                      marginTop: 6,
                      color: "var(--gold-deep, #A8853E)",
                      fontWeight: 600,
                    }}
                  >
                    Credited toward your legal fees once you engage Ferguson Law.
                  </p>
                </>
              )}
              {submitError && (
                <p className="sub" role="alert" style={{ color: "#b3261e" }}>
                  {submitError}{" "}
                  <a href={waConfirmHref} target="_blank" rel="noopener">
                    Book on WhatsApp instead
                  </a>
                </p>
              )}
            </div>
            <div
              className="success"
              id="successWrap"
              style={{ display: bookingDone ? "block" : "none" }}
            >
              <div className="check">✓</div>
              <h3>You&apos;re booked.</h3>
              <p>
                A confirmation is on its way to your email and WhatsApp.
                We&apos;ll send a secure intake link before your consult.
              </p>
              <div className="ref-badge" id="refBadge">
                {ref}
              </div>
              <div>
                <a
                  className="btn btn-gold"
                  id="waConfirm"
                  href={waConfirmHref}
                  target="_blank"
                  rel="noopener"
                >
                  Send details on WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-foot" id="modalFoot">
          {step === 0 && !inQuiz && !bookingDone ? (
            <button className="mback" onClick={onClose}>
              Cancel
            </button>
          ) : (
            <button className="mback" id="mBack" hidden={backHidden} onClick={onBack}>
              ← Back
            </button>
          )}
          <button
            className="btn btn-primary"
            id="mNext"
            disabled={!canAdvance()}
            onClick={onNext}
          >
            {nextLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
