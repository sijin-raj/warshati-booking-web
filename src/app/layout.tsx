import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { I18nProvider } from "@/i18n/provider";
import { getLocaleFromCookieHeader } from "@/i18n/server";
import { localeMeta, LOCALE_COOKIE } from "@/i18n/config";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";

const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-grotesk", display: "swap" });

export const metadata: Metadata = {
  title: "Lezof Booking",
  description: "Book your car service online.",
  icons: {
    apple: "/apple-touch-icon.png",
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#e53935",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const locale = getLocaleFromCookieHeader(
    cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join("; ") || null,
  );

  return (
    <html lang={locale} dir={localeMeta[locale].dir} className={`${grotesk.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var k=${JSON.stringify(LOCALE_COOKIE)};var m=document.cookie.match(new RegExp('(?:^|; )'+k+'=([^;]*)'));var l=m?decodeURIComponent(m[1]):null;if(l!=='en'&&l!=='ar'){l=localStorage.getItem('lezof-locale');}if(l==='ar'||l==='en'){document.documentElement.lang=l;document.documentElement.dir=l==='ar'?'rtl':'ltr';}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <I18nProvider initialLocale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
