import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { themeScript } from "@/components/ThemeToggle";
import { InkFilters, InkTrail } from "@/components/InkTrail";
import { Tracker } from "@/components/Tracker";
import { profile } from "@/data/profile";
import "./globals.css";

// Fonts ship with the site (src/app/fonts, all SIL Open Font License), so nothing is fetched from Google.
const display = localFont({ src: "./fonts/BricolageGrotesque-Variable.woff2", weight: "200 800", variable: "--font-display", display: "swap" });
const body = localFont({ src: "./fonts/Geist-Variable.woff2", weight: "100 900", variable: "--font-body", display: "swap" });
const mono = localFont({ src: "./fonts/GeistMono-Variable.woff2", weight: "100 900", variable: "--font-mono", display: "swap" });
const serif = localFont({
  src: [
    { path: "./fonts/Fraunces-Variable.woff2", weight: "300 800", style: "normal" },
    { path: "./fonts/Fraunces-Italic-Variable.woff2", weight: "300 800", style: "italic" },
  ],
  variable: "--font-serif",
  display: "swap",
});
const hand = localFont({ src: "./fonts/Caveat-Variable.woff2", weight: "400 700", variable: "--font-hand", display: "swap" });

const description = `${profile.role} in ${profile.location}. Web and mobile systems end to end, from React and Next.js to Spring Boot, ASP.NET and the cloud.`;

export const metadata: Metadata = {
  metadataBase: new URL(profile.siteUrl),
  title: `${profile.shortName} · ${profile.role}`,
  description,
  openGraph: {
    title: `${profile.name} · ${profile.role}`,
    description,
    url: "/",
    siteName: profile.shortName,
    type: "profile",
  },
  twitter: { card: "summary_large_image", title: `${profile.shortName} · ${profile.role}`, description },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f1e7" },
    { media: "(prefers-color-scheme: dark)", color: "#1b1814" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable} ${serif.variable} ${hand.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <InkFilters />
        {children}
        <InkTrail />
        <Tracker />
      </body>
    </html>
  );
}
