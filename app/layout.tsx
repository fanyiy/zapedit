import type { Metadata, Viewport } from "next";
import "./globals.css";
import PlausibleProvider from "next-plausible";
import { Toaster } from "@/components/ui/sonner";
import Providers from "./components/providers";

const title = "ZapEdit – Edit images with one prompt";
const description = "The easiest way to edit images in one prompt";
const url = "https://zapedit.vercel.app/";
const ogimage = "https://zapedit.vercel.app/og-image.png";
const sitename = "zapedit.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(url),
  title,
  description,
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    images: [ogimage],
    title,
    description,
    url: url,
    siteName: sitename,
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    images: [ogimage],
    title,
    description,
  },
};

export const viewport: Viewport = {
  width: 1200,
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <PlausibleProvider domain="zapedit.vercel.app" />
      </head>
      <body className="flex min-h-screen w-full flex-col antialiased">
        <Providers>
          {/* Mobile blocking overlay - shows on screens smaller than 1200px */}
          <div className="fixed inset-0 z-50 bg-black flex items-center justify-center p-6 xl:hidden">
            <div className="text-center space-y-4">
              <svg className="w-8 h-8 text-white mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <h1 className="text-xl text-white font-medium">
                Please use a laptop
              </h1>
              <p className="text-gray-400 text-sm">
                Mobile version in progress
              </p>
            </div>
          </div>

          {/* Main app content - hidden on mobile */}
          <div className="hidden xl:flex xl:flex-col xl:flex-1">
            <main className="flex flex-1 flex-col">
              {children}
            </main>
            <Toaster />
          </div>
        </Providers>
      </body>
    </html>
  );
}
