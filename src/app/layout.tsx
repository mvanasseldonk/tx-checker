import type { Metadata, Viewport } from "next";
import { LogoSwitch, PICK_LOGO } from "@/components/LogoSwitch";
import { FONT_VARIABLES } from "./fonts";
import "./globals.css";

// The logo switch is for trying the two logo looks on a preview. Production has the default only.
const showLogoSwitch = process.env.VERCEL_ENV !== "production";

export const metadata: Metadata = {
  title: "TxChecker",
  description: "Did my transaction go through? Paste an ETH, SOL or BTC transaction or address.",
};

export const viewport: Viewport = {
  themeColor: "#f2f3f5",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The script puts the chosen logo look on <html> before the first paint.
    <html lang="en" className={`${FONT_VARIABLES} h-full antialiased`} suppressHydrationWarning>
      {showLogoSwitch && (
        <head>
          <script dangerouslySetInnerHTML={{ __html: PICK_LOGO }} />
        </head>
      )}
      <body className="min-h-dvh font-sans">
        {children}
        {showLogoSwitch && <LogoSwitch />}
      </body>
    </html>
  );
}
