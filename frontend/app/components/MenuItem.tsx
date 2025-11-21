"use client";

import Link from "next/link";
import React from "react";

type Props = {
  href: string;
  src: string;
  label: string;
  open?: boolean;
  active?: boolean;
};

export default function MenuItem({ href, src, label, open = true, active = false }: Props) {
  return (
    <li>
    
      <Link
        href={href}
        className={`group flex items-center gap-4 py-3 px-4 rounded-lg transition-colors ${
          active ? "bg-white/10" : "hover:bg-white/6"
        }`}
      >
        <span className="flex-none">
          <img src={src} alt={`${label} icon`} className="w-6 h-6 object-contain" />
        </span>

        <span className={`flex-1 text-sm font-medium transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0"}`}>
          {label}
        </span>
      </Link>
    </li>
  );
}
