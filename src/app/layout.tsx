import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import NavigationProgressBar from "@/components/NavigationProgressBar";
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
    title: "Scouts des Cèdres - Leader Portal",
    description: "Official management portal for Scouts des Cèdres Saint Jean Marc. Streamlining youth roster, camp events, attendance, treasury, and leadership operations.",
    keywords: ["Scouts des Cèdres", "Saint Jean Marc", "Scout Leader Portal", "كشاف القديس يوحنا مرقص", "لبنان"],
    authors: [{ name: "Scouts des Cèdres Saint Jean Marc" }],
    metadataBase: new URL("https://portal.sdcsaintjeanmarc.org"),
    manifest: "/site.webmanifest",
    icons: {
        icon: [
            { url: "/favicon.ico" },
            { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
            { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
        ],
        apple: [
            { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
        ],
    },
    openGraph: {
        title: "Scouts des Cèdres - Leader Portal",
        description: "Official management portal for Scouts des Cèdres Saint Jean Marc leaders.",
        url: "https://portal.sdcsaintjeanmarc.org",
        siteName: "Scouts des Cèdres Saint Jean Marc",
        locale: "en_US",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "Scouts des Cèdres - Leader Portal",
        description: "Official management portal for Scouts des Cèdres Saint Jean Marc leaders.",
    },
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    interactiveWidget: "resizes-content",
    viewportFit: "cover",
    themeColor: "#134e4a",
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
            <body className="min-h-full flex flex-col">
                <Suspense fallback={null}>
                    <NavigationProgressBar />
                </Suspense>
                {children}
            </body>
        </html>
    );
}
