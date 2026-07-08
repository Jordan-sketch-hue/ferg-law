import type { Metadata } from "next";
import AgentConsole from "./AgentConsole";

// Keep the internal live-chat console out of search indexes.
export const metadata: Metadata = {
  title: "Ferguson Law — Live Chat Console",
  robots: { index: false, follow: false },
};

export default function AgentPage() {
  return <AgentConsole />;
}
