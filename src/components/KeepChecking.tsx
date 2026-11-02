"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const REFRESH_SECONDS = 12;

/** Looks the transaction up again every block, for as long as its status can still change. */
export function KeepChecking() {
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(() => router.refresh(), REFRESH_SECONDS * 1000);
    return () => clearInterval(timer);
  }, [router]);

  return null;
}
