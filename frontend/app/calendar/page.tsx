"use client";

import React, { useEffect, useState } from "react";
import WeeklyCalendar from "../components/WeeklyCalendar";
import { useRouter } from "next/navigation";

export default function CalendarPage({ user = null }: { user?: { photoURL?: string; name?: string } | null }) {
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
    <div className="w-full h-full p-0 m-0">
      <div className="flex items-center justify-between bg-linear-to-r from-[#B6252A] to-[#501012] text-white px-6 py-4 rounded-xl shadow  w-full mb-[15px]">
        <h2 className="text-2xl font-bold">Calendar</h2>

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

      <div className="w-full">
        <WeeklyCalendar
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          initialEvents={events}
        />
      </div>
    </div>
  );
}
