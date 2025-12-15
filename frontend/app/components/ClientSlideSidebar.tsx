"use client";

import dynamic from "next/dynamic";
import React from "react";

// Dynamically import SlideSidebar with SSR disabled to prevent hydration mismatch
// SlideSidebar uses localStorage, usePathname, and other client-only APIs
const SlideSidebar = dynamic(() => import("./SlideSidebar"), {
    ssr: false,
    loading: () => (
        <div className="flex min-h-screen bg-gray-100">
            <aside className="w-72 bg-gradient-to-b from-[#B6252A] to-[#501012] rounded-r-3xl" />
            <main className="flex-1 p-8" />
        </div>
    ),
});

export default function ClientSlideSidebar({ children }: { children: React.ReactNode }) {
    return <SlideSidebar>{children}</SlideSidebar>;
}
