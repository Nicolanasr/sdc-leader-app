import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Scouts des Cèdres — Saint Jean Marc Leader Portal",
  description: "Official management portal for Scouts des Cèdres Saint Jean Marc. Streamlining youth roster, camp events, attendance, treasury, and leadership operations.",
  keywords: ["Scouts des Cèdres", "Saint Jean Marc", "Scout Leader Portal", "كشاف القديس يوحنا مرقص", "لبنان"],
  authors: [{ name: "Scouts des Cèdres Saint Jean Marc" }],
  metadataBase: new URL("https://portal.sdcsaintjeanmarc.org"),
  openGraph: {
    title: "Scouts des Cèdres — Saint Jean Marc Leader Portal",
    description: "Official management portal for Scouts des Cèdres Saint Jean Marc leaders.",
    url: "https://portal.sdcsaintjeanmarc.org",
    siteName: "Scouts des Cèdres Saint Jean Marc",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Scouts des Cèdres — Saint Jean Marc Leader Portal",
    description: "Official management portal for Scouts des Cèdres Saint Jean Marc leaders.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
