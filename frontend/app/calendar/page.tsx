"use client";

import React, { useEffect, useState } from "react";
import WeeklyCalendar from "../components/WeeklyCalendar";
import { useRouter } from "next/navigation";
import axiosClient from "../api/axiosClient";
import ProfileMenu from "../components/ProfileMenu";
import CustomCalendar from "../components/CustomCalendar";

type UserShape = { photoURL?: string | null; name?: string | null } | null;

export default function CalendarPage({
  initialUser = null,
}: {
  initialUser?: { photoURL?: string; name?: string } | null;
}) {
  const router = useRouter();
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [user, setUser] = useState<UserShape>(initialUser);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch events dari API
  useEffect(() => {
    let mounted = true;

    async function fetchEvents() {
      try {
        setLoading(true);
        const response = await axiosClient.get("/events");
        if (!mounted) return;

        console.log("Fetched events from API:", response.data);

        // Format events untuk calendar
        const formattedEvents = response.data.map((event: any) => {
          // Parse waktu untuk mendapatkan startHour dan duration
          let startHour = 9; // default
          let durationHours = 1; // default 1 jam
          let time = "09:00"; // default
          
          if (event.start_time && event.end_time) {
            const startTime = event.start_time.split(':');
            const endTime = event.end_time.split(':');
            
            startHour = parseInt(startTime[0]);
            const startMinute = parseInt(startTime[1]);
            const endHour = parseInt(endTime[0]);
            const endMinute = parseInt(endTime[1]);
            
            // Calculate duration in hours
            const startTotalMinutes = startHour * 60 + startMinute;
            const endTotalMinutes = endHour * 60 + endMinute;
            durationHours = (endTotalMinutes - startTotalMinutes) / 60;
            
            // Minimum duration 0.5 jam, maximum 24 jam
            durationHours = Math.max(0.5, Math.min(24, durationHours));
            time = event.start_time;
          } else if (event.all_day) {
            startHour = 0;
            durationHours = 24; // All day event
            time = "00:00";
          }

          return {
            id: event.id,
            date: event.start_date,
            startHour: startHour,
            durationHours: durationHours,
            time: time,
            title: event.title,
            description: event.description,
            location: event.location,
            participants: event.participants || 0,
            project_name: event.project_name,
            project_color: event.project_color,
            all_day: event.all_day,
            start_time: event.start_time,
            end_time: event.end_time,
            guest: event.guest
          };
        });

        setEvents(formattedEvents);
      } catch (err) {
        console.error("Failed to fetch events:", err);
        setEvents([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    if (checkedAuth) {
      fetchEvents();
    }
  }, [checkedAuth]);

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

  // Event statis untuk fallback (jika API tidak mengembalikan data)
  const fallbackEvents = [
    { date: "2025-11-29", startHour: 13, durationHours: 2, time: "13:00", title: "Review" },
    { date: "2025-12-01", startHour: 10, durationHours: 2, time: "10:00", title: "Meeting" },
    { date: "2025-12-03", startHour: 9, durationHours: 1, time: "09:00", title: "Project Kickoff" },
    { date: "2025-12-05", startHour: 15, durationHours: 1, time: "15:00", title: "Presentation" },
    { date: "2025-12-07", startHour: 11, durationHours: 1, time: "11:00", title: "Performance Review" },
  ];

  // Gunakan events dari API jika ada, otherwise use fallback
  const displayEvents = events.length > 0 ? events : fallbackEvents;

  return (
    <div className="w-full h-full p-0 m-0">
      <div className="flex items-center justify-between bg-white px-6 py-4 rounded-[15px] shadow mb-[15px]">
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

      <div className="w-full">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-gray-600">Loading events...</div>
          </div>
        ) : (
          <CustomCalendar
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            initialEvents={displayEvents}
          />
        )}
      </div>
    </div>
  );
}