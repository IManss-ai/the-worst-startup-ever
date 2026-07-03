import type { Metadata } from "next";
import Checkout, {
  type Plan,
} from "@/components/landing/checkout/Checkout";

export const metadata: Metadata = {
  title: "Оформление — NFAC KOMBAT",
};

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan } = await searchParams;
  const resolved: Plan =
    plan === "free" || plan === "enterprise" ? plan : "pro";
  return <Checkout plan={resolved} />;
}
