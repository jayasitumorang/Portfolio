import type { Metadata } from "next";
import { OrderStatus } from "@/components/OrderStatus";
import { SiteNav } from "@/components/SiteNav";

export const metadata: Metadata = { title: "Pesanan · Jaya Situmorang", robots: { index: false, follow: false } };

export default function OrderPage() {
  return (
    <>
      <SiteNav tab="home" />
      <main className="page wrap order">
        <OrderStatus />
      </main>
    </>
  );
}
