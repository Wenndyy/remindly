"use client";

import React, { useState, useEffect } from "react";
import MenuItem from "./MenuItem";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import axiosClient from "../api/axiosClient";

import { useUser } from "../../contexts/UserContext";

// Helper for image URL
const getImageUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  return `http://127.0.0.1:8000${url}`;
};

export default function SlideSidebar({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const pathname = usePathname() || "/";
  const router = useRouter();
  const { user, clearUser } = useUser(); // Get user from context

  // Ensure component only renders interactive elements after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const menu = [
    { key: "dashboard", label: "Dashboard", src: "/dashboard.svg", href: "/dashboard" },
    { key: "calendar", label: "Calendar", src: "/calender.svg", href: "/calendar" },
    { key: "schedule", label: "Schedule", src: "/task.svg", href: "/schedule" },
    { key: "project", label: "Project", src: "/project.svg", href: "/project" },
  ];

  // Don't render anything until mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="flex min-h-screen bg-gray-100">
        <aside className="w-72 bg-gradient-to-b from-[#B6252A] to-[#501012] rounded-r-3xl" />
        <main className="flex-1 p-8">{children}</main>
      </div>
    );
  }

  if (pathname === "/login" || pathname.startsWith("/login/") ||
    pathname === "/register" || pathname.startsWith("/register/") ||
    pathname === "/auth" || pathname.startsWith("/auth/")) {
    return <div className="min-h-screen">{children}</div>;
  }

  // Open logout modal instead of window.confirm
  const openLogoutModal = () => {
    setLogoutModalOpen(true);
  };

  const closeLogoutModal = () => {
    setLogoutModalOpen(false);
  };

  const handleLogout = async () => {
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
        // Clear user context first
        clearUser();
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

  // Profile Icon Click Handler
  const handleProfileClick = () => {
    router.push("/profile");
  };

  const displayName = user?.full_name || `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || "User";

  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside className={`flex flex-col transition-all duration-300 ${open ? "w-72" : "w-20"} bg-linear-to-b from-[#B6252A] to-[#501012] text-white rounded-r-3xl overflow-hidden shadow-lg z-20`}>
        <div className="flex items-center justify-center px-6 py-6">
          <div className="flex items-center gap-3 justify-center ">
            <img src="/logo.svg" alt="Logo" className="w-[35px] h-[35px]" />
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className={`font-bold text-3xl select-none transition-opacity ${open ? "opacity-100" : "opacity-0"}`}>Remindly</div>
              {!open && <div className="w-8 h-8 rounded-md bg-white/10 flex items-center justify-center">R</div>}
            </Link>
          </div>
        </div>

        <div className="px-4"><div className="h-px bg-white/20 mb-4" /></div>

        <div className={`px-6 mb-2 text-xs font-medium uppercase tracking-wider text-white/60`}>Menu</div>
        <nav className="px-2 pb-4">
          <ul className="space-y-1">
            {menu.map(m => (
              <MenuItem key={m.key} href={m.href} src={m.src} label={m.label} open={open} active={pathname === m.href} />
            ))}
          </ul>
        </nav>

        {/* Divider */}
        <div className="px-4"><div className="h-px bg-white/20 mb-4" /></div>

        {/* GENERAL Section */}
        <div className={`px-6 mb-2 text-xs font-medium uppercase tracking-wider text-white/60 ${open ? "opacity-100" : "opacity-0"}`}>General</div>
        <div className="px-2 pb-6">
          {/* Profile */}
          <Link
            href="/profile"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition ${pathname === "/profile" ? "bg-white/20" : "hover:bg-white/10"}`}
          >
            <div className="w-6 h-6 rounded-md flex items-center justify-center">
              <img src="/person.svg" alt="Profile" className="w-5 h-5 brightness-0 invert" loading="lazy" />
            </div>
            <span className={`font-medium select-none transition-opacity ${open ? "opacity-100" : "opacity-0"}`}>Profile</span>
          </Link>

          {/* Log out - opens modal */}
          <button
            onClick={openLogoutModal}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition"
            aria-label="Logout"
          >
            <div className="w-6 h-6 rounded-md flex items-center justify-center">
              <img src="/logout.svg" alt="Logout" className="w-5 h-5" loading="lazy" />
            </div>
            <span className={`font-medium select-none transition-opacity ${open ? "opacity-100" : "opacity-0"}`}>Log out</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-auto flex flex-col">
        {/* Top Header with Profile Icon */}


        <div className="max-w-full flex-1">{children}</div>
      </main>

      {/* Logout Confirmation Modal */}
      {logoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Dark overlay */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={closeLogoutModal}
          />

          {/* Modal content */}
          <div className="relative bg-white rounded-2xl shadow-xl p-8 w-[360px] max-w-[90vw] text-center">
            {/* Warning Icon */}
            <div className="flex justify-center mb-6">
              <svg
                className="w-16 h-16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#1a1a1a"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            {/* Title */}
            <h2 className="text-xl font-bold text-gray-900 mb-3">
              Are you Logging out?
            </h2>

            {/* Description */}
            <p className="text-gray-500 text-sm mb-8">
              Are you sure you want to Log Out?<br />
              You will have to Sign In again
            </p>

            {/* Buttons */}
            <div className="flex gap-4">
              <button
                onClick={closeLogoutModal}
                className="flex-1 px-6 py-3 text-gray-900 font-semibold bg-gray-100 rounded-xl hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  closeLogoutModal();
                  handleLogout();
                }}
                className="flex-1 px-6 py-3 text-white font-semibold rounded-xl transition"
                style={{ backgroundColor: "#B6252A" }}
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}