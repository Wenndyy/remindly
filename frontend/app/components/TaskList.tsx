"use client";

import React from "react";

export default function TaskList() {
  const tasks = [
    { title: "Review", date: "01 November 2025", tag: "Project A" },
    { title: "Meetings", date: "07 November 2025", tag: "UI Teams" },
    { title: "Project Kickoff", date: "10 November 2025", tag: "Telkom" },
    { title: "Presentation", date: "10 December 2025", tag: "Telkom" },
    { title: "Performance Review", date: "25 December 2025", tag: "UI Teams" },
  ];

  return (
    <div className="bg-white rounded-[15px] shadow pt-[34px] px-[25px] pb-[19px]">
      <h3 className="text-xl font-semibold mb-3 text-black">Tasks</h3>
      <ul className="space-y-2">
        {tasks.map((t) => (
          <li
            key={t.title}
            className="flex items-center justify-between p-4 border rounded-[10px] border-[#D7D7D7]"
          >
            <div>
              <div className="font-semibold text-black">{t.title}</div>
              <div className="text-sm text-black">{t.date}</div>
            </div>
            <div>
              <span className="inline-block text-xs px-3 py-1 rounded-[5px] bg-amber-200 text-amber-800">
                {t.tag}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
