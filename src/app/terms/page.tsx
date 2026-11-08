import type { Metadata } from "next";
import PolicyPage from "@/components/PolicyPage";

export const metadata: Metadata = { title: "Booking policy & terms" };

export default function TermsPage() {
  return <PolicyPage />;
}
