import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { AuthProvider } from "@/contexts/AuthContext";
import { BottomNav } from "@/components/ui/BottomNav";
import { RouteMemory } from "@/components/ui/RouteMemory";

export const metadata: Metadata = {
  title: "Storyline - Read Together",
  description: "The world's first social reading platform. Transform reading from a solitary activity into a shared connection.",
  keywords: ["reading", "ebooks", "social reading", "book club", "collaborative reading"],
  authors: [{ name: "Storyline" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Storyline",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAF7F2" },
    { media: "(prefers-color-scheme: dark)", color: "#1A1D24" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body>
        <ErrorBoundary>
          <AuthProvider>
            <ToastProvider>
              <RouteMemory />
              <main className="main-content">
                {children}
              </main>
              <BottomNav />
            </ToastProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}

