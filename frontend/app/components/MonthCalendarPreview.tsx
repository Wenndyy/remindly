"use client";

import React, { useMemo, useState } from "react";

type Cell = { date: Date; isCurrentMonth: boolean };

function getMonthMatrix(month: number, year: number): Cell[][] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const matrix: Cell[][] = [];
  let week: Cell[] = [];

  const startDay = first.getDay();
  const prevMonth = new Date(year, month, 0);
  const prevMonthDays = prevMonth.getDate();
  for (let i = startDay - 1; i >= 0; i--) {
    week.push({ date: new Date(year, month - 1, prevMonthDays - i), isCurrentMonth: false });
  }

  for (let d = 1; d <= last.getDate(); d++) {
    week.push({ date: new Date(year, month, d), isCurrentMonth: true });
    if (week.length === 7) {
      matrix.push(week);
      week = [];
    }
  }

  if (week.length) {
    let nextDay = 1;
    while (week.length < 7) {
      week.push({ date: new Date(year, month + 1, nextDay++), isCurrentMonth: false });
    }
    matrix.push(week);
  }
  return matrix;
}

export default function MonthCalendarPreview({
  initialMonth,
  initialYear,
  onSelect,
}: {
  initialMonth?: number;
  initialYear?: number;
  onSelect?: (date: Date) => void;
}) {
  const now = new Date();
  const [month, setMonth] = useState<number>(initialMonth ?? now.getMonth());
  const [year, setYear] = useState<number>(initialYear ?? now.getFullYear());
  const [selected, setSelected] = useState<Date | null>(null);

  const matrix = useMemo<Cell[][]>(() => getMonthMatrix(month, year), [month, year]);

  const today = useMemo(() => {
    const t = new Date();
    return { day: t.getDate(), month: t.getMonth(), year: t.getFullYear() };
  }, []);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const weekdayNames = ["Su", "Mo", "Tu", "We", "Th", "Tr", "Sa"];

  const goPrev = () => {
    const prev = new Date(year, month - 1, 1);
    setMonth(prev.getMonth());
    setYear(prev.getFullYear());
    setSelected(null);
  };

  const goNext = () => {
    const next = new Date(year, month + 1, 1);
    setMonth(next.getMonth());
    setYear(next.getFullYear());
    setSelected(null);
  };

  const handleClick = (cell: Cell | null) => {
    if (!cell) return;
    setSelected(cell.date);
    onSelect?.(cell.date);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">
          {monthNames[month]} {year}
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={goPrev}
            className="p-1 hover:bg-gray-100 rounded transition"
            aria-label="previous month"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button
            onClick={goNext}
            className="p-1 hover:bg-gray-100 rounded transition"
            aria-label="next month"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekdayNames.map((wd) => (
          <div key={wd} className="text-center text-sm font-medium text-gray-400 py-2">
            {wd}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {matrix.flat().map((cell, idx) => {
          const isToday = cell.date.getDate() === today.day &&
                          cell.date.getMonth() === today.month &&
                          cell.date.getFullYear() === today.year;
          const isSelected = selected !== null && cell.date.toDateString() === selected.toDateString();

          
          return (
            <div key={idx} className="h-12 flex items-center justify-center">
              <button
                onClick={() => handleClick(cell)}
                aria-label={`Select ${cell.date.toDateString()}`}
                className={`
                  flex items-center justify-center
                  w-10 h-10 rounded-full transition
                  ${!cell.isCurrentMonth ? "text-gray-300" : "text-gray-700"}
                  ${isSelected ? "text-white border-2" : ""}
                  ${!isToday && !isSelected ? "hover:bg-gray-100" : ""}
                `}
                style={{
                 
                  borderColor: isToday && !isSelected ? "#337AF7" : undefined,
                  color: isToday && !isSelected ? "#337AF7" : undefined,

                  backgroundColor: isSelected ? "#337AF7" : undefined,
                  borderWidth: (isToday || isSelected) ? "2px" : undefined,
                }}
              >
                <span className="text-sm font-medium">
                  {cell.date.getDate()}
                </span>
              </button>

            </div>
          );
        })}
      </div>
    </div>
  );
}
