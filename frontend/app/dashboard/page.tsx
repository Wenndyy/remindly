"use client";

import React, { useEffect, useState } from "react";
import MonthCalendarPreview from "../components/MonthCalendarPreview";
import WeeklyCalendar from "../components/WeeklyCalendar";
import { useRouter } from "next/navigation";
import TaskList from "../components/TaskList";
import axiosClient from "../api/axiosClient";
import ProfileMenu from "../components/ProfileMenu";

type UserShape = { photoURL?: string | null; name?: string | null } | null;

export default function DashboardContent({
  initialUser = null,
}: {
  initialUser?: { photoURL?: string; name?: string } | null;
}) {
  const router = useRouter();

  const [checkedAuth, setCheckedAuth] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [user, setUser] = useState<UserShape>(initialUser);


  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      if (typeof window === "undefined") return;

      const token = localStorage.getItem("access_token");
      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        const res = await axiosClient.get("/me");
        if (!mounted) return;
        setUser({
          name: res.data.full_name ?? res.data.email ?? "User",
          photoURL: res.data.profile_picture ?? null,
        });
        setCheckedAuth(true);
      } catch (err) {
        console.error("Failed to fetch /me:", err);
        localStorage.removeItem("access_token");
        router.replace("/login");
      }
    }

    bootstrap();

    return () => {
      mounted = false;
    };
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
          <div className="flex items-center justify-between bg-linear-to-r bg-white text-white px-6 py-4 rounded-[15px] shadow">
            <h2 className="text-2xl font-bold text-black">Halo, {name}!</h2>

            <div className="flex items-center gap-4">
                <img src="/notif-off.svg" alt="notification" />
                <div className="flex items-center gap-3">
                  <ProfileMenu
                    name={name}
                    photo={photo}
                    fallback="/person.svg"
                    onSignOut={() => {
                      localStorage.removeItem("access_token");
                      router.replace("/login");
                    }}
                  />
                </div>
              </div>
          </div>

          <WeeklyCalendar selectedDate={selectedDate} onDateSelect={setSelectedDate} initialEvents={events} />
        </div>
      </div>
    </div>
  );
}
