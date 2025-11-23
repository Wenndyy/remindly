"use client";

import React, { useState } from "react";
import MenuItem from "./MenuItem";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import axiosClient from "../api/axiosClient"; 

export default function SlideSidebar({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  const pathname = usePathname() || "/";
  const router = useRouter();

  const menu = [
    { key: "dashboard", label: "Dashboard", src: "/dashboard.svg", href: "/dashboard" },
    { key: "calendar",  label: "Calendar",  src: "/calender.svg",  href: "/calendar"  }, 
    { key: "task",      label: "Task",      src: "/task.svg",      href: "/task"      },
    { key: "project",   label: "Project",   src: "/project.svg",   href: "/project"   },
    { key: "notification", label: "Notification", src: "/notif.svg", href: "/notification" },
  ];

  if (pathname === "/login" || pathname.startsWith("/login/") ||
      pathname === "/register" || pathname.startsWith("/register/") ||
      pathname === "/auth" || pathname.startsWith("/auth/")) {
    return <div className="min-h-screen">{children}</div>;
  }

  const handleLogout = async () => {
    const ok = window.confirm("Are you sure you want to logout?");
    if (!ok) return;

    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) {
      alert("No refresh token found.");
      return;
    }

    try {
      const response = await axiosClient.post(
        "/logout",
        refreshToken
      );

      if (response.status === 200) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("token");
        sessionStorage.clear();
        window.location.replace("/login");
      } else {
        console.error("Logout failed:", response.data);
        alert("Logout failed. Check console.");
      }
    } catch (error: any) {
      console.error("Logout request failed:", error);
      alert("Logout request failed. Check console.");
    }
  };



  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside className={`flex flex-col transition-all duration-300 ${open ? "w-72" : "w-20"} bg-linear-to-b from-[#B6252A] to-[#501012] text-white rounded-r-3xl overflow-hidden shadow-lg z-20`}>
        <div className="flex items-center justify-between px-6 py-6">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className={`font-bold text-2xl select-none transition-opacity ${open ? "opacity-100" : "opacity-0"}`}>Remindly</div>
              {!open && <div className="w-8 h-8 rounded-md bg-white/10 flex items-center justify-center">R</div>}
            </Link>
          </div>
        </div>

        <div className="px-4"><div className="h-px bg-white/10 mb-4" /></div>

        <div className={`px-6 mb-4`}>Menu</div>
        <nav className="flex-1 px-2 pb-6 overflow-auto">
          <ul className="space-y-2">
            {menu.map(m => (
              <MenuItem key={m.key} href={m.href} src={m.src} label={m.label} open={open} active={pathname === m.href} />
            ))}
          </ul>
        </nav>

        <div className="px-4 pb-6">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition"
            aria-label="Logout"
          >
            <div className="w-8 h-8 rounded-md bg-white/10 flex items-center justify-center">
              ⎋
            </div>
            <span className={`font-medium select-none transition-opacity ${open ? "opacity-100" : "opacity-0"}`}>Logout</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-full">{children}</div>
      </main>
    </div>
  );
}