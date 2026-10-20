"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Client-side redirect so the site root answers 200 for the hosting platform's health check.
export default function Home() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);
  return null;
}
