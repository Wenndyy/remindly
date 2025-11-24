"use client";

import React, { useEffect, useState } from "react";
import MonthCalendarPreview from "../components/MonthCalendarPreview";
import WeeklyCalendar from "../components/WeeklyCalendar";
import { useRouter } from "next/navigation";


function TaskList() {
  const tasks = [
    { title: "Review", date: "01 November 2025", tag: "Project A" },
    { title: "Meetings", date: "07 November 2025", tag: "UI Teams" },
    { title: "Project Kickoff", date: "10 November 2025", tag: "Telkom" },
    { title: "Presentation", date: "10 December 2025", tag: "Telkom" },
    { title: "Performance Review", date: "25 December 2025", tag: "UI Teams" },
  ];

  return (
    <div className="bg-white rounded-xl shadow p-4">
      <h3 className="text-lg font-semibold mb-3">Tasks</h3>
      <ul className="space-y-2">
        {tasks.map((t) => (
          <li key={t.title} className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <div className="font-semibold">{t.title}</div>
              <div className="text-sm text-gray-500">{t.date}</div>
            </div>
            <div>
              <span className="inline-block text-xs px-3 py-1 rounded-full bg-amber-200 text-amber-800">
                {t.tag}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}


export default function DashboardContent({ user = null }: { user?: { photoURL?: string; name?: string } | null }) {
  const router = useRouter();
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  useEffect(() => {
  
    const accessToken = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

    if (!accessToken) {
      router.replace("/login");
      return;
    }

    setCheckedAuth(true);
  }, [router]);

 
  if (!checkedAuth) {
    return <div className="p-6">Memeriksa autentikasi...</div>;
  }

  
  const photo = user?.photoURL ?? null;
  const name = user?.name ?? "User";
  const events = [
    { date: "2025-11-29", startHour: 13, durationHours: 2, time: "13:00", title: "Review" },
    { date: "2025-12-01", startHour: 10, durationHours: 2, time: "10:00", title: "Meeting" }, 
    { date: "2025-12-03", startHour: 9, durationHours: 1, time: "09:00", title: "Project Kickoff" },
    { date: "2025-12-05", startHour: 15, durationHours: 1, time: "15:00", title: "Presentation" },
    { date: "2025-12-07", startHour: 11, durationHours: 1, time: "11:00", title: "Performance Review" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-4">
           <MonthCalendarPreview onSelect={(d) => setSelectedDate(d)} />
          <div className="mt-4">
            <TaskList />
          </div>
        </div>

        <div className="col-span-8 space-y-4">
    
          <div className="flex items-center justify-between bg-linear-to-r from-[#B6252A] to-[#501012] text-white px-6 py-4 rounded-xl shadow">
            <h2 className="text-2xl font-bold">DashBoard</h2>
            {photo ? (
              <img
              src={photo}
              alt={`${name} profile`}
              className="w-10 h-10 rounded-full object-cover border-2 border-white"
              />
              ) : (
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 15c2.485 0 4.807.637 6.879 1.804M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              </div>
            )}
          </div>

  
            <WeeklyCalendar 
            selectedDate={selectedDate} 
            onDateSelect={setSelectedDate}
            initialEvents={events}
            />

        </div> 
      </div> 
    </div>
  );
}
