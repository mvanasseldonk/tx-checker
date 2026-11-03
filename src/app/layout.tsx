import type { Metadata, Viewport } from "next";
import { FontSwitch, PICK_FONT } from "@/components/FontSwitch";
import { FONT_VARIABLES } from "./fonts";
import "./globals.css";

// The typeface switch is for trying pairings on a preview. Production has the default only.
const showFontSwitch = process.env.VERCEL_ENV !== "production";

export const metadata: Metadata = {
  title: "TxChecker",
  description: "Did my transaction go through? Paste an ETH, SOL or BTC transaction or address.",
};

export const viewport: Viewport = {
  themeColor: "#f2f3f5",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The script puts the chosen pairing on <html> before the first paint.
    <html lang="en" className={`${FONT_VARIABLES} h-full antialiased`} suppressHydrationWarning>
      {showFontSwitch && (
        <head>
          <script dangerouslySetInnerHTML={{ __html: PICK_FONT }} />
        </head>
      )}
      <body className="min-h-dvh font-sans">
        {children}
        {showFontSwitch && <FontSwitch />}
      </body>
    </html>
  );
}
