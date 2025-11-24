"use client";

import React, { useMemo, useState, useEffect } from "react";
import EventModal, { EventForm } from "./EventModal";

export type EventItem = {
  id?: string;           // optional id for edit
  date: string;          // yyyy-mm-dd
  startHour: number;
  startMinute?: number;
  endHour?: number;
  endMinute?: number;
  durationHours?: number;
  durationMinutes?: number;
  time?: string;
  title: string;
  description?: string;
  guest?: string;
  location?: string;
  project?: string;
};

type WeeklyCalendarProps = {
  selectedDate?: Date | null;
  onDateSelect?: (date: Date) => void;
  initialEvents?: EventItem[];
  startHour?: number;
  endHour?: number;
};

function BadgeCalendar({ month, day }: { month: string; day: number | string }) {
  return (
    <div
      className="rounded-xl shadow-sm"
      style={{
        width: 52,
        height: 52,
        overflow: "hidden",
        background: "#fff",
        border: "4px solid #e5e7eb",
        boxSizing: "border-box",
      }}
      aria-label={`${month} ${day}`}
    >
      <div
        style={{
          height: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#B6252A",
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 600, color: "#ffffff", lineHeight: 1 }}>{month}</span>
      </div>

      <div
        style={{
          height: 52 - 4 * 2 - 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#ffffff",
        }}
      >
        <span style={{ color: "#B6252A", fontWeight: 700, fontSize: 18, lineHeight: 1 }}>{String(day).padStart(2, "0")}</span>
      </div>
    </div>
  );
}

