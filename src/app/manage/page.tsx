import { cookies } from "next/headers";
import CarWashManage from "@/components/CarWashManage";

export const dynamic = "force-dynamic";

// Reached through the redirect in src/proxy.ts, which keeps the booking token out of the address.
export default async function ManagePage({ searchParams }: { searchParams: Promise<{ ref?: string | string[] }> }) {
  const { ref } = await searchParams;
  const token = typeof ref === "string" && /^[0-9a-f]{16}$/.test(ref) ? (await cookies()).get(`lezof-manage-${ref}`)?.value : undefined;
  // With no token the component's lookup fails and it shows "booking not found".
  return <CarWashManage token={token ?? "unknown"} />;
}
