import { redirect } from "next/navigation";
import HomeMessage from "@/components/HomeMessage";

// "/" opens the default branch if one is configured; otherwise explains how to get a booking link.
export default function Home() {
  const defaultGarage = process.env.NEXT_PUBLIC_DEFAULT_GARAGE_ID;
  if (defaultGarage && /^\d+$/.test(defaultGarage)) redirect(`/${defaultGarage}`);
  return <HomeMessage />;
}
