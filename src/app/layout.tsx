import type { Metadata, Viewport } from "next";
import { NAME, TAGLINE } from "@/components/brand/config";
import { FONT_VARIABLES } from "./fonts";
import "./globals.css";

const DESCRIPTION = `${NAME} tells you if your transaction went through. Paste an ETH, SOL or BTC transaction or address and follow it until it is final.`;

export const metadata: Metadata = {
  title: { default: `${NAME} · ${TAGLINE}`, template: `%s · ${NAME}` },
  description: DESCRIPTION,
  applicationName: NAME,
  openGraph: { siteName: NAME, title: `${NAME} · ${TAGLINE}`, description: DESCRIPTION, type: "website" },
  twitter: { card: "summary_large_image", title: `${NAME} · ${TAGLINE}`, description: DESCRIPTION },
};

export const viewport: Viewport = {
  themeColor: "#f2f3f5",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${FONT_VARIABLES} h-full antialiased`}>
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
