"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE, same, token } from "./auth";

export async function signIn(formData: FormData) {
  const pw = process.env.STATS_PASSWORD;
  const given = String(formData.get("password") ?? "");
  if (!pw || !same(token(given), token(pw))) {
    await new Promise((r) => setTimeout(r, 800)); // slow down guessing
    redirect("/stats?wrong=1");
  }
  (await cookies()).set(COOKIE, token(pw), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/stats",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect("/stats");
}

export async function signOut() {
  (await cookies()).delete({ name: COOKIE, path: "/stats" });
  redirect("/stats");
}
