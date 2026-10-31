import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "Azra&Alihan Bu Okulu Bitirecek | Akademik Çalışma & AI Fizik Platformu",
  description:
    "Azra için özel tasarlanmış multimodal ders videosu analizi, LaTeX tahta formül çıkarımı, hoca sınav uyarıları ve derse izole Gemini AI fizik eğitmeni.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="h-full bg-[#09090b] text-zinc-100 selection:bg-amber-500/30">
        {children}
      </body>
    </html>
  );
}
