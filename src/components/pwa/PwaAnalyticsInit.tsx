'use client';
import { usePwaAnalytics } from '@/hooks/usePwaAnalytics';
export default function PwaAnalyticsInit() {
  usePwaAnalytics({ site: 'ferguson-law' });
  return null;
}
