"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const accessToken = localStorage.getItem("access_token") || localStorage.getItem("token");
    if (!accessToken) {
      router.replace("/login");
    } else {
      router.replace("/dashboard");
    }
  }, [router]);

  return null;
}
