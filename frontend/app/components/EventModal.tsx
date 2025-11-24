"use client";

import React, { useEffect, useRef, useState } from "react";

export type EventForm = {
  title: string;
  description: string;
  date: string; // yyyy-mm-dd
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  allDay: boolean;
  guest: string; // serialized (comma-separated) on save
  location: string;
  project: string;
};

type User = {
  name: string;
  email: string;
  avatar?: string;
};

export default function EventModal({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial?: Partial<EventForm> | null;
  onClose: () => void;
  onSave: (data: EventForm) => void;
}) {
  const empty: EventForm = {
    title: "",
    description: "",
    date: "",
    startTime: "",
    endTime: "",
    allDay: false,
    guest: "",
    location: "",
    project: "",
  };

  // Use the uploaded image path as avatar URL (dev provided)
  const avatarExample = "/mnt/data/63fe19c7-dac6-44fd-9474-9f95b0fa5b10.png";

  // Example users (replace / extend with backend data if needed)
  const users: User[] = [
    { name: "User One", email: "user1@mail.com", avatar: avatarExample },
    { name: "Alice Example", email: "user123@gmail.com", avatar: avatarExample },
    { name: "Bob Sample", email: "bob@example.org", avatar: avatarExample },
    { name: "Charlie", email: "charlie@company.com", avatar: avatarExample },
  ];

  const [form, setForm] = useState<EventForm>(empty);

  // guest-specific state
  const [guestInput, setGuestInput] = useState("");
  const [selectedGuests, setSelectedGuests] = useState<User[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filtered, setFiltered] = useState<User[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (initial) {
      setForm((s) => ({ ...s, ...initial }));
      if (initial.guest) {
        const emails = initial.guest.split(",").map((e) => e.trim()).filter(Boolean);
        const pre = emails.map(
          (em) => users.find((u) => u.email === em) || { name: em, email: em, avatar: avatarExample }
        );
        setSelectedGuests(pre);
      }
    } else {
      setForm(empty);
      setSelectedGuests([]);
      setGuestInput("");
    }
  }, [initial, open]);

  // filtering: when input empty -> show all (except selected). When typing -> filter.
  useEffect(() => {
    const q = guestInput.trim().toLowerCase();
    if (!q) {
      setFiltered(users.filter((u) => !selectedGuests.some((s) => s.email === u.email)));
    } else {
      setFiltered(
        users
          .filter((u) => !selectedGuests.some((s) => s.email === u.email))
          .filter((u) => u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q))
      );
    }
  }, [guestInput, selectedGuests]);

  // show suggestions only while the user is typing (don't open dropdown on focus)
  useEffect(() => {
    const q = guestInput.trim();
    // show the suggestions box whenever there's any input text (so the "Add \"...\"" option can appear
    // even if no existing users match). Closing on empty input keeps behavior tidy.
    setShowSuggestions(!!q);
  }, [guestInput, filtered]);

  // close dropdown on outside click
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  if (!open) return null;

  function addGuest(u: User) {
    setSelectedGuests((s) => [...s, u]);
    setGuestInput("");
    setShowSuggestions(false);
    // keep focus on input so user can add more quickly
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function removeGuest(email: string) {
    setSelectedGuests((s) => s.filter((g) => g.email !== email));
  }

  function handleGuestKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && guestInput.trim()) {
      const match = users.find((u) => u.email.toLowerCase() === guestInput.trim().toLowerCase());
      if (match) addGuest(match);
      else addGuest({ name: guestInput.trim(), email: guestInput.trim(), avatar: avatarExample });
      e.preventDefault();
    } else if (e.key === "Backspace" && !guestInput && selectedGuests.length) {
      setSelectedGuests((s) => s.slice(0, -1));
    }
  }

  function handleSave() {
    const out: EventForm = {
      ...form,
      guest: selectedGuests.map((g) => g.email).join(","),
    };
    onSave(out);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-6">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div
        className="relative bg-white rounded-lg shadow-xl overflow-hidden"
        style={{ width: 760, maxWidth: "95%", maxHeight: "90%", display: "flex", flexDirection: "column" }}
        role="dialog"
        aria-modal="true"
      >
        {/* header */}
        <div
          style={{
            background: "linear-gradient(90deg,#8b1b1f,#5a0e12)",
            color: "#fff",
            padding: "12px 16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 700 }}>{initial ? "Edit Event" : "Add Event"}</div>
          <button onClick={onClose} style={{ color: "#fff", background: "transparent", border: "none", fontSize: 18 }}>
            ✕
          </button>
        </div>

        {/* body */}
        <div style={{ padding: 20, overflow: "auto" }}>
          <div className="mb-4">
            <label className="block text-xs text-[#55565B] mb-1">Event Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Add Title"
              className="w-full border rounded-xl px-3 py-2 text-sm text-[#55565B]"
            />
          </div>

          <div className="mb-4">
            <label className="block text-xs text-[#55565B] mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Description"
              className="w-full border rounded-xl px-3 py-2 text-sm text-[#55565B]"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4 items-end">
            <div>
              <label className="block text-xs text-[#55565B] mb-1">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full border rounded-xl px-2 py-2 text-sm text-[#55565B]"
              />
            </div>

            <div>
              <label className="block text-xs text-[#55565B] mb-1">Time</label>
              <div className="flex items-center">
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  className="border rounded-xl px-2 py-2 text-sm text-[#55565B]"
                  style={{ width: 120 }}
                />
                <span className="mx-3 text-sm text-[#888]" aria-hidden>
                  —
                </span>
                <input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  className="border rounded-xl px-2 py-2 text-sm text-[#55565B]"
                  style={{ width: 120 }}
                />
              </div>
            </div>
          </div>

          <div className="mb-4 flex items-center gap-4">
            <label className="flex items-center cursor-pointer select-none">
              <input
                id="allday"
                type="checkbox"
                className="sr-only peer"
                checked={form.allDay}
                onChange={() => setForm((s) => ({ ...s, allDay: !s.allDay }))}
              />
              <div
                aria-hidden
                className="w-12 h-7 rounded-full p-[3px] bg-[#e6e6e6] peer-checked:bg-[#337AF7] relative transition-colors"
                style={{ boxShadow: "inset 0 1px 2px rgba(0,0,0,0.06)" }}
              >
                <div
                  className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${form.allDay ? "translate-x-[18px]" : "translate-x-0"}`}
                  style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }}
                />
              </div>
              <span className="ml-3 text-sm text-[#55565B]">All Day</span>
            </label>
          </div>

          {/* GUEST: suggestions appear on focus/click; selected items rendered as chips that wrap left-to-right then down */}
          <div className="mb-4" ref={containerRef}>
            <label className="block text-xs text-[#55565B] mb-1">Guest</label>

            <div style={{ maxWidth: "100%" }}>
              <div className="w-full border rounded-xl px-3 py-2 text-sm text-[#55565B]">
                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    value={guestInput}
                    onChange={(e) => setGuestInput(e.target.value)}
                    
                    onKeyDown={handleGuestKeyDown}
                    placeholder="Email Address"
                    className="w-full text-sm outline-none bg-transparent"
                  />
                </div>
              </div>

              {/* dropdown suggestions (absolute positioning under input) */}
              {showSuggestions && (
                <div className="mt-2 bg-white border rounded-lg shadow-md overflow-hidden z-50" style={{ maxWidth: 520 }}>
                  {filtered.map((u) => (
                    <div
                      key={u.email}
                      onClick={() => addGuest(u)}
                      className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50"
                    >
                      <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-full object-cover" />
                      <div>
                        <div className="text-sm font-medium text-[#222]">{u.name}</div>
                        <div className="text-xs text-[#666]">{u.email}</div>
                      </div>
                    </div>
                  ))}

                  {guestInput.trim() && !users.some((u) => u.email.toLowerCase() === guestInput.trim().toLowerCase()) && (
                    <div
                      onClick={() => addGuest({ name: guestInput.trim(), email: guestInput.trim(), avatar: avatarExample })}
                      className="px-3 py-2 cursor-pointer text-sm text-[#333] hover:bg-gray-50"
                    >
                      Add "{guestInput.trim()}"
                    </div>
                  )}
                </div>
              )}

              {/* Selected guests rendered as chips that flow left-to-right then wrap */}
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedGuests.map((g) => (
                  <div
                    key={g.email}
                    className="flex items-center gap-2 px-3 py-1 rounded-full border bg-gray-50"
                    style={{ alignItems: "center" }}
                  >
                    <img src={g.avatar} alt={g.name} className="w-6 h-6 rounded-full object-cover" />
                    <div className="text-sm text-[#444] max-w-[220px] truncate">{g.email}</div>
                    <button onClick={() => removeGuest(g.email)} className="ml-2 text-xs px-2 py-0">
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs text-[#55565B] mb-1">Location</label>
            <input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Location or link meetings"
              className="w-full border rounded-xl px-3 py-2 text-sm text-[#55565B]"
            />
          </div>

          <div className="mb-6">
            <label className="block text-xs text-[#55565B] mb-1">Project</label>
            <div style={{ maxWidth: 260 }}>
              <select
                value={form.project}
                onChange={(e) => setForm({ ...form, project: e.target.value })}
                className="w-full border rounded-xl px-3 py-2 text-sm text-[#55565B]"
              >
                <option value="">Project</option>
                <option value="project-a">Project A</option>
                <option value="project-b">Project B</option>
              </select>
            </div>
          </div>
        </div>

        {/* footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, padding: 12, borderTop: "1px solid #eee" }}>
          <button onClick={onClose} className="text-sm text-gray-700 px-3 py-1">
            Cancel
          </button>
          <button onClick={handleSave} className="text-sm px-3 py-1" style={{ background: "#B6252A", color: "#fff", borderRadius: 6 }}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
