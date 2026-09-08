'use client';

import PushSubscribe from './PushSubscribe';

export default function BookingPushPrompt({ bookingRef }: { bookingRef: string }) {
  return (
    <div style={{ marginTop: 24 }}>
      <PushSubscribe
        userRole="client"
        userRef={bookingRef}
        promptText="Get notified about your consultation — reminders, updates, and next steps."
        onDone={() => {}}
      />
    </div>
  );
}
