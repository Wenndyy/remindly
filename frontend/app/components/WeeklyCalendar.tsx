"use client";

import React, { useMemo, useState, useEffect } from "react";
import EventModal, { EventForm } from "./EventModal";

export type EventItem = {
  id?: string;
  date: string;
  startDate?: string; 
  endDate?: string; 
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
  projectId?: string | number | null;
  start_time?: string;  
  end_time?: string;   
  all_day?: boolean;  
  project_color?: string; 
  color?: string;      
  isMultiDay?: boolean;
  isFirstDay?: boolean;
  isLastDay?: boolean;
  originalId?: string;
};

type WeeklyCalendarProps = {
  selectedDate?: Date | null;
  onDateSelect?: (date: Date) => void;
  initialEvents?: EventItem[];
  startHour?: number;
  endHour?: number;
  onEventsChange?: () => void;
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
  startHour = 1,
  endHour = 24,
  onEventsChange,
}: WeeklyCalendarProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const events = initialEvents;

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const asDateKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  // PERBAIKAN: Gunakan fungsi filter yang sederhana
  const getEventsForDateKey = (key: string) => {
    // Langsung filter berdasarkan date, karena multi-day sudah di-handle di fetchEvents
    const filteredEvents = events.filter((e) => e.date === key);
    return filteredEvents;
  };

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

  const shouldUse24HourFormat = useMemo(() => {
    for (const day of weekData) {
      const dayEvents = getEventsForDateKey(asDateKey(day.date));
      for (const event of dayEvents) {
        if (event.startHour >= 13 || (event.endHour && event.endHour >= 13)) {
          return true;
        }
      }
    }
    return false;
  }, [events, weekData]);

  const hoursCount = shouldUse24HourFormat ? (endHour - startHour + 1) : Math.min(12 - startHour + 1, 12);
  const hourRowHeight = 56;

  const weekRange = useMemo(() => {
    if (!weekData || weekData.length === 0) return { startStr: "", endStr: "" };
    const s = weekData[0];
    const e = weekData[weekData.length - 1];
    return {
      startStr: `${s.month} ${s.dayNum}, ${s.year}`,
      endStr: `${e.month} ${e.dayNum}, ${e.year}`,
    };
  }, [weekData]);

 
  const eventStartMinutes = (ev: EventItem) => {
    const m = ev.startMinute ?? 0;
    return Math.round(ev.startHour * 60 + m);
  };

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

  const openEventModal = (ev?: EventItem | null) => {
    setEditingEvent(ev ?? null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingEvent(null);
  };


  const handleSaveFromModal = () => {
    if (onEventsChange) {
      onEventsChange();
    }
    closeModal();
  };

  
 const getContrastColor = (hexColor: string): string => {
    if (!hexColor || hexColor.length < 7) return '#000000';
    
    try {
      const r = parseInt(hexColor.slice(1, 3), 16);
      const g = parseInt(hexColor.slice(3, 5), 16);
      const b = parseInt(hexColor.slice(5, 7), 16);
      
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      return brightness > 128 ? '#000000' : '#FFFFFF';
    } catch {
      return '#000000';
    }
  };


  const formatHourLabel = (hour: number) => {
    if (shouldUse24HourFormat) {
      return `${hour}:00`;
    } else {
      if (hour === 0) return "12 AM";
      if (hour < 12) return `${hour} AM`;
      if (hour === 12) return "12 PM";
      return `${hour - 12} PM`;
    }
  };

  const getDisplayTime = (ev: EventItem) => {
    if (ev.isMultiDay) {
      if (ev.isFirstDay && ev.start_time) {
        return `${ev.start_time} - 23:59`;
      } else if (ev.isLastDay && ev.end_time) {
        return `00:00 - ${ev.end_time}`;
      } else {
        return "00:00 - 23:59";
      }
    }
    
    return ev.start_time && ev.end_time 
      ? `${ev.start_time} - ${ev.end_time}`
      : ev.time ?? `${String(ev.startHour).padStart(2, "0")}:${String(ev.startMinute ?? 0).padStart(2, "0")} - ${String(ev.endHour ?? ev.startHour + 1).padStart(2, "0")}:${String(ev.endMinute ?? 0).padStart(2, "0")}`;
  };

  // PERBAIKAN: Tambahkan styling khusus untuk multi-day events
  const getEventStyle = (ev: EventItem) => {
    const eventColor = ev.project_color || ev.color || "#F59E0B";
    const eventBgColor = ev.project_color ? `${ev.project_color}70` : "#FFFBEB";
    const eventTextColor = getContrastColor(eventColor);
    
    let borderStyle = {};
    if (ev.isMultiDay) {
      borderStyle = {
        borderLeftWidth: '4px',
        borderLeftColor: eventColor,
        borderTopColor: eventColor,
        borderRightColor: eventColor,
        borderBottomColor: eventColor
      };
    }

    return {
      background: eventBgColor,
      color: eventTextColor,
      borderColor: eventColor,
      ...borderStyle
    };
  };


  

  return (
    <div className="bg-white rounded-[15px]  shadow border overflow-hidden box-border relative">
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
            style={{ background: "#337AF7", color: "#fff", borderRadius: 6 }}
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
                className={`py-3 text-center border-r last:border-r-0 cursor-pointer transition-colors ${
                  d.isToday 
                    ? "border-t-4 border-t-[#337AF7] border-b-0 border-l-0 border-r-0" 
                    : "border-t border-l-0 border-r border-b-0 hover:bg-gray-50"
                }`}
              >
                <div className={`text-sm font-semibold text-black`}>
                  {d.month} {d.dayNum}
                </div>
                <div className={`text-xs text-[#D7D7D7]`}>
                  {d.dayName}
                </div>
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
                const label = formatHourLabel(hour);
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

             <div className="absolute inset-0">
                {weekData.map((day, dayIdx) => {
                  const dayKey = asDateKey(day.date);
                  const dayEvents = getEventsForDateKey(dayKey);
                  
                  return dayEvents.map((ev, idx) => {
                    const topPx = topPxForEvent(ev);
                    const heightPx = heightPxForEvent(ev);
                    const leftPercent = colPercent * dayIdx;
                    const widthPercent = colPercent;

                    const displayTime = getDisplayTime(ev);
                    const eventStyle = getEventStyle(ev);

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
                          className={`h-full p-2 text-sm border-t shadow box-border flex flex-col rounded ${
                            ev.project_color ?? "border-yellow-500 bg-yellow-100"
                          }`}
                          title={ev.title}
                          style={eventStyle}
                        >
                          <div style={{ 
                            position: "absolute", 
                            top: 0, 
                            left: 0, 
                            right: 0, 
                            height: 2, 
                            background: ev.project_color || ev.color || "#F59E0B", 
                            borderTopLeftRadius: 8, 
                            borderTopRightRadius: 8 
                          }} />
                          <div style={{ paddingTop: 4 }} />
                          <div className="text-xs opacity-80" style={{ fontWeight: 600 }}>
                            {displayTime}
                          </div>
                          <div className="font-medium truncate mt-1">{ev.title}</div>
                        
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
                startTime: `${String(editingEvent.startHour).padStart(2, "0")}:${String(editingEvent.startMinute ?? 0).padStart(2, "0")}`,
                endTime:
                  typeof editingEvent.endHour === "number"
                    ? `${String(editingEvent.endHour).padStart(2, "0")}:${String(editingEvent.endMinute ?? 0).padStart(2, "0")}`
                    : "",
                allDay: false,
                guest: editingEvent.guest || "",
                location: editingEvent.location || "",
                projectName: editingEvent.project || "",
                projectId: editingEvent.projectId ? Number(editingEvent.projectId) : undefined,
              }
            : null
        }
        onClose={closeModal}
        onSave={handleSaveFromModal}
      />
    </div>
  );
}