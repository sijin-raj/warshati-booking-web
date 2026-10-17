import { fetchBookingConfig } from "@/lib/api";
import BookingWizard from "@/components/BookingWizard";
import NotFoundMessage from "@/components/NotFoundMessage";

export const dynamic = "force-dynamic";

export default async function BookingPage({ params }: { params: Promise<{ garageId: string }> }) {
  const { garageId } = await params;
  const config = /^\d+$/.test(garageId) ? await fetchBookingConfig(garageId).catch(() => null) : null;
  if (!config) return <NotFoundMessage />;
  return <BookingWizard config={config} />;
}
