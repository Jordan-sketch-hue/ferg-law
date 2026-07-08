import type { Metadata } from "next";
import AdminDashboard from "@/components/admin/AdminDashboard";

// Keep the back-office CRM out of search indexes.
export const metadata: Metadata = {
  title: "Ferguson Law — Back office",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminDashboard />;
}
