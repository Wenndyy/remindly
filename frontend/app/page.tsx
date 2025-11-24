"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const accessToken = localStorage.getItem("access_token") || localStorage.getItem("token");
    if (!accessToken) {
      router.replace("/login"); 
    }else{
      router.replace("/dashboard");
    }
  }, [router]);

}
