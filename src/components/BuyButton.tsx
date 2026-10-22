"use client";

import Image, { type StaticImageData } from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

const rupiah = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
export const WALLETS = ["QRIS", "GoPay", "OVO", "DANA", "ShopeePay", "m-Banking"];

type Props = {
  slug: string;
  title: string;
  subtitle: string;
  price: number;
  cover: StaticImageData;
  glow: string;
  spine: string;
};

/** The three steps of a direct purchase; `at` is the current one (1-based). */
export function BuySteps({ at }: { at: 1 | 2 | 3 }) {
  return (
    <ol className="buy-steps" aria-label={`Langkah ${at} dari 3`}>
      {["Data", "Scan QRIS", "Unduh"].map((s, i) => (
        <li key={s} className={i + 1 < at ? "done" : i + 1 === at ? "on" : undefined}>
          <i>{i + 1 < at ? "✓" : i + 1}</i>
          {s}
        </li>
      ))}
    </ol>
  );
}

// "Buy direct" button: asks for an email, starts a QRIS checkout and opens the order page.
export function BuyButton({ slug, title, subtitle, price, cover, glow, spine }: Props) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, email: form.get("email"), name: form.get("name") }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.token) throw new Error(data.error ?? "Terjadi kesalahan. Coba lagi.");
      router.push(`/order#${data.token}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className="btn buy" onClick={() => dialog.current?.showModal()}>
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
          <path
            fill="currentColor"
            d="M3 3h8v8H3V3Zm2 2v4h4V5H5Zm8-2h8v8h-8V3Zm2 2v4h4V5h-4ZM3 13h8v8H3v-8Zm2 2v4h4v-4H5Zm8-2h2v2h-2v-2Zm2 2h2v2h-2v-2Zm2-2h2v2h-2v-2Zm2 2h2v2h-2v-2Zm-6 2h2v2h-2v-2Zm2 2h2v2h-2v-2Zm2-2h2v2h-2v-2Zm2 2h2v2h-2v-2Z"
          />
        </svg>
        Beli langsung · {rupiah(price)}
      </button>
      <dialog
        ref={dialog}
        className="buy-dialog"
        style={{ "--glow": glow, "--spine": spine } as React.CSSProperties}
        onClose={() => setError(null)}
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
      >
        <div className="buy-grid">
          <aside className="buy-hero">
            <div className="book buy-book">
              <span className="book-3d">
                <Image src={cover} alt="" sizes="180px" className="book-cover" />
              </span>
            </div>
            <div className="buy-hero-text">
              <span className="buy-kicker">eBook · EPUB</span>
              <b>{title}</b>
              <span>{subtitle}</span>
            </div>
            <div className="buy-price">
              <small>Harga langsung</small>
              <strong>{rupiah(price)}</strong>
              <s>Rp39.000 di toko</s>
            </div>
          </aside>

          <form onSubmit={submit} className="buy-form">
            <button type="button" className="buy-close" aria-label="Tutup" onClick={() => dialog.current?.close()}>
              ×
            </button>
            <BuySteps at={1} />
            <h3>Bayar dengan QRIS</h3>
            <p className="muted">Scan sekali, bukunya langsung bisa diunduh. Tanpa akun, tanpa aplikasi tambahan.</p>
            <ul className="wallets" aria-label="Bisa dibayar dengan">
              {WALLETS.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
            <label>
              Email
              <input name="email" type="email" required autoComplete="email" placeholder="kamu@email.com" autoFocus />
            </label>
            <label>
              <span>
                Nama <span className="muted">(opsional)</span>
              </span>
              <input name="name" autoComplete="name" maxLength={80} placeholder="Nama kamu" />
            </label>
            {error && <p className="form-error">{error}</p>}
            <button type="submit" className="btn buy-submit" disabled={busy}>
              {busy ? (
                <>
                  <span className="spin" aria-hidden /> Membuat QRIS…
                </>
              ) : (
                <>Lanjut ke QRIS →</>
              )}
            </button>
            <p className="buy-safe">
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
                <path fill="currentColor" d="M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5l-8-3Zm-1 14-4-4 1.4-1.4L11 13.2l4.6-4.6L17 10l-6 6Z" />
              </svg>
              Pembayaran aman diproses Midtrans
            </p>
          </form>
        </div>
      </dialog>
    </>
  );
}
