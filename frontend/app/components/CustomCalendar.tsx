// app/components/WeeklyCalendar.tsx
"use client";

import React, { useMemo, useState, useEffect } from "react";
import EventModal, { EventForm } from "./EventModal";

export type EventItem = {
  id?: string;
  date: string;
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
  // Tambahkan fields untuk database
  start_time?: string;  // dari database: "HH:MM"
  end_time?: string;    // dari database: "HH:MM" 
  all_day?: boolean;    // dari database
  project_color?: string; // warna dari database
  color?: string;       // fallback color
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

export default function CustomCalendar({
  selectedDate,
  onDateSelect,
  initialEvents = [],
  startHour = 9,
  endHour = 20,
}: WeeklyCalendarProps) {
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");
  const [weekOffset, setWeekOffset] = useState(0);
  const [events, setEvents] = useState<EventItem[]>(initialEvents);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [internalSelected, setInternalSelected] = useState<Date>(selectedDate ?? new Date());

  // Debug initial events
  useEffect(() => {
    console.log('Initial events received:', initialEvents);
    setEvents(initialEvents);
  }, [initialEvents]);

  useEffect(() => {
    if (selectedDate) setInternalSelected(selectedDate);
  }, [selectedDate]);

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const hoursCount = endHour - startHour + 1;
  const hourRowHeight = 56;

  // --- helpers
  const asDateKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const getEventsForDateKey = (key: string) => {
    const filteredEvents = events.filter((e) => e.date === key);
    console.log(`Events for ${key}:`, filteredEvents);
    return filteredEvents;
  };

  // --- week data (used by week view)
  const weekData = useMemo(() => {
    const base = new Date(internalSelected);
    base.setHours(0, 0, 0, 0);
    const currentDay = base.getDay();
    const startOfWeek = new Date(base);
    startOfWeek.setDate(base.getDate() - currentDay + weekOffset * 7);
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
    console.log('Week data generated:', days);
    return days;
  }, [internalSelected, weekOffset]);

  const weekRange = useMemo(() => {
    if (!weekData || weekData.length === 0) return { startStr: "", endStr: "" };
    const s = weekData[0];
    const e = weekData[weekData.length - 1];
    return {
      startStr: `${s.month} ${s.dayNum}, ${s.year}`,
      endStr: `${e.month} ${e.dayNum}, ${e.year}`,
    };
  }, [weekData]);

  // --- month grid (used by month view)
  const monthGrid = useMemo(() => {
    const d = new Date(internalSelected);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    const firstDayIdx = d.getDay();
    const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const prevMonthDays = new Date(d.getFullYear(), d.getMonth(), 0).getDate();

    const cells: { date: Date; inCurrentMonth: boolean }[] = [];
    // add previous month's tail
    for (let i = firstDayIdx - 1; i >= 0; i--) {
      const dt = new Date(d.getFullYear(), d.getMonth() - 1, prevMonthDays - i);
      dt.setHours(0, 0, 0, 0);
      cells.push({ date: dt, inCurrentMonth: false });
    }
    // current month
    for (let i = 1; i <= daysInMonth; i++) {
      const dt = new Date(d.getFullYear(), d.getMonth(), i);
      dt.setHours(0, 0, 0, 0);
      cells.push({ date: dt, inCurrentMonth: true });
    }
    // next month to fill 42 cells
    let nextDay = 1;
    while (cells.length < 42) {
      const dt = new Date(d.getFullYear(), d.getMonth() + 1, nextDay++);
      dt.setHours(0, 0, 0, 0);
      cells.push({ date: dt, inCurrentMonth: false });
    }

    // group into 6 rows
    const rows: { date: Date; inCurrentMonth: boolean; key: string }[][] = [];
    for (let r = 0; r < 6; r++) {
      const row = cells.slice(r * 7, r * 7 + 7).map((c) => ({ ...c, key: asDateKey(c.date) }));
      rows.push(row);
    }
    return rows;
  }, [internalSelected]);

  // --- day view: single date column computed from internalSelected
  const dayDate = useMemo(() => {
    const d = new Date(internalSelected);
    d.setHours(0, 0, 0, 0);
    console.log('Day view date:', d);
    return d;
  }, [internalSelected]);

  // Event minute helpers - FIXED VERSION
  const eventStartMinutes = (ev: EventItem) => {
    // Priority 1: Use start_time from database if available
    if (ev.start_time && ev.start_time.includes(':')) {
      const [hours, minutes] = ev.start_time.split(':').map(Number);
      return hours * 60 + minutes;
    }
    
    // Priority 2: Use time field if available (take first part if it's a range)
    if (ev.time && ev.time.includes(':')) {
      const timePart = ev.time.split(' - ')[0]; // Take only start time if range
      const [hours, minutes] = timePart.split(':').map(Number);
      return hours * 60 + minutes;
    }
    
    // Priority 3: Fallback to startHour/startMinute
    const m = ev.startMinute ?? 0;
    return Math.round(ev.startHour * 60 + m);
  };

  const eventEndMinutes = (ev: EventItem) => {
    // Priority 1: Use end_time from database if available
    if (ev.end_time && ev.end_time.includes(':')) {
      const [hours, minutes] = ev.end_time.split(':').map(Number);
      return hours * 60 + minutes;
    }
    
    // Priority 2: Use time field if available (take end part if it's a range)
    if (ev.time && ev.time.includes(' - ')) {
      const timePart = ev.time.split(' - ')[1]; // Take end time from range
      const [hours, minutes] = timePart.split(':').map(Number);
      return hours * 60 + minutes;
    }
    
    // Priority 3: Fallback calculations
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
  
  const goPrev = () => {
    if (viewMode === "week") setWeekOffset((v) => v - 1);
    if (viewMode === "month") {
      const d = new Date(internalSelected);
      d.setMonth(d.getMonth() - 1);
      setInternalSelected(d);
    }
    if (viewMode === "day") {
      const d = new Date(internalSelected);
      d.setDate(d.getDate() - 1);
      setInternalSelected(d);
    }
  };
  
  const goNext = () => {
    if (viewMode === "week") setWeekOffset((v) => v + 1);
    if (viewMode === "month") {
      const d = new Date(internalSelected);
      d.setMonth(d.getMonth() + 1);
      setInternalSelected(d);
    }
    if (viewMode === "day") {
      const d = new Date(internalSelected);
      d.setDate(d.getDate() + 1);
      setInternalSelected(d);
    }
  };

  // react to prop selectedDate changes
  useEffect(() => {
    if (!selectedDate) return;
    setInternalSelected(selectedDate);
  }, [selectedDate]);

  // badge date uses weekData
  const badgeDate = weekData.find((d) => d.isToday) ?? weekData[0] ?? { month: "", dayNum: 0 };

  // modal handlers
  const openEventModal = (ev?: EventItem | null) => {
    setEditingEvent(ev ?? null);
    setModalOpen(true);
  };
  
  const closeModal = () => {
    setModalOpen(false);
    setEditingEvent(null);
  };

  const eventFormToItem = (form: EventForm, existing?: EventItem | null): EventItem => {
    const id = existing?.id ?? String(Date.now());
    const startParts = form.startTime ? form.startTime.split(":").map((s) => parseInt(s, 10)) : [startHour, 0];
    const endParts = form.endTime ? form.endTime.split(":").map((s) => parseInt(s, 10)) : [startParts[0] + 1, startParts[1]];
    const dateKey = asDateKey(internalSelected);
    
    return {
      id,
      date: dateKey,
      startHour: startParts[0],
      startMinute: startParts[1] ?? 0,
      endHour: endParts[0],
      endMinute: endParts[1] ?? 0,
      time: form.startTime && form.endTime ? `${form.startTime} - ${form.endTime}` : undefined,
      title: form.title || "(No title)",
      description: form.description,
      guest: form.guest,
      location: form.location,
      project: form.projectName,
      projectId: form.projectId,
    };
  };

  const handleSaveFromModal = (data: EventForm) => {
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

  // Helper function untuk color contrast
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

  // --- rendering helpers for month cells
  const renderMonthCell = (cellDate: Date, inCurrentMonth: boolean) => {
    const key = asDateKey(cellDate);
    const dayEvents = getEventsForDateKey(key);
    const isToday = (() => {
      const t = new Date();
      t.setHours(0, 0, 0, 0);
      return cellDate.toDateString() === t.toDateString();
    })();
    
    return (
      <div
        key={key}
        className={`
          border border-gray-200 p-2 min-h-[120px] flex flex-col justify-start gap-1.5 cursor-pointer 
          transition-colors hover:bg-gray-50 relative
          ${inCurrentMonth ? "bg-white" : "bg-gray-50/50"}
        `}
        onClick={() => {
          setInternalSelected(new Date(cellDate));
          onDateSelect?.(new Date(cellDate));
        }}
      >
        {/* Date number */}
        <div className="flex items-center justify-between mb-1">
          {isToday ? (
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-semibold"
              style={{ backgroundColor: "#337AF7" }}
            >
              {cellDate.getDate()}
            </div>
          ) : (
            <div className={`text-sm font-medium ${inCurrentMonth ? "text-gray-900" : "text-gray-400"}`}>
              {cellDate.getDate()}
            </div>
          )}
        </div>

        {/* Events */}
        <div className="flex-1 overflow-hidden space-y-1">
          {dayEvents.slice(0, 3).map((ev) => {
            const eventColor = ev.project_color || ev.color || "#F59E0B";
            const eventBgColor = ev.project_color ? `${ev.project_color}20` : "#FFFBEB";
            const eventTextColor = getContrastColor(eventColor);
            
            return (
              <div
                key={ev.id ?? ev.title + ev.date}
                className="px-2 py-1 rounded text-xs font-medium truncate border-l-2 ${ev.project_color}"
                style={{ 
                  background: eventBgColor, 
                  color: eventTextColor, 
                  borderLeftColor: eventColor,
                  cursor: "pointer" 
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  openEventModal(ev);
                }}
                title={ev.title}
              >
                {ev.time ? `${ev.time} ` : ""}{ev.title}
              </div>
            );
          })}
          {dayEvents.length > 3 && (
            <div className="text-xs text-gray-500 font-medium pl-1">
              +{dayEvents.length - 3} more
            </div>
          )}
        </div>
      </div>
    );
  };

  // --- day view column - FIXED VERSION
  const renderDayColumn = (date: Date) => {
    const key = asDateKey(date);
    const dayEvents = getEventsForDateKey(key);
   
    
    return (
      <div className="relative overflow-hidden" style={{ minHeight: `${centerGridHeight}px` }}>
        {/* Grid lines */}
        <div className="absolute inset-0">
          {Array.from({ length: hoursCount }).map((_, rowIdx) => (
            <div key={rowIdx} className="h-14 border-b border-dashed border-gray-100" />
          ))}
        </div>

        {/* Events */}
        <div className="absolute inset-0">
          {dayEvents.map((ev, idx) => {
            const topPx = topPxForEvent(ev);
            const heightPx = heightPxForEvent(ev);
            
         
            // Ambil warna dari database atau gunakan default
            const eventColor = ev.project_color || ev.color || "#F59E0B";
            const eventBgColor = ev.project_color ? `${ev.project_color}20` : "#FFFBEB";
            const eventTextColor = getContrastColor(eventColor);
            
            const displayTime = ev.start_time && ev.end_time 
              ? `${ev.start_time} - ${ev.end_time}`
              : ev.time ?? `${String(ev.startHour).padStart(2, "0")}:${String(ev.startMinute ?? 0).padStart(2, "0")} - ${String(ev.endHour ?? ev.startHour + 1).padStart(2, "0")}:${String(ev.endMinute ?? 0).padStart(2, "0")}`;

            return (
              <div
                key={ev.id ?? `${idx}`}
                style={{
                  position: "absolute",
                  left: 8,
                  right: 8,
                  top: `${topPx}px`,
                  height: `${heightPx}px`,
                  zIndex: 20,
                  pointerEvents: "auto",
                }}
              >
                <div
                  className={`h-full p-2 text-sm border shadow box-border flex flex-col rounded   ${ev.project_color ?? "border-yellow-500 bg-yellow-100"}`}
                  onClick={() => openEventModal(ev)}
                  title={ev.title}
                  style={{
                    background: eventBgColor,
                    color: eventTextColor,
                    borderColor: eventColor,
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  <div style={{ 
                    position: "absolute", 
                    top: 0, 
                    left: 0, 
                    right: 0, 
                    height: 2, 
                    background: eventColor, 
                    borderTopLeftRadius: 8, 
                    borderTopRightRadius: 8 
                  }} />
                  <div style={{ paddingTop: 4 }} />
                  <div className="text-xs opacity-80" style={{ fontWeight: 600 }}>
                    {displayTime}
                  </div>
                  <div className="font-medium truncate mt-1">{ev.title}</div>
                  {ev.project && (
                    <div className="text-xs opacity-70 mt-1 truncate">
                      {ev.project}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // header dropdown label
  const headerLabel = useMemo(() => {
    if (viewMode === "month") {
      const d = new Date(internalSelected);
      return `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    }
    if (viewMode === "week") {
      return `${weekRange.startStr} - ${weekRange.endStr}`;
    }
    // day
    const d = new Date(internalSelected);
    return `${monthNames[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  }, [viewMode, internalSelected, weekRange]);


  useEffect(() => {
    ;
    if (viewMode === 'week') {
      console.log('Week view events per day:');
      weekData.forEach(day => {
        const dayEvents = getEventsForDateKey(asDateKey(day.date));
        console.log(`- ${day.date}: ${dayEvents.length} events`);
      });
    }
    if (viewMode === 'day') {
      const dayEvents = getEventsForDateKey(asDateKey(dayDate));
      console.log(`Day view events: ${dayEvents.length}`);
    }
  }, [viewMode, events, weekData, dayDate]);

  // --- render main UI
  return (
    <div className="bg-white rounded-[15px] shadow border overflow-hidden box-border relative">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b">
        <div className="flex items-center gap-4">
          <BadgeCalendar month={badgeDate.month} day={badgeDate.dayNum} />
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {headerLabel}
            </div>
            {/* Debug info */}
            <div className="text-xs text-gray-500">
              {events.length} events loaded
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Navigation buttons */}
          <div className="flex items-center gap-2 mr-2">
            <button onClick={goPrev} className="p-2 rounded hover:bg-gray-100 transition-colors">
              <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button onClick={goNext} className="p-2 rounded hover:bg-gray-100 transition-colors">
              <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* View mode dropdown */}
          <div className="relative">
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as any)}
              className="border rounded px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="View mode"
            >
              <option value="month">Month view</option>
              <option value="week">Week view</option>
              <option value="day">Day view</option>
            </select>
          </div>

          <button
            onClick={() => openEventModal(null)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Add Event
          </button>
        </div>
      </div>

      {/* Calendar Content */}
      <div>
        {/* Month View */}
        {viewMode === "month" && (
          <div className="border border-gray-200 rounded-b-lg overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
              {dayNames.map((dn) => (
                <div
                  key={dn}
                  className="text-xs text-gray-600 font-semibold px-3 py-3 text-center border-r border-gray-200 last:border-r-0"
                >
                  {dn}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 border-collapse">
              {monthGrid.flat().map((cell) => {
                const isToday = (() => {
                  const t = new Date();
                  t.setHours(0, 0, 0, 0);
                  return cell.date.toDateString() === t.toDateString();
                })();
                
                const dayEvents = getEventsForDateKey(cell.key);
                
                return (
                  <div
                    key={cell.key}
                    className={`
                      min-h-[120px] border-r border-b border-gray-200 p-2
                      ${cell.inCurrentMonth ? "bg-white" : "bg-gray-50/50"}
                      hover:bg-gray-50 transition-colors cursor-pointer
                      relative
                    `}
                    onClick={() => {
                      setInternalSelected(new Date(cell.date));
                      onDateSelect?.(new Date(cell.date));
                    }}
                  >
                    {/* Date Number */}
                    <div className="flex items-center justify-between mb-1">
                      {isToday ? (
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                          style={{ backgroundColor: "#337AF7" }}
                        >
                          {cell.date.getDate()}
                        </div>
                      ) : (
                        <div className={`text-sm font-medium ${cell.inCurrentMonth ? "text-gray-900" : "text-gray-400"}`}>
                          {cell.date.getDate()}
                        </div>
                      )}
                    </div>

                    {/* Events */}
                    <div className="flex-1 overflow-hidden space-y-1">
                      {dayEvents.slice(0, 3).map((ev) => {
                        const eventColor = ev.project_color || ev.color || "#F59E0B";
                        const eventBgColor = ev.project_color ? `${ev.project_color}20` : "#FFFBEB";
                        const eventTextColor = getContrastColor(eventColor);
                        
                        return (
                          <div
                            key={ev.id ?? ev.title + ev.date}
                            className={`px-2 py-1 rounded text-xs font-medium truncate border-l-2
  ${ev.project_color ?? "border-yellow-500 bg-yellow-100"}
`}

                            style={{ 
                              background: eventBgColor, 
                              color: eventTextColor, 
                              borderLeftColor: eventColor,
                              cursor: "pointer" 
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              openEventModal(ev);
                            }}
                            title={ev.title}
                          >
                            {ev.time ? `${ev.time} ` : ""}{ev.title}
                          </div>
                        );
                      })}
                      {dayEvents.length > 3 && (
                        <div className="text-xs text-gray-500 font-medium pl-1">
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Week View - FIXED VERSION */}
        {viewMode === "week" && (
          <div className="flex">
            <div className="flex-1">
              <div className="flex border-b bg-white">
                <div className="w-20 bg-gray-50 border-r flex items-center justify-center">
                  Time
                </div>

                <div className="flex-1 grid grid-cols-7">
                  {weekData.map((d) => (
                    <div
                      key={asDateKey(d.date)}
                      onClick={() => {
                        setInternalSelected(d.date);
                        onDateSelect?.(d.date);
                      }}
                      className={`py-3 text-center border-r last:border-r-0 cursor-pointer transition-colors ${
                        d.isToday ? "bg-blue-50 border-t-2 border-t-blue-500" : "hover:bg-gray-50"
                      }`}
                    >
                      <div className={`text-sm font-semibold ${d.isToday ? "text-blue-600" : "text-gray-700"}`}>
                        {d.month} {d.dayNum}
                      </div>
                      <div className={`text-xs ${d.isToday ? "text-blue-600" : "text-gray-400"}`}>
                        {d.dayName}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="w-20 bg-gray-50 border-l flex items-center justify-center">
                  {/* Empty */}
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
                  {/* Grid lines */}
                  <div className="absolute inset-0 grid grid-cols-7">
                    {Array.from({ length: 7 }).map((_, colIdx) => (
                      <div key={colIdx} className="border-r last:border-r-0">
                        {Array.from({ length: hoursCount }).map((__, rowIdx) => (
                          <div key={rowIdx} className="h-14 border-b border-dashed border-gray-100" />
                        ))}
                      </div>
                    ))}
                  </div>

                  {/* Events */}
                  <div className="absolute inset-0">
                    {weekData.map((day, dayIdx) => {
                      const dayKey = asDateKey(day.date);
                      const dayEvents = getEventsForDateKey(dayKey);
                      
                      return dayEvents.map((ev, idx) => {
                        const topPx = topPxForEvent(ev);
                        const heightPx = heightPxForEvent(ev);
                        const leftPercent = colPercent * dayIdx;
                        const widthPercent = colPercent;
                        
                        // Ambil warna dari database atau gunakan default
                        const eventColor = ev.project_color || ev.color || "#F59E0B";
                        const eventBgColor = ev.project_color ? `${ev.project_color}20` : "#FFFBEB";
                        const eventTextColor = getContrastColor(eventColor);
                        
                        const displayTime = ev.start_time && ev.end_time 
                          ? `${ev.start_time} - ${ev.end_time}`
                          : ev.time ?? `${String(ev.startHour).padStart(2, "0")}:${String(ev.startMinute ?? 0).padStart(2, "0")} - ${String(ev.endHour ?? ev.startHour + 1).padStart(2, "0")}:${String(ev.endMinute ?? 0).padStart(2, "0")}`;

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
                             className={`h-full p-2 text-sm border shadow box-border flex flex-col rounded ${ev.project_color ?? "border-yellow-500 bg-yellow-100"}`}
                              onClick={() => openEventModal(ev)}
                              title={ev.title}
                              style={{
                                background: eventBgColor,
                                color: eventTextColor,
                                borderColor: eventColor,
                                display: "flex",
                                flexDirection: "column",
                                overflow: "hidden",
                                position: "relative",
                              }}
                            >
                              <div style={{ 
                                position: "absolute", 
                                top: 0, 
                                left: 0, 
                                right: 0, 
                                height: 2, 
                                background: eventColor, 
                                borderTopLeftRadius: 8, 
                                borderTopRightRadius: 8 
                              }} />
                              <div style={{ paddingTop: 4 }} />
                              <div className="text-xs opacity-80" style={{ fontWeight: 600 }}>
                                {displayTime}
                              </div>
                              <div className="font-medium truncate mt-1">{ev.title}</div>
                              {ev.project && (
                                <div className="text-xs opacity-70 mt-1 truncate">
                                  {ev.project}
                                </div>
                              )}
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
        )}

        {/* Day View */}
        {viewMode === "day" && (
          <div className="flex">
            <div className="flex-1">
              <div className="flex border-b bg-white">
                <div className="w-20 bg-gray-50 border-r flex items-center justify-center">
                  Time
                </div>

                <div className="flex-1 py-3 px-4">
                  <div className="text-sm font-semibold text-gray-700">
                    {dayNames[dayDate.getDay()]}
                  </div>
                  <div className="text-xs text-gray-500">
                    {monthNames[dayDate.getMonth()]} {dayDate.getDate()}, {dayDate.getFullYear()}
                  </div>
                </div>

                <div className="w-20 bg-gray-50 border-l flex items-center justify-center">
                  {/* Empty */}
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
                  <div className="absolute inset-0">
                    {Array.from({ length: hoursCount }).map((_, rowIdx) => (
                      <div key={rowIdx} className="h-14 border-b border-gray-200" />
                    ))}
                  </div>

                  <div className="absolute inset-0">
                    {renderDayColumn(dayDate)}
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
        )}
      </div>

      {/* Event Modal */}
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