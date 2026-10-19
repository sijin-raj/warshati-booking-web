import { fetchBookingConfig } from "@/lib/api";
import BookingWizard from "@/components/BookingWizard";
import HomeMessage from "@/components/HomeMessage";
import NotFoundMessage from "@/components/NotFoundMessage";

export const dynamic = "force-dynamic";

// "/" shows the default branch's booking page right here (no redirect, so the address
// stays clean); without a configured default it explains how to get a booking link.
// Branch-specific links keep working at /<garageId>.
export default async function Home() {
  const defaultGarage = process.env.NEXT_PUBLIC_DEFAULT_GARAGE_ID;
  if (!defaultGarage || !/^\d+$/.test(defaultGarage)) return <HomeMessage />;
  const config = await fetchBookingConfig(defaultGarage).catch(() => null);
  if (!config) return <NotFoundMessage />;
  return <BookingWizard config={config} />;
}
