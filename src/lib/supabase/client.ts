"use client";

import { createBrowserClient } from "@supabase/ssr";

const SUPABASE_URL = "https://ibtadbwtrxglujkzqofs.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlidGFkYnd0cnhnbHVqa3pxb2ZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2OTE2NTUsImV4cCI6MjA5NDI2NzY1NX0.ihwCJOvYU2hZL3aruKzgrN9BqA42o-fivqc-yMjm6Qw";

/** Browser Supabase client — uses the publishable (anon) key only. */
export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
