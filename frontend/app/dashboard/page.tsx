"use client";

import React, { useEffect, useState } from "react";
import MonthCalendarPreview from "../components/MonthCalendarPreview";
import WeeklyCalendar, { EventItem } from "../components/WeeklyCalendar";
import { useRouter } from "next/navigation";
import TaskList from "../components/TaskList";
import axiosClient from "../api/axiosClient";
import ProfileMenu from "../components/ProfileMenu";

type UserShape = { photoURL?: string | null; name?: string | null } | null;

export default function DashboardContent({ initialUser = null }: { initialUser?: { photoURL?: string; name?: string } | null }) {
  const router = useRouter();

  const [checkedAuth, setCheckedAuth] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [user, setUser] = useState<UserShape>(initialUser);
  const [events, setEvents] = useState<EventItem[]>([]); 

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
        const res = await axiosClient.get("/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!mounted) return;
        setUser({
          name: res.data.full_name ?? res.data.email ?? "User",
          photoURL: res.data.profile_picture ?? null,
        });


        const eventRes = await axiosClient.get("/events", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!mounted) return;

      const mappedEvents: EventItem[] = eventRes.data.map((e: any) => {
        const start = new Date(`${e.start_date}T${e.start_time ?? "00:00"}`);
        const end = new Date(`${e.end_date}T${e.end_time ?? "23:59"}`);
        return {
          id: e.id,
          title: e.title,
          date: e.start_date,
          startHour: start.getHours(),
          startMinute: start.getMinutes(),
          endHour: end.getHours(),
          endMinute: end.getMinutes(),
          description: e.description,
          location: e.location,
          project: e.project,
          guest: e.guest,
        };
      });


        setEvents(mappedEvents);

        setCheckedAuth(true);
      } catch (err) {
        console.error("Failed to fetch /me or /events:", err);
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
