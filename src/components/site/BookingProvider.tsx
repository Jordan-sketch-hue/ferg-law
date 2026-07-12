"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import BookingModal from "./BookingModal";

type BookingContextValue = {
  open: boolean;
  openBooking: () => void;
  closeBooking: () => void;
};

const BookingContext = createContext<BookingContextValue | null>(null);

export function useBooking(): BookingContextValue {
  const ctx = useContext(BookingContext);
  if (!ctx) {
    throw new Error("useBooking must be used within <BookingProvider>");
  }
  return ctx;
}

const EXIT_INTENT_KEY = "fl_exit_intent_shown";

export function BookingProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  // Bumped on every open so the modal remounts fresh (resets to step 1) —
  // replaces the original `open()`'s step/inQuiz reset without a setState effect.
  const [openCount, setOpenCount] = useState(0);

  const value = useMemo<BookingContextValue>(
    () => ({
      open,
      openBooking: () => {
        setOpenCount((c) => c + 1);
        setOpen(true);
      },
      closeBooking: () => setOpen(false),
    }),
    [open],
  );

  // Exit-intent: offer the booking modal once per session when the cursor
  // leaves toward the top of the viewport, instead of on page load.
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    const onMouseLeave = (e: MouseEvent) => {
      if (e.clientY > 0) return; // only the top-of-viewport "leaving the tab" gesture
      if (openRef.current) return;
      if (sessionStorage.getItem(EXIT_INTENT_KEY)) return;
      sessionStorage.setItem(EXIT_INTENT_KEY, "1");
      setOpenCount((c) => c + 1);
      setOpen(true);
    };
    document.addEventListener("mouseleave", onMouseLeave);
    return () => document.removeEventListener("mouseleave", onMouseLeave);
  }, []);

  return (
    <BookingContext.Provider value={value}>
      {children}
      <BookingModal key={openCount} open={open} onClose={value.closeBooking} />
    </BookingContext.Provider>
  );
}

/** A `<button class="btn ...">` that opens the booking modal on click. */
export function BookButton({
  className,
  children,
  type = "button",
}: {
  className?: string;
  children: ReactNode;
  type?: "button" | "submit";
}) {
  const { openBooking } = useBooking();
  return (
    <button type={type} className={className} onClick={openBooking}>
      {children}
    </button>
  );
}
