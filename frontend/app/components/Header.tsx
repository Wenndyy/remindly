"use client";

import React from "react";
import Link from "next/link";
import { useUser } from "../../contexts/UserContext";
import NotificationDropdown from "./NotificationDropdown";

// Helper for image URL (we can export this later from a utils file)
const getImageUrl = (url: string | null | undefined): string => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
        return url;
    }
    return `http://127.0.0.1:8000${url}`;
};

type HeaderProps = {
    title: string;
};

export default function Header({ title }: HeaderProps) {
    const { user } = useUser();
    const displayName = user?.full_name || `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || "User";

    // Decide which photo to show
    // UserContext usually has the latest. 
    // If user object is null (loading), we might show nothing or a skeleton.

    return (
        <div className="flex items-center justify-between bg-white px-6 py-4 rounded-[15px] shadow mb-[15px]">
            <h2 className="text-2xl font-bold text-black">{title}</h2>

            <div className="flex items-center gap-4">
                {/* Notification Icon (using the existing component or image for now) */}
                {/* Using NotificationDropdown if it exists in components, as seen in dashboard */}
                {/* <NotificationDropdown /> or just the image if the user wants strictly visual match first */}
                {/* Dashboard uses NotificationDropdown. Calendar uses <img>. I'll use simple img for now to match Calendar request, or Dropdown if available. */}
                {/* Dashboard import: import NotificationDropdown from "../components/NotificationDropdown"; */}
                {/* I'll use a placeholder img if Dropdown is too complex, but Dashboard has it. Let's try to use the image for consistency with Calendar request "icon notifikasi (lonceng)". */}
                <img
                    src="/notif-off.svg"
                    alt="notification"
                    className="w-6 h-6 cursor-pointer hover:opacity-80 transition"
                />

                <Link href="/profile" className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition">
                    {user?.profile_picture ? (
                        <img
                            src={getImageUrl(user.profile_picture)}
                            alt="Profile"
                            className="w-[50px] h-[50px] rounded-full object-cover border border-gray-200"
                        />
                    ) : (
                        <div className="w-[50px] h-[50px] rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-lg border border-gray-300">
                            {displayName.charAt(0).toUpperCase()}
                        </div>
                    )}
                </Link>
            </div>
        </div>
    );
}
