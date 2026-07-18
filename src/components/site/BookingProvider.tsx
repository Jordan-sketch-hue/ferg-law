"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import BookingModal from "./BookingModal";

type BookingContextValue = {
  open: boolean;
  openBooking: () => void;
  closeBooking: () => void;
};

export const BookingContext = createContext<BookingContextValue | null>(null);

export function useBooking(): BookingContextValue {
  const ctx = useContext(BookingContext);
  if (!ctx) {
    throw new Error("useBooking must be used within <BookingProvider>");
  }
  return ctx;
}

export function BookingProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  // Bumped on every open so the modal remounts fresh (resets to step 1) —
  // replaces the original `open()`'s step/inQuiz reset without a setState effect.
  const [openCount, setOpenCount] = useState(0);

  const openBooking = useCallback(() => {
    setOpenCount((c) => c + 1);
    setOpen(true);
  }, []);

  const closeBooking = useCallback(() => setOpen(false), []);

  const value = useMemo<BookingContextValue>(
    () => ({ open, openBooking, closeBooking }),
    [open, openBooking, closeBooking],
  );

  return (
    <BookingContext.Provider value={value}>
      {children}
      <BookingModal key={openCount} open={open} onClose={closeBooking} />
    </BookingContext.Provider>
  );
}

/** A `<button class="btn ...">` that opens the booking modal on click. */
export function BookButton({
  className,
  children,
  type = "button",
  onClick,
}: {
  className?: string;
  children: ReactNode;
  type?: "button" | "submit";
  onClick?: () => void;
}) {
  const { openBooking } = useBooking();
  return (
    <button
      type={type}
      className={className}
      onClick={() => { onClick?.(); openBooking(); }}
    >
      {children}
    </button>
  );
}
