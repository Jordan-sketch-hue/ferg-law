import type { Metadata } from "next";
import GuidesClient from "./GuidesClient";

export const metadata: Metadata = {
  title: "Explainers — Ferguson Law",
  description: "Free plain-English legal explainers for Jamaican buyers and sellers — backed by a Ferguson Law attorney.",
};

export default function GuidesHub() {
  return <GuidesClient />;
}
