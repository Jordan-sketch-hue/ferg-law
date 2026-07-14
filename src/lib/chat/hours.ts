/**
 * Business hours: Monday–Friday, 9:00 AM – 5:00 PM Jamaica time.
 * Jamaica runs on UTC-5 year-round (no daylight saving).
 */
export function isAfterHours(): boolean {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Jamaica",
    weekday: "short",
    hour: "numeric",
    hour12: false,
  }).formatToParts(now);

  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  // hour12: false can return "24" for midnight in some runtimes — normalise it
  const raw = parts.find((p) => p.type === "hour")?.value ?? "0";
  const hour = parseInt(raw, 10) % 24;

  const isWeekend = weekday === "Sat" || weekday === "Sun";
  const outsideHours = hour < 9 || hour >= 17;

  return isWeekend || outsideHours;
}

function jamaicaTimeLabel(): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Jamaica",
    weekday: "long",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date());
}

/**
 * channel: "whatsapp" | "web" | string
 * If the client is already on WhatsApp we don't tell them to WhatsApp us.
 */
export function afterHoursReply(): string {
  const time = jamaicaTimeLabel();

  return [
    `Thanks for your message! You reached us at **${time}** (Jamaica time) — outside our office hours.`,
    ``,
    `We've received your message and will follow up **Monday – Friday between 9:00 AM and 5:00 PM**. We'll get back to you then.`,
  ].join("\n");
}
