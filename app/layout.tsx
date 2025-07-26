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
  width: "device-width",
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
          <main className="flex flex-1 flex-col">
            {children}
          </main>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
