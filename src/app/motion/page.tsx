import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MotionLab } from "@/components/motion/MotionLab";

// TEMPORARY (S14, "Subtle, smooth animations"): a lab for the PO to look at every animation on a preview.
// Remove this folder, components/motion/ and the data-reduce-motion switch in globals.css once S14 is approved.
export const metadata: Metadata = { title: "Motion lab", robots: { index: false, follow: false } };

export default function MotionPage() {
  // Previews and local development only: production has no such page.
  if (process.env.VERCEL_ENV === "production") notFound();
  return <MotionLab />;
}
