import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#07070f",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://ai-net.vercel.app"),
  keywords: ["AI agents", "Celo", "ERC-7710", "MiniPay", "blockchain", "autonomous", "web3", "pay per use", "AI research"],
  authors: [{ name: "AI-Net" }],
  openGraph: {
    title: "AI-Net — Ask AI, Pay Per Question",
    description: "Get full AI research reports for $0.001. No subscription. Pay only when you use it — powered by Celo.",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "AI-Net — Ask AI, Pay Per Question" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI-Net — Ask AI, Pay Per Question",
    description: "AI research on demand. Pay $0.001 per question. No subscription needed.",
    images: ["/og-image.png"],
  },
  title: "AI-Net — Ask AI, Pay Per Question",
  description: "Get full AI research, risk analysis, and reports for a fraction of a cent. No subscription — pay only when you use it, powered by Celo.",
  icons: { icon: "/logo.png", apple: "/logo.png" },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AI-Net",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="bg-mesh" />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
