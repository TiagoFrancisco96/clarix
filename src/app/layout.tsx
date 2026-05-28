import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { TelemetryProvider } from "@/components/TelemetryProvider";
import { ToastProvider } from "@/components/Toast";
import "@/components/toast.css";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "Clarix AI Workspace",
  description: "All-in-one AI workspace — Ask anything, create anything. AI Chat, Slides, Sheets, Docs, Developer, Designer, Image, Music, Video & more.",
  keywords: ["AI", "workspace", "chat", "slides", "sheets", "docs", "image generation", "video", "music"],
  openGraph: {
    title: "Clarix AI Workspace",
    description: "Your all-in-one AI workspace for creating, building, and researching.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning className={cn("font-sans", geist.variable)}>
      <body suppressHydrationWarning>
        <ConvexClientProvider>
          <TelemetryProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </TelemetryProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}

