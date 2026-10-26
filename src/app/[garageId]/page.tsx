import { fetchBookingConfig, fetchCarWashInfo } from "@/lib/api";
import BookingWizard from "@/components/BookingWizard";
import NotFoundMessage from "@/components/NotFoundMessage";

export const dynamic = "force-dynamic";

export default async function BookingPage({ params }: { params: Promise<{ garageId: string }> }) {
  const { garageId } = await params;
  const valid = /^\d+$/.test(garageId);
  const [config, wash] = valid
    ? await Promise.all([fetchBookingConfig(garageId).catch(() => null), fetchCarWashInfo(garageId).catch(() => null)])
    : [null, null];
  if (!config) return <NotFoundMessage />;
  return <BookingWizard config={config} wash={wash?.services.length ? wash : null} />;
}
