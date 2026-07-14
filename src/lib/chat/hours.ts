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
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);

  const isWeekend = weekday === "Sat" || weekday === "Sun";
  const outsideHours = hour < 9 || hour >= 17;

  return isWeekend || outsideHours;
}

export function afterHoursReply(whatsappDisplay: string): string {
  return `Thank you for reaching out to Ferguson Law!

Our office hours are **Monday – Friday, 9:00 AM – 5:00 PM** (Jamaica time). Your message has been received and we'll get back to you first thing during business hours.

In the meantime you can:
• **Book a consultation** — choose a time that works for you using the button above
• **WhatsApp us** at ${whatsappDisplay} for anything urgent

We look forward to speaking with you soon!`;
}
