// components/ProfileMenu.tsx
"use client";

import React, { JSX, useEffect, useRef, useState } from "react";
import Link from "next/link";

type Props = {
  name?: string;
  email?: string;
  photo?: string | null;
  fallback?: string;
  onSignOut?: () => void;
};

export default function ProfileMenu({
  name = "User",
  email,
  photo,
  fallback = "/mnt/data/daf80938-c1f9-4b85-9f2b-12a703727def.png",
  onSignOut,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleDocClick(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleDocClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleDocClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((s) => !s)}
        className="flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-offset-2 rounded"
      >
        <img
          src={photo ?? fallback}
          alt={`${name} profile`}
          className="w-[59px] h-[59px] rounded-full object-cover  border-gray-200"
          onError={(e) => {
            const t = e.currentTarget as HTMLImageElement;
            t.onerror = null;
            t.src = fallback;
          }}
        />
        <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Profile menu"
          className="absolute right-0 mt-3 w-64 bg-white rounded-lg shadow-xl ring-1 ring-black ring-opacity-5 z-50 overflow-hidden"
        >
          {/* optional header */}
          <div className="px-4 py-3 flex items-center gap-3 border-b">
            <img
              src={photo ?? fallback}
              alt={`${name} profile`}
              className="w-12 h-12 rounded-full object-cover border"
              onError={(e) => {
                const t = e.currentTarget as HTMLImageElement;
                t.onerror = null;
                t.src = fallback;
              }}
            />
            <div className="min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">{name}</div>
              {email && <div className="text-xs text-gray-500 truncate">{email}</div>}
            </div>
          </div>

          <ul className="py-2">
            <MenuItem href="/profile" label="Profile" icon={UserIcon} />
            <MenuItem href="/grades" label="Grades" icon={GradesIcon} />
            <MenuItem href="/calendar" label="Calendar" icon={CalendarIcon} />
            <MenuItem href="/files" label="Private files" icon={FilesIcon} />
            <MenuItem href="/reports" label="Reports" icon={ReportsIcon} />

            <li>
              <div className="my-2 border-t" />
            </li>

            <MenuItem href="/preferences" label="Preferences" icon={SettingsIcon} />
            <MenuItem href="/language" label="Language" icon={LanguageIcon} trailingChevron />

            <li>
              <div className="my-2 border-t" />
            </li>

            <li className="px-3 py-2">
              <button
                className="w-full flex items-center gap-3 text-sm text-gray-700 hover:bg-gray-50 rounded px-2 py-2"
                onClick={() => {
                  setOpen(false);
                  onSignOut?.();
                }}
              >
                <LogoutIcon /> <span>Log out</span>
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* ------------------------ Helper components & icons ----------------------- */
/* -------------------------------------------------------------------------- */

function MenuItem({
  href,
  label,
  icon: Icon,
  trailingChevron = false,
}: {
  href: string;
  label: string;
  icon: (props?: any) => JSX.Element;
  trailingChevron?: boolean;
}) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
        <span className="w-6 h-6 flex-shrink-0" aria-hidden>
          <Icon />
        </span>
        <span className="flex-1">{label}</span>
        {trailingChevron && (
          <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </Link>
    </li>
  );
}

/* ------------------------------- SVG icons ------------------------------- */
/* keep icons inline to avoid extra deps; replace with your own if desired */

const UserIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" aria-hidden>
    <path d="M12 12a4 4 0 100-8 4 4 0 000 8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4 20a8 8 0 0116 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const GradesIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" aria-hidden>
    <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
    <path d="M7 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M7 12h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" aria-hidden>
    <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
    <path d="M16 3v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M8 3v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M3 11h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const FilesIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" aria-hidden>
    <path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z" stroke="currentColor" strokeWidth="1.5" />
    <path d="M14 3v6h6" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const ReportsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" aria-hidden>
    <path d="M3 3h18v18H3z" stroke="currentColor" strokeWidth="1.5" />
    <path d="M7 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M7 16h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" aria-hidden>
    <path d="M12 15.5A3.5 3.5 0 1112 8.5a3.5 3.5 0 010 7z" stroke="currentColor" strokeWidth="1.5" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06A2 2 0 01.28 17.88l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82L4.3 4.28a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H12a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09c.3.14.57.34.8.58" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const LanguageIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" aria-hidden>
    <path d="M12 2v20" stroke="currentColor" strokeWidth="1.5" />
    <path d="M2 12h20" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const LogoutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden>
    <path d="M16 17l5-5-5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M21 12H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 19H6a2 2 0 01-2-2V7a2 2 0 012-2h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
