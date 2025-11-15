import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "@/lib/wallet/WalletProvider";
import { Navigation, Footer } from "@/components/layout";
import { ToastProvider, SkipToContent } from "@/components/ui";

export const metadata: Metadata = {
  title: "FutureProof - Guaranteed by math, not corporations",
  description: "Decentralized time-capsule application for time-locked messages",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-50 flex flex-col min-h-screen">
        <SkipToContent />
        <ToastProvider>
          <WalletProvider>
            <Navigation />
            <main id="main-content" className="flex-1">
              {children}
            </main>
            <Footer />
          </WalletProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
