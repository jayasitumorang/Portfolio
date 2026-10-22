"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

const rupiah = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

// "Buy direct" button: asks for an email, starts a QRIS checkout and opens the order page.
export function BuyButton({ slug, title, price }: { slug: string; title: string; price: number }) {
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
      <dialog ref={dialog} className="buy-dialog" onClose={() => setError(null)}>
        <form onSubmit={submit}>
          <span className="label">Bayar dengan QRIS</span>
          <h3>{title}</h3>
          <p className="muted">
            EPUB, langsung diunduh setelah bayar. {rupiah(price)} lewat GoPay, OVO, DANA, ShopeePay atau mobile banking.
          </p>
          <label>
            Email
            <input name="email" type="email" required autoComplete="email" placeholder="kamu@email.com" />
          </label>
          <label>
            Nama <span className="muted">(opsional)</span>
            <input name="name" autoComplete="name" maxLength={80} />
          </label>
          {error && <p className="form-error">{error}</p>}
          <div className="buy-actions">
            <button type="button" className="btn" onClick={() => dialog.current?.close()}>
              Batal
            </button>
            <button type="submit" className="btn primary" disabled={busy}>
              {busy ? "Membuat QRIS…" : "Lanjut ke QRIS"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
