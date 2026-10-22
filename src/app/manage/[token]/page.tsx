import CarWashManage from "@/components/CarWashManage";

export const dynamic = "force-dynamic";

export default async function ManagePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <CarWashManage token={token} />;
}
