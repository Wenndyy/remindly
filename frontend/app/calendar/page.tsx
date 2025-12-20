// app/calendar/page.tsx (atau file calendar page Anda)
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axiosClient from "../api/axiosClient";
import CustomCalendar from "../components/CustomCalendar";
import Header from "../components/Header";

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
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await axiosClient.get("/events");

      console.log("Fetched events from API:", response.data);

      const formattedEvents = response.data.flatMap((event: any) => {
        const startDate = new Date(event.start_date);
        const endDate = new Date(event.end_date);
        const datesInRange = [];

        // Generate dates from start_date to end_date
        for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
          const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

          let startHour = 9;
          let startMinute = 0;
          let endHour = 10;
          let endMinute = 0;
          let time = "09:00 - 10:00";

          // For first day, use actual times
          if (date.toDateString() === startDate.toDateString()) {
            if (event.start_time && event.end_time) {
              const startTime = event.start_time.split(':');
              const endTime = event.end_time.split(':');

              startHour = parseInt(startTime[0]);
              startMinute = parseInt(startTime[1]);
              endHour = parseInt(endTime[0]);
              endMinute = parseInt(endTime[1]);
              time = `${event.start_time} - ${event.end_time}`;
            } else if (event.all_day) {
              startHour = 0;
              startMinute = 0;
              endHour = 23;
              endMinute = 59;
              time = "00:00 - 23:59";
            }
          } else {
            // For subsequent days in range, show as all-day
            startHour = 0;
            startMinute = 0;
            endHour = 23;
            endMinute = 59;
            time = "00:00 - 23:59";
          }

          datesInRange.push({
            id: `${event.id}-${dateKey}`, // Unique ID untuk setiap hari
            originalId: event.id,
            date: dateKey, // Display date untuk calendar
            startDate: event.start_date,
            endDate: event.end_date,
            startHour: startHour,
            startMinute: startMinute,
            endHour: endHour,
            endMinute: endMinute,
            time: time,
            title: event.title,
            description: event.description,
            location: event.location,
            participants: event.participants || 0,
            project: event.project_name,
            project_color: event.project_color,
            all_day: event.all_day,
            start_time: event.start_time,
            end_time: event.end_time,
            guest: event.guest,
            isMultiDay: event.start_date !== event.end_date,
            isFirstDay: date.toDateString() === startDate.toDateString(),
            isLastDay: date.toDateString() === endDate.toDateString()
          });
        }

        return datesInRange;
      });

      setEvents(formattedEvents);
    } catch (err) {
      console.error("Failed to fetch events:", err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    let mounted = true;

    if (checkedAuth && mounted) {
      fetchEvents();
    }

    return () => {
      mounted = false;
    };
  }, [checkedAuth, refreshTrigger]);


  const handleEventChange = () => {
    console.log("Event changed, refreshing data...");
    setRefreshTrigger(prev => prev + 1);
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

  // Listen for global event updates (from floating chat)
  useEffect(() => {
    const handleEventsUpdated = () => {
      setRefreshTrigger(prev => prev + 1);
    };
    window.addEventListener('events-updated', handleEventsUpdated);
    return () => window.removeEventListener('events-updated', handleEventsUpdated);
  }, []);

  if (!checkedAuth) {
    return <div className="p-6">Memeriksa autentikasi...</div>;
  }

  const photo = user?.photoURL ?? null;
  const name = user?.name ?? "User";

  const fallback = "/person.svg";
  const displayEvents = events.length > 0 ? events : undefined;

  return (
    <div className="w-full h-full p-0 m-0">
      <Header title="Calendar" />

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
            onEventChange={handleEventChange}
          />
        )}
      </div>
    </div>
  );
}