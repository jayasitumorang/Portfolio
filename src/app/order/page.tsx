import type { Metadata } from "next";
import { OrderStatus, type BookLook } from "@/components/OrderStatus";
import { SiteNav } from "@/components/SiteNav";
import { books } from "@/data/books";

export const metadata: Metadata = { title: "Pesanan · Jaya Situmorang", robots: { index: false, follow: false } };

const looks: Record<string, BookLook> = Object.fromEntries(
  books.map((b) => [b.slug, { cover: b.cover, glow: b.glow, spine: b.spine, subtitle: b.subtitle }]),
);

export default function OrderPage() {
  return (
    <>
      <SiteNav tab="home" />
      <main className="page order">
        <OrderStatus looks={looks} />
      </main>
    </>
  );
}
