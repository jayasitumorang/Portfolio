"use client";

import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { BuySteps, WALLETS } from "@/components/BuyButton";

function subscribeHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

type Order = {
  status: "pending" | "paid" | "expired" | "failed" | "refunded";
  book: string;
  slug: string;
  amount: number;
  email: string;
  qr: string | null;
  expiresAt: string | null;
  paidAt: string | null;
};

export type BookLook = { cover: StaticImageData; glow: string; spine: string; subtitle: string };

const rupiah = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
const when = (iso: string) =>
  new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(
    new Date(iso),
  );
const QR_MINUTES = 15;

// The buyer's order page. The secret token sits in the URL hash, so it never reaches server logs
// or the visitor log; the page polls the order until it is paid, expired or failed.
export function OrderStatus({ looks }: { looks: Record<string, BookLook> }) {
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
      <div className="ticket ticket-solo">
        <div className="ticket-body">
          <span className="label">Pesanan</span>
          <h1>Pesanan tidak ditemukan</h1>
          <p className="muted">Pakai tautan lengkap dari halaman pembayaran, atau beli dari halaman utama.</p>
          <Link className="btn primary" href="/#books">
            Kembali ke buku
          </Link>
        </div>
      </div>
    );
  }
  if (!order) {
    return (
      <div className="ticket ticket-solo">
        <div className="ticket-body ticket-loading">
          <span className="spin" aria-hidden /> Memuat pesanan…
        </div>
      </div>
    );
  }

  const look = looks[order.slug];
  const left = order.expiresAt && now ? Math.max(0, Math.floor((Date.parse(order.expiresAt) - now) / 1000)) : null;
  const step = order.status === "paid" ? 3 : 2;

  return (
    <div
      className={`ticket is-${order.status}`}
      style={look ? ({ "--glow": look.glow, "--spine": look.spine } as React.CSSProperties) : undefined}
    >
      <aside className="ticket-side">
        {look && (
          <div className="book ticket-book">
            <span className="book-3d">
              <Image src={look.cover} alt={`Sampul ${order.book}`} sizes="220px" className="book-cover" priority />
            </span>
          </div>
        )}
        <div className="ticket-title">
          <b>{order.book}</b>
          {look && <span>{look.subtitle}</span>}
        </div>
        <dl className="receipt">
          <div>
            <dt>Total</dt>
            <dd>{rupiah(order.amount)}</dd>
          </div>
          <div>
            <dt>Format</dt>
            <dd>EPUB</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{order.email}</dd>
          </div>
          {order.paidAt && (
            <div>
              <dt>Dibayar</dt>
              <dd>{when(order.paidAt)} WIB</dd>
            </div>
          )}
        </dl>
      </aside>

      <div className="ticket-body">
        <BuySteps at={step} />

        {order.status === "pending" && (
          <>
            <h1>
              Scan untuk bayar <span className="amount">{rupiah(order.amount)}</span>
            </h1>
            <p className="muted">Buka aplikasi e-wallet atau m-banking, pilih scan QRIS, lalu arahkan ke kode ini.</p>
            <div className="qr-wrap">
              <div className="qr-frame">
                {order.qr ? (
                  // eslint-disable-next-line @next/next/no-img-element -- Midtrans serves the QR image
                  <img className="qr" src={order.qr} alt={`QRIS ${rupiah(order.amount)} untuk ${order.book}`} width={260} height={260} />
                ) : (
                  <p className="form-error">QR belum tersedia. Muat ulang halaman ini.</p>
                )}
                <span className="qr-scan" aria-hidden />
              </div>
              {left !== null && <Countdown left={left} />}
            </div>
            <ul className="wallets" aria-label="Bisa dibayar dengan">
              {WALLETS.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
            <p className="order-wait mono">
              <span className="dot" aria-hidden /> Menunggu pembayaran, halaman ini update otomatis
            </p>
            <p className="muted small">Simpan tautan halaman ini. Setelah bayar, tombol unduh muncul di sini.</p>
          </>
        )}

        {order.status === "paid" && (
          <>
            <div className="paid-mark" aria-hidden>
              <svg viewBox="0 0 52 52">
                <circle cx="26" cy="26" r="24" />
                <path d="M15 27l7 7 15-15" />
              </svg>
              {Array.from({ length: 14 }, (_, i) => (
                <i key={i} style={{ "--i": i } as React.CSSProperties} />
              ))}
            </div>
            <h1>Terima kasih! Pembayaran berhasil.</h1>
            <p className="muted">
              <b>{order.book}</b> siap dibaca. Simpan tautan halaman ini untuk mengunduh lagi nanti (maks. 10 kali).
            </p>
            <a className="btn buy-submit" href={`/api/orders/${token}/download`}>
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
                <path fill="currentColor" d="M11 3h2v10.2l3.6-3.6L18 11l-6 6-6-6 1.4-1.4L11 13.2V3ZM4 19h16v2H4v-2Z" />
              </svg>
              Unduh EPUB
            </a>
            <p className="muted small">Buka dengan Google Play Books (upload), Apple Books, atau aplikasi pembaca EPUB lain.</p>
          </>
        )}

        {(order.status === "expired" || order.status === "failed") && (
          <>
            <div className="fail-mark" aria-hidden>
              !
            </div>
            <h1>{order.status === "expired" ? "QRIS sudah kedaluwarsa" : "Pembayaran gagal"}</h1>
            <p className="muted">Tidak ada dana yang ditarik. Silakan buat pesanan baru.</p>
            <Link className="btn buy-submit" href="/#books">
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
    </div>
  );
}

/** Ring that empties as the QR code's 15 minutes run out. */
function Countdown({ left }: { left: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const frac = Math.min(1, left / (QR_MINUTES * 60));
  return (
    <div className={`countdown${left < 60 ? " low" : ""}`} role="timer" aria-label={`Sisa waktu ${Math.ceil(left / 60)} menit`}>
      <svg viewBox="0 0 64 64" aria-hidden>
        <circle cx="32" cy="32" r={r} className="track" />
        <circle cx="32" cy="32" r={r} className="bar" strokeDasharray={c} strokeDashoffset={c * (1 - frac)} />
      </svg>
      <span className="mono">
        {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
      </span>
      <small>sisa waktu</small>
    </div>
  );
}
