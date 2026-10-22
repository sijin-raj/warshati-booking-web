import { fetchCarWashInfo } from "@/lib/api";
import CarWashBooking from "@/components/CarWashBooking";
import NotFoundMessage from "@/components/NotFoundMessage";

export const dynamic = "force-dynamic";

export default async function CarWashPage({ params }: { params: Promise<{ garageId: string }> }) {
  const { garageId } = await params;
  const info = /^\d+$/.test(garageId) ? await fetchCarWashInfo(garageId).catch(() => null) : null;
  if (!info) return <NotFoundMessage />;
  return <CarWashBooking garageId={garageId} info={info} />;
}
