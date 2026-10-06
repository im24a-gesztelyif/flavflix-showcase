import { Cormorant_Garamond, Manrope } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { AppStateProvider } from "@/lib/app-state";
import { AppShell } from "@/components/app-shell";
import { staticAssetUrl } from "@/lib/static-assets";

const bodyFont = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const displayFont = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
  display: "swap",
});

export const metadata = {
  title: "FlavFlix Showcase",
  description:
    "A five-minute interactive demonstration of the FlavFlix movie and TV discovery project.",
  icons: {
    icon: staticAssetUrl("/flavflix_favicon.png"),
    shortcut: staticAssetUrl("/flavflix_favicon.png"),
    apple: staticAssetUrl("/flavflix_favicon.png"),
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${bodyFont.variable} ${displayFont.variable}`}>
        <AppStateProvider>
          <AppShell>{children}</AppShell>
        </AppStateProvider>
        <Analytics />
      </body>
    </html>
  );
}