export default function WeeklyCalendar({
  selectedDate,
  onDateSelect,
  initialEvents = [],
  startHour = 9,
  endHour = 20,
}: WeeklyCalendarProps) {
  // hooks
  const [weekOffset, setWeekOffset] = useState(0);
  const [events, setEvents] = useState<EventItem[]>(initialEvents);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const hoursCount = endHour - startHour + 1;
  const hourRowHeight = 56;

  // build week data
  const weekData = useMemo(() => {
    const today = new Date();
    const currentDay = today.getDay();

    const startOfWeek = new Date(today);
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(today.getDate() - currentDay + weekOffset * 7);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      d.setHours(0, 0, 0, 0);
      days.push({
        date: d,
        dayName: dayNames[d.getDay()],
        dayNum: d.getDate(),
        month: monthNames[d.getMonth()],
        year: d.getFullYear(),
        isToday: (() => {
          const t = new Date();
          t.setHours(0, 0, 0, 0);
          return d.toDateString() === t.toDateString();
        })(),
      });
    }
    return days;
  }, [weekOffset]);

  const weekRange = useMemo(() => {
    if (!weekData || weekData.length === 0) return { startStr: "", endStr: "" };
    const s = weekData[0];
    const e = weekData[weekData.length - 1];
    return {
      startStr: `${s.month} ${s.dayNum}, ${s.year}`,
      endStr: `${e.month} ${e.dayNum}, ${e.year}`,
    };
  }, [weekData]);

  const asDateKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const getEventsForDay = (date: Date) => {
    const key = asDateKey(date);
    return events.filter((e) => e.date === key);
  };

  // event time helpers

  const eventStartMinutes = (ev: EventItem) => {
    const m = ev.startMinute ?? 0;
    return Math.round(ev.startHour * 60 + m);
  };

  // convert EventItem to minutes end
  const eventEndMinutes = (ev: EventItem) => {
    if (typeof ev.endHour === "number") {
      const em = (ev.endMinute ?? 0) + ev.endHour * 60;
      return Math.round(em);
    }
    if (typeof ev.durationMinutes === "number") {
      return Math.round(eventStartMinutes(ev) + ev.durationMinutes);
    }
    if (typeof ev.durationHours === "number") {
      return Math.round(eventStartMinutes(ev) + ev.durationHours * 60);
    }
    return Math.round(eventStartMinutes(ev) + 60);
  };

  const startOfCalendarMinutes = startHour * 60;
  const minutesToPx = (mins: number) => (mins / 60) * hourRowHeight;

  const topPxForEvent = (ev: EventItem) => {
    const sMin = eventStartMinutes(ev);
    const relMin = Math.max(sMin, startOfCalendarMinutes) - startOfCalendarMinutes;
    return minutesToPx(relMin);
  };

  const heightPxForEvent = (ev: EventItem) => {
    const sMin = eventStartMinutes(ev);
    const eMin = eventEndMinutes(ev);
    const dur = Math.max(0, eMin - sMin);
    return Math.max(24, minutesToPx(dur));
  };

  // controls
  const colPercent = 100 / 7;
  const centerGridHeight = hoursCount * hourRowHeight;
  const goPrev = () => setWeekOffset((v) => v - 1);
  const goNext = () => setWeekOffset((v) => v + 1);

  useEffect(() => {
    if (!selectedDate) return;
    const sel = new Date(selectedDate);
    sel.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currStart = new Date(today);
    currStart.setDate(today.getDate() - today.getDay());
    const selStart = new Date(sel);
    selStart.setDate(sel.getDate() - sel.getDay());
    const diffWeeks = Math.round((selStart.getTime() - currStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
    setWeekOffset(diffWeeks);
  }, [selectedDate]);

  const badgeDate = weekData.find((d) => d.isToday) ?? weekData[0] ?? { month: "", dayNum: 0 };

  // --- modal handlers
  const openEventModal = (ev?: EventItem | null) => {
    setEditingEvent(ev ?? null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingEvent(null);
  };

  // convert EventForm -> EventItem
  const eventFormToItem = (form: EventForm, existing?: EventItem | null): EventItem => {
    // date must be yyyy-mm-dd
    const id = existing?.id ?? String(Date.now());
    const startParts = form.startTime ? form.startTime.split(":").map((s) => parseInt(s, 10)) : [startHour, 0];
    const endParts = form.endTime ? form.endTime.split(":").map((s) => parseInt(s, 10)) : [startParts[0] + 1, startParts[1]];
    return {
      id,
      date: form.date,
      startHour: startParts[0],
      startMinute: startParts[1] ?? 0,
      endHour: endParts[0],
      endMinute: endParts[1] ?? 0,
      time: form.startTime && form.endTime ? `${form.startTime} - ${form.endTime}` : undefined,
      title: form.title || "(No title)",
      description: form.description,
      guest: form.guest,
      location: form.location,
      project: form.project,
    };
  };

  const handleSaveFromModal = (data: EventForm) => {
    if (!data.date) {
      // minimal validation
      alert("Please choose a date");
      return;
    }
    const newItem = eventFormToItem(data, editingEvent ?? null);
    setEvents((prev) => {
      const found = prev.find((p) => p.id === newItem.id);
      if (found) {
        return prev.map((p) => (p.id === newItem.id ? newItem : p));
      }
      return [...prev, newItem];
    });
    closeModal();
  };

  // remove event helper (optional)
  const handleDeleteEvent = (id?: string) => {
    if (!id) return;
    if (!confirm("Delete this event?")) return;
    setEvents((prev) => prev.filter((p) => p.id !== id));
  };

  // --- render
  return (
    <div className="bg-white rounded-2xl shadow border overflow-hidden box-border relative">
      <div className="flex items-center justify-between px-5 py-4 border-b">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <BadgeCalendar month={badgeDate.month} day={badgeDate.dayNum} />
          </div>

          <div>
            <div className="text-lg font-semibold text-gray-900">{weekRange.startStr} - {weekRange.endStr}</div>
          </div>
        </div>

        <div>
          <button
            onClick={() => openEventModal(null)}
            className="inline-flex items-center gap-2 px-4 py-2"
            style={{ background: "linear-gradient(90deg,#337AF7,#1E4891)", color: "#fff", borderRadius: 6 }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Add Event
          </button>
        </div>
      </div>

      <div className="flex">
        <div className="flex-1">
          <div className="flex border-b bg-white">
            <div className="w-20 bg-gray-50 border-r flex items-center justify-center">
              <button onClick={goPrev} className="p-2 rounded hover:bg-gray-100 transition-colors">
                <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            </div>

            <div className="flex-1 grid grid-cols-7">
              {weekData.map((d) => (
                <div
                  key={asDateKey(d.date)}
                  onClick={() => onDateSelect?.(d.date)}
                  className={`py-3 text-center border-r last:border-r-0 cursor-pointer transition-colors ${d.isToday ? "bg-blue-50" : "hover:bg-gray-50"}`}
                >
                  <div className={`text-sm font-semibold ${d.isToday ? "text-[#337AF7]" : "text-gray-700"}`}>{d.month} {d.dayNum}</div>
                  <div className={`text-xs ${d.isToday ? "text-[#337AF7]" : "text-gray-400"}`}>{d.dayName}</div>
                </div>
              ))}
            </div>

            <div className="w-20 bg-gray-50 border-l flex items-center justify-center">
              <button onClick={goNext} className="p-2 rounded hover:bg-gray-100 transition-colors">
                <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex">
            <div className="w-20 bg-white border-r">
              {Array.from({ length: hoursCount }).map((_, i) => {
                const hour = startHour + i;
                const label = hour <= 11 ? `${hour} AM` : `${hour === 12 ? 12 : hour - 12} PM`;
                return (
                  <div key={i} className="h-14 flex items-center justify-center border-b border-gray-100">
                    <div className="text-xs text-gray-500">{label}</div>
                  </div>
                );
              })}
            </div>

            <div className="flex-1 relative overflow-hidden" style={{ minHeight: `${centerGridHeight}px` }}>
              <div className="absolute inset-0 grid grid-cols-7 pointer-events-none">
                {Array.from({ length: 7 }).map((_, colIdx) => (
                  <div key={colIdx} className="border-r last:border-r-0">
                    {Array.from({ length: hoursCount }).map((__, rowIdx) => (
                      <div key={rowIdx} className="h-14 border-b border-dashed border-gray-100" />
                    ))}
                  </div>
                ))}
              </div>

              <div className="absolute inset-0 pointer-events-none">
                {weekData.map((day, dayIdx) => {
                  const dayEvents = getEventsForDay(day.date);
                  return dayEvents.map((ev, idx) => {
                    const topPx = topPxForEvent(ev);
                    const heightPx = heightPxForEvent(ev);

                    const leftPercent = colPercent * dayIdx;
                    const widthPercent = colPercent;

                    const displayTime = ev.time ?? (() => {
                      const sMin = (ev.startHour * 60) + (ev.startMinute ?? 0);
                      const eMin = (ev.endHour ?? ev.startHour + 1) * 60 + (ev.endMinute ?? 0);
                      const toHHMM = (m: number) => {
                        const hh = Math.floor(m / 60);
                        const mm = m % 60;
                        const hhStr = String(hh).padStart(2, "0");
                        const mmStr = String(mm).padStart(2, "0");
                        return `${hhStr}:${mmStr}`;
                      };
                      return `${toHHMM(sMin)} - ${toHHMM(eMin)}`;
                    })();

                    return (
                      <div
                        key={`${dayIdx}-${idx}`}
                        style={{
                          position: "absolute",
                          left: `calc(${leftPercent}% + 6px)`,
                          width: `calc(${widthPercent}% - 12px)`,
                          top: `${topPx}px`,
                          height: `${heightPx}px`,
                          zIndex: 20,
                          pointerEvents: "auto",
                          boxSizing: "border-box",
                          cursor: "pointer",
                        }}
                      >
                        <div
                          className="h-full rounded-md p-2 text-sm border shadow box-border flex flex-col justify-between"
                          onClick={() => openEventModal(ev)}
                          title={ev.title}
                          style={{
                            background: "#FFFBEB", // amber-50 like
                            color: "#92400E", // amber-900-like
                            borderColor: "#FCD34D",
                          }}
                        >
                          <div className="text-xs opacity-80">{displayTime}</div>
                          <div className="font-medium line-clamp-1 flex items-center justify-between gap-2">
                            <span>{ev.title}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteEvent(ev.id);
                              }}
                              className="text-xs text-red-500"
                              aria-label="Delete"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })}
              </div>
            </div>

            <div className="w-20 bg-gray-50 border-l">
              {Array.from({ length: hoursCount }).map((_, i) => (
                <div key={i} className="h-14 border-b border-gray-100" />
              ))}
            </div>
          </div>
        </div>
      </div>

  
      <EventModal
        open={modalOpen}
        initial={
          editingEvent
            ? {
                title: editingEvent.title,
                description: editingEvent.description || "",
                date: editingEvent.date,
                startTime: `${String(editingEvent.startHour).padStart(2, "0")}:${String(editingEvent.startMinute ?? 0).padStart(2, "0")}`,
                endTime:
                  typeof editingEvent.endHour === "number"
                    ? `${String(editingEvent.endHour).padStart(2, "0")}:${String(editingEvent.endMinute ?? 0).padStart(2, "0")}`
                    : "",
                allDay: false,
                guest: editingEvent.guest || "",
                location: editingEvent.location || "",
                project: editingEvent.project || "",
              }
            : null
        }
        onClose={closeModal}
        onSave={handleSaveFromModal}
      />
    </div>
  );
}
