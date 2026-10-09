"use client";

import { useState } from "react";

export function CopyEmail({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.getSelection()?.selectAllChildren(document.getElementById("email-text")!);
    }
  }
  return (
    <button type="button" className="btn ghost" onClick={copy} aria-live="polite">
      {copied ? "Copied" : "Copy email"}
    </button>
  );
}
