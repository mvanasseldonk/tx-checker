import type { Metadata, Viewport } from "next";
import { PICK_MARK, NAME, TAGLINE } from "@/components/brand/config";
import { MarkSwitch } from "@/components/brand/MarkSwitch";
import { FONT_VARIABLES } from "./fonts";
import "./globals.css";

// The logo switch is for trying the logo directions on a preview. Production has the default only.
const showMarkSwitch = process.env.VERCEL_ENV !== "production";

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
    // The script puts the chosen logo direction on <html> before the first paint.
    <html lang="en" className={`${FONT_VARIABLES} h-full antialiased`} suppressHydrationWarning>
      {showMarkSwitch && (
        <head>
          <script dangerouslySetInnerHTML={{ __html: PICK_MARK }} />
        </head>
      )}
      <body className="min-h-dvh font-sans">
        {children}
        {showMarkSwitch && <MarkSwitch />}
      </body>
    </html>
  );
}
