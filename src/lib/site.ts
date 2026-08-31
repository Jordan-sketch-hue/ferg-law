/**
 * Single source of truth for firm-wide constants.
 * Pulled from the approved Ferguson Law pitch — keep real, deliverable values here.
 */
export const SITE = {
  name: "Ferguson Law",
  tagline: "Counsel · Compliance · Care",
  city: "Kingston, Jamaica",
  founder: "Owen K. Ferguson, JP",
  founderRole: "Founder & Principal Attorney-at-Law",
  // Contact
  whatsappNumber: "18763200235", // wa.me format (no +)
  whatsappDisplay: "(876) 320-0235",
  email: "contact@fergusonlawja.com",
  website: "https://fergusonlawja.com",
  // Booking
  bookingUrl: "https://fergusonlawja.com/booking",
  // External products
  homeApp: "https://home.fergusonlawja.com/",
  ebookApp: "https://home.fergusonlawja.com/ebook",
} as const;

/** Consultation duration in minutes. */
export const CONSULT_DURATION_MIN = 20;

export const waLink = (text?: string) =>
  `https://wa.me/${SITE.whatsappNumber}${
    text ? `?text=${encodeURIComponent(text)}` : ""
  }`;
