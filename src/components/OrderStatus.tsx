"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";

function subscribeHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

type Order = {
  status: "pending" | "paid" | "expired" | "failed" | "refunded";
  book: string;
  amount: number;
  email: string;
  qr: string | null;
  expiresAt: string | null;
};

const rupiah = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

// The buyer's order page. The secret token sits in the URL hash, so it never reaches server logs
// or the visitor log; the page polls the order until it is paid, expired or failed.
export function OrderStatus() {
  const hash = useSyncExternalStore(subscribeHash, () => location.hash.slice(1), () => null);
  const token = hash && /^[a-f0-9]{48}$/.test(hash) ? hash : null;
  const [order, setOrder] = useState<Order | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [now, setNow] = useState(0); // set by the timer, so prerendering never reads the clock
  const missing = notFound || (hash !== null && !token);

  useEffect(() => {
    if (!token) return;
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const res = await fetch(`/api/orders/${token}`, { cache: "no-store" });
        if (res.status === 404) return setNotFound(true);
        const o: Order = await res.json();
        if (stop) return;
        setOrder(o);
        if (o.status !== "pending") return;
      } catch {}
      if (!stop) timer = setTimeout(poll, 3000);
    };
    poll();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [token]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (missing) {
    return (
      <div className="order-card">
        <span className="label">Pesanan</span>
        <h1>Pesanan tidak ditemukan</h1>
        <p className="muted">Pakai tautan lengkap dari halaman pembayaran, atau beli dari halaman utama.</p>
        <Link className="btn" href="/#books">
          Kembali ke buku
        </Link>
      </div>
    );
  }
  if (!order) return <p className="muted order-card">Memuat pesanan…</p>;

  const left = order.expiresAt && now ? Math.max(0, Math.floor((Date.parse(order.expiresAt) - now) / 1000)) : null;

  return (
    <div className="order-card">
      <span className="label">Pesanan · {order.book}</span>
      {order.status === "pending" && (
        <>
          <h1>Scan untuk bayar {rupiah(order.amount)}</h1>
          <p className="muted">Buka GoPay, OVO, DANA, ShopeePay atau m-banking, lalu scan QRIS ini.</p>
          {order.qr ? (
            // eslint-disable-next-line @next/next/no-img-element -- Midtrans serves the QR image
            <img className="qr" src={order.qr} alt={`QRIS ${rupiah(order.amount)} untuk ${order.book}`} width={280} height={280} />
          ) : (
            <p className="form-error">QR belum tersedia. Muat ulang halaman ini.</p>
          )}
          <p className="mono order-wait">
            <span className="dot" aria-hidden /> Menunggu pembayaran
            {left !== null && ` · ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`}
          </p>
          <p className="muted small">Simpan tautan halaman ini. Setelah bayar, tombol unduh muncul di sini otomatis.</p>
        </>
      )}
      {order.status === "paid" && (
        <>
          <h1>Terima kasih! Pembayaran berhasil.</h1>
          <p className="muted">
            {order.book} siap dibaca. Simpan tautan halaman ini untuk mengunduh lagi nanti (maks. 10 kali).
          </p>
          <a className="btn primary" href={`/api/orders/${token}/download`}>
            Unduh EPUB
          </a>
          <p className="muted small">
            Buka EPUB dengan Google Play Books (upload), Apple Books, atau aplikasi pembaca EPUB lainnya.
          </p>
        </>
      )}
      {(order.status === "expired" || order.status === "failed") && (
        <>
          <h1>{order.status === "expired" ? "QRIS sudah kedaluwarsa" : "Pembayaran gagal"}</h1>
          <p className="muted">Tidak ada dana yang ditarik. Silakan buat pesanan baru.</p>
          <Link className="btn primary" href="/#books">
            Coba lagi
          </Link>
        </>
      )}
      {order.status === "refunded" && (
        <>
          <h1>Pesanan dikembalikan</h1>
          <p className="muted">Dana untuk pesanan ini sudah dikembalikan.</p>
        </>
      )}
    </div>
  );
}
