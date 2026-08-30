export function track(
  eventName: string,
  properties?: Record<string, unknown>,
) {
  if (typeof window === "undefined") return;
  fetch("/api/analytics/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event_name: eventName,
      page_path:  window.location.pathname,
      referrer:   document.referrer,
      properties: properties ?? {},
    }),
  }).catch(() => {});
}
