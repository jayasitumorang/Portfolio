import type { StaticImageData } from "next/image";
import error404Cover from "@/assets/books/error-404.jpg";
import krsCover from "@/assets/books/krs-kopi.jpg";

// Novels shown on the landing page. Covers live in src/assets/books.

export type Book = {
  slug: string;
  title: string;
  subtitle: string;
  genre: string[];
  blurb: string;
  hook: string;
  cover: StaticImageData;
  url: string;
  pages: number;
  // spine and glow colors, picked from the cover
  spine: string;
  glow: string;
  quotes: { text: string; who: string; where: string }[];
};

export const books: Book[] = [
  {
    slug: "error-404",
    title: "Error 404",
    subtitle: "Cinta Tidak Ditemukan",
    genre: ["Office romance", "Romcom", "Contemporary"],
    hook: "Bisakah sistem yang selalu uptime 99,9% ini akhirnya menemukan 0,1% yang hilang?",
    blurb:
      "Arga (39), IT Manager yang hidupnya cuma berisi server, tiket, dan kopi sachet. Cuti menumpuk 47 hari, dan cinta belum masuk roadmap. Sampai Sekar, Business Analyst baru yang ceria, membuat tiket prioritas CRITICAL: \"Unit Arga belum makan sejak pagi.\" Romansa kantor yang hangat, lucu, dan menyentuh tentang kelelahan kerja, duka, dan kesempatan kedua.",
    cover: error404Cover,
    url: "https://play.google.com/store/books/details?id=NkMbEgAAQBAJ",
    pages: 119,
    spine: "#1b2a4e",
    glow: "#f5b84a",
    quotes: [
      { text: "Tapi Pak, laptop nggak bisa bawain bubur kalau Bapak sakit.", who: "Sekar", where: "Bab 4" },
      { text: "Bapak itu bukan bug, Pak. Bapak cuma orang yang selama ini lupa pulang.", who: "Dimas", where: "Bab 9" },
      { text: "Kamu janji, kamu bakal hidup. Bukan cuma kerja. Hidup.", who: "Bu Sri", where: "Bab 8" },
    ],
  },
  {
    slug: "krs-kopi",
    title: "KRS, Kopi, dan Kode Gebetan",
    subtitle: "Komedi Romantis Kehidupan Kampus",
    genre: ["Campus romcom", "New adult", "Coming of age"],
    hook: "Ia tidak perlu menunggu siap untuk datang.",
    blurb:
      "Jaya Pratama baru saja berjanji akan membaca semua instruksi sebelum menekan tombol. Satu menit kemudian, ia terdaftar di Statistik kelas Jumat pukul tujuh pagi. Lalu ia satu kelompok dengan Nadira, teman sekelas yang membuat satu pesan sederhana butuh tiga kali revisi. Komedi romantis tentang orang-orang yang belum sepenuhnya siap, tapi mulai berani datang.",
    cover: krsCover,
    url: "https://play.google.com/store/books/details?id=uaYdEgAAQBAJ",
    pages: 120,
    spine: "#2c5f9e",
    glow: "#f4a6b8",
    quotes: [
      { text: "Mungkin mereka juga pengin ketemu kamu yang belum punya kabar.", who: "Nadira", where: "Bab 7" },
      { text: "Ia hanya tidak lagi menganggap takut sebagai keputusan final.", who: "Narasi", where: "Epilog" },
    ],
  },
];
