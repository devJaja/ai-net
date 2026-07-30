"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { useMiniPay } from "@/hooks/use-minipay";
import { MiniPayBanner } from "@/components/layout/minipay-banner";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Track whether MiniPay detection has completed (avoids flash of desktop shell)
  const [detected, setDetected] = useState(false);
  const { isMiniPay, address: miniPayAddress } = useMiniPay();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // Detection runs after first paint — mark complete so we can render
    setDetected(true);
  }, []);

  // Redirect MiniPay users to the consumer-optimised route
  useEffect(() => {
    if (detected && isMiniPay && pathname !== "/mini") {
      router.replace("/mini");
    }
  }, [detected, isMiniPay, pathname, router]);

  // /mini renders its own full-page layout — no shell wrapper needed
  if (pathname === "/mini") {
    return <>{children}</>;
  }

  // Suppress desktop shell for one tick while MiniPay detection runs,
  // preventing a flash of sidebar/header before redirect fires.
  if (!detected) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#07070f" }}>
        <div className="w-5 h-5 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {!isMiniPay && <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          isMiniPay={isMiniPay}
          miniPayAddress={miniPayAddress}
        />
        <main className="flex-1 main-pad overflow-auto pb-28 md:pb-24">{children}</main>
      </div>
      <MiniPayBanner />
    </div>
  );
}
