import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Providers } from "@/components/shared/Providers";
import { PWARegister } from "@/components/shared/PWARegister";
import { CookieBanner } from "@/components/shared/CookieBanner";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

const BASE_URL = "https://www.pipely.it";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Pipely — CRM italiano con AI e automazioni",
    template: "%s | Pipely",
  },
  description: "Pipely è il CRM pensato per team italiani. Pipeline Kanban, contatti, campagne email, automazioni workflow e AI Assistant. Gratis per sempre nel piano Starter.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/pipely-favicon.svg",
    apple: "/pipely-app-icon-blue.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Pipely",
  },
  openGraph: {
    type: "website",
    locale: "it_IT",
    url: BASE_URL,
    siteName: "Pipely",
    title: "Pipely — CRM italiano con AI e automazioni",
    description: "Pipely è il CRM pensato per team italiani. Pipeline Kanban, contatti, campagne email, automazioni workflow e AI Assistant. Gratis per sempre nel piano Starter.",
    images: [{ url: "https://www.pipely.it/og-image.png", width: 1200, height: 630, alt: "Pipely CRM" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pipely — CRM italiano con AI e automazioni",
    description: "Pipeline Kanban, contatti, campagne email, automazioni e AI Assistant. Gratis nel piano Starter.",
    images: ["https://www.pipely.it/og-image.png"],
  },
  alternates: {
    canonical: BASE_URL,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-snippet": -1, "max-image-preview": "large" },
  },
  // Add Google Search Console verification key here when available:
  // verification: { google: "YOUR_VERIFICATION_CODE" },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
        <PWARegister />
        <CookieBanner />
      </body>
    </html>
  );
}
