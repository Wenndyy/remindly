"use client";

import React, { useEffect, useState } from "react";
import MonthCalendarPreview from "../components/MonthCalendarPreview";
import WeeklyCalendar, { EventItem } from "../components/WeeklyCalendar";
import Header from "../components/Header";
import { useRouter } from "next/navigation";
import TaskList from "../components/TaskList";
import NotificationDropdown from "../components/NotificationDropdown";
import axiosClient from "../api/axiosClient";


type UserShape = { photoURL?: string | null; name?: string | null } | null;

export default function DashboardContent({ initialUser = null }: { initialUser?: { photoURL?: string; name?: string } | null }) {
  const router = useRouter();

  const [checkedAuth, setCheckedAuth] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [user, setUser] = useState<UserShape>(initialUser);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchEvents = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    try {
      const eventRes = await axiosClient.get("/events", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const mappedEvents: EventItem[] = eventRes.data.flatMap((e: any) => {
        const startDate = new Date(e.start_date);
        const endDate = new Date(e.end_date);

        // Generate events untuk setiap hari dalam range
        const eventsInRange = [];

        for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
          const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

          let startHour, startMinute, endHour, endMinute;

          // Untuk hari pertama, gunakan waktu asli
          if (date.toDateString() === startDate.toDateString()) {
            const start = new Date(`${e.start_date}T${e.start_time ?? "00:00"}`);
            const end = new Date(`${e.end_date}T${e.end_time ?? "23:59"}`);

            startHour = start.getHours();
            startMinute = start.getMinutes();
            endHour = end.getHours();
            endMinute = end.getMinutes();
          } else {
            // Untuk hari berikutnya, tampilkan sebagai all-day
            startHour = 0;
            startMinute = 0;
            endHour = 23;
            endMinute = 59;
          }

          eventsInRange.push({
            id: `${e.id}-${dateKey}`,
            originalId: e.id,
            title: e.title,
            date: dateKey,
            startDate: e.start_date,
            endDate: e.end_date,
            startHour: startHour,
            startMinute: startMinute,
            endHour: endHour,
            endMinute: endMinute,
            start_time: e.start_time,
            end_time: e.end_time,
            description: e.description,
            location: e.location,
            project: e.project_name,
            project_color: e.project_color,
            guest: e.guest,
            isMultiDay: e.start_date !== e.end_date,
            isFirstDay: date.toDateString() === startDate.toDateString(),
            isLastDay: date.toDateString() === endDate.toDateString()
          });
        }

        return eventsInRange;
      });

      // Filter untuk 7 hari ke depan (reset waktu ke 00:00:00 untuk perbandingan yang benar)
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset ke awal hari

      const sevenDaysLater = new Date();
      sevenDaysLater.setDate(today.getDate() + 7);
      sevenDaysLater.setHours(23, 59, 59, 999); // Set ke akhir hari

      const upcomingEvents = mappedEvents
        .filter(ev => {
          const eventDate = new Date(ev.date);
          eventDate.setHours(0, 0, 0, 0); // Reset waktu event juga
          return eventDate >= today && eventDate <= sevenDaysLater;
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setEvents(upcomingEvents);
    } catch (err) {
      console.error("Failed to fetch events:", err);
    }
  };

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

        await fetchEvents();

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

  // Listen for global event updates (from floating chat)
  useEffect(() => {
    const handleEventsUpdated = () => {
      setRefreshTrigger(prev => prev + 1);
    };
    window.addEventListener('events-updated', handleEventsUpdated);
    return () => window.removeEventListener('events-updated', handleEventsUpdated);
  }, []);


  useEffect(() => {
    if (checkedAuth) {
      fetchEvents();
    }
  }, [refreshTrigger, checkedAuth]);


  const handleEventsChange = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  if (!checkedAuth) {
    return <div className="p-6">Memeriksa autentikasi...</div>;
  }

  const photo = user?.photoURL ?? null;
  const name = user?.name ?? "User";
  const fallback = "/person.svg";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-4">
          <MonthCalendarPreview onSelect={(d) => setSelectedDate(d)} />
          <div className="mt-4">
            <TaskList tasks={events} />
          </div>
        </div>

        <div className="col-span-8 space-y-4">
          <Header title={`Halo, ${name}!`} />

          <WeeklyCalendar
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            initialEvents={events}
            onEventsChange={handleEventsChange}
          />
        </div>
      </div>
    </div>
  );
}