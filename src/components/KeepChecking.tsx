"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Looks the transaction up again every block, for as long as its status can still change. */
export function KeepChecking({ seconds }: { seconds: number }) {
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(timer);
  }, [router, seconds]);

  return null;
}
