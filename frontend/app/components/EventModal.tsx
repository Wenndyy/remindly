// components/EventModal.tsx
"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import axiosClient from "../api/axiosClient";
import Toast, { useToast } from "./Toast";

export type EventForm = {
  id?: number;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  guest: string;
  location: string;
  projectId?: number | null;
  projectName?: string;
};

type User = {
  id?: number;
  full_name?: string | null;
  email: string;
  profile_picture?: string | null;
};

type Project = {
  id: number;
  name: string;
  color?: string | null;
  meetings?: number;
};

// Move debounce outside component to prevent recreation
function debounce(fn: (q: string) => void, wait = 300): (q: string) => void {
  let t: ReturnType<typeof setTimeout> | null = null;
  return (q: string) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(q), wait);
  };
}

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
    startDate: "",
    endDate: "",
    startTime: "",
    endTime: "",
    allDay: false,
    guest: "",
    location: "",
    projectId: undefined,
    projectName: "",
  };

  const avatarExample = "/person.svg";

  const [form, setForm] = useState<EventForm>(empty);

  // dynamic users for suggestions
  const [remoteUsers, setRemoteUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [guestInput, setGuestInput] = useState("");
  const [selectedGuests, setSelectedGuests] = useState<User[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // projects
  const [projects, setProjects] = useState<Project[]>([]);
  const [projDropdownOpen, setProjDropdownOpen] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const projRef = useRef<HTMLDivElement | null>(null);

  const [discardOpen, setDiscardOpen] = useState(false);

  // Toast for success/error feedback
  const { toast, showToast, hideToast } = useToast();

  // Stabilize fetchUsers with useCallback
  const fetchUsers = useCallback(async (q: string) => {
    setUsersLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
      const url = q ? `/users?query=${encodeURIComponent(q)}&limit=10` : `/users?limit=10`;
      const res = await axiosClient.get<User[]>(url, config);
      setRemoteUsers(res.data || []);
    } catch (err) {
      console.error("Failed fetching users:", err);
      setRemoteUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  // Create stable debounced function that only depends on the stable fetchUsers ref
  const debouncedFetch = useMemo(() => debounce((q: string) => {
    fetchUsers(q);
  }, 250), [fetchUsers]);


  useEffect(() => {
    if (!open) return;
    let mounted = true;
    const load = async () => {
      setLoadingProjects(true);
      try {
        const token = localStorage.getItem("access_token");
        const config = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
        const res = await axiosClient.get<Project[]>("/projects", config);
        if (!mounted) return;
        setProjects(res.data || []);
      } catch (err) {
        console.error("Failed to load projects:", err);
        setProjects([]);
      } finally {
        if (mounted) setLoadingProjects(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [open]);


  useEffect(() => {
    if (initial) {
      setForm((s) => ({
        ...s,
        ...initial,
        projectId: (initial as any).projectId ?? (initial as any).project_id ?? undefined,
        projectName: (initial as any).projectName ?? (initial as any).project ?? "",
      }));
      if ((initial as any).guest) {
        const emails = (initial as any).guest
          .split(",")
          .map((e: string) => e.trim())
          .filter(Boolean);
        const pre = emails.map((em: string) => ({ email: em, full_name: em, profile_picture: avatarExample }));
        setSelectedGuests(pre);
      }
    } else {
      setForm(empty);
      setSelectedGuests([]);
      setGuestInput("");
      setRemoteUsers([]);
    }
  }, [initial, open]);

  useEffect(() => {
    const q = guestInput.trim();
    if (!q) {
      setRemoteUsers([]);
      setShowSuggestions(false);
      return;
    }
    setShowSuggestions(true);
    debouncedFetch(q);
  }, [guestInput]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
      if (projRef.current && !projRef.current.contains(e.target as Node)) {
        setProjDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function addGuestFromUser(u: User) {
    setSelectedGuests((s) => [...s, { email: u.email, full_name: u.full_name ?? u.email, profile_picture: u.profile_picture }]);
    setGuestInput("");
    setShowSuggestions(false);
    setRemoteUsers((r) => r.filter((x) => x.email !== u.email));
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function addGuestByEmail(email: string) {
    const normalized = email.trim();
    if (!normalized) return;
    const isEmailLike = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
    const userObj: User = { email: normalized, full_name: isEmailLike ? normalized : normalized, profile_picture: avatarExample };
    setSelectedGuests((s) => [...s, userObj]);
    setGuestInput("");
    setShowSuggestions(false);
    setRemoteUsers((r) => r.filter((x) => x.email !== normalized));
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function removeGuest(email: string) {
    setSelectedGuests((s) => s.filter((g) => g.email !== email));
  }

  function handleGuestKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && guestInput.trim()) {
      const exact = remoteUsers.find((u) => u.email.toLowerCase() === guestInput.trim().toLowerCase());
      if (exact) addGuestFromUser(exact);
      else addGuestByEmail(guestInput.trim());
      e.preventDefault();
    } else if (e.key === "Backspace" && !guestInput && selectedGuests.length) {
      setSelectedGuests((s) => s.slice(0, -1));
    }
  }

  // Today's date string for date input min attribute
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  function isTimeGreater(t1: string, t2: string) {
    return t1.localeCompare(t2) === 1;
  }

  function isTimeLess(t1: string, t2: string) {
    return t1.localeCompare(t2) === -1;
  }


  async function handleSave() {
    // Get fresh date/time values at save time to avoid stale comparisons
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const currentHH = now.getHours().toString().padStart(2, "0");
    const currentMM = now.getMinutes().toString().padStart(2, "0");
    const currentTime = `${currentHH}:${currentMM}`;

    if (!form.title.trim()) {
      alert("Title is required");
      return;
    }
    if (!form.startDate) {
      alert("Start date is required");
      return;
    }


    if (form.allDay) {

      if (form.startDate < todayStr) {
        alert("Start date cannot be before today");
        return;
      }

      if (!form.endDate) {
        alert("End date is required");
        return;
      }
      if (form.endDate < form.startDate) {
        alert("End date cannot be before start date");
        return;
      }

    } else {

      if (form.startDate < todayStr) {
        alert("Start date cannot be before today");
        return;
      }


      if (!form.startTime || !form.endTime) {
        alert("Start time and end time are required");
        return;
      }

      // Only check time if event is TODAY
      if (form.startDate === todayStr) {
        if (!isTimeGreater(form.startTime, currentTime)) {
          alert("Start time must be greater than current time");
          return;
        }
      }

      if (isTimeLess(form.endTime, form.startTime)) {
        alert("End time cannot be earlier than start time");
        return;
      }
    }

    const payload: any = {
      title: form.title,
      description: form.description,
      start_date: form.startDate,
      end_date: form.allDay ? form.endDate : form.startDate,
      start_time: form.allDay ? "00:00" : form.startTime,
      end_time: form.allDay ? "23:59" : form.endTime,
      all_day: form.allDay,
      guest: selectedGuests.map((g) => g.email).join(","),
      location: form.location,
    };

    if (form.projectId) payload.project_id = form.projectId;
    else payload.project_id = null;

    try {
      const token = localStorage.getItem("access_token");
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
      let res;
      if (initial?.id) {
        res = await axiosClient.put(`/events/${initial.id}`, payload, config);
      } else {
        res = await axiosClient.post("/events", payload, config);
      }

      const data = res.data || {};
      const normalized: EventForm = {
        id: data.id ?? data.event_id ?? initial?.id,
        title: data.title ?? form.title,
        description: data.description ?? form.description,
        startDate: data.start_date ?? form.startDate,
        endDate: data.end_date ?? form.endDate,
        startTime: data.start_time ?? form.startTime,
        endTime: data.end_time ?? form.endTime,
        allDay: data.all_day ?? form.allDay,
        guest: data.guest ?? selectedGuests.map((g) => g.email).join(","),
        location: data.location ?? form.location,
        projectId: data.project_id ?? form.projectId ?? null,
        projectName: data.project_name ?? form.projectName ?? "",
      };

      showToast(initial?.id ? "Event updated successfully!" : "Event created successfully!", "success");

      // Delay close to show toast
      setTimeout(() => {
        onSave(normalized);
        onClose();
      }, 1000);
    } catch (error: any) {
      console.error("Error saving event:", error.response?.data || error.message);
      showToast(error.response?.data?.detail || "Failed to save event. Please try again.", "error");
    }
  }


  function isDirty() {
    const base = initial ? { ...empty, ...initial } : empty;
    const baseGuest = base.guest ? base.guest.split(",").map((g) => g.trim()).filter(Boolean).join(",") : "";
    const curGuest = selectedGuests.map((g) => g.email).join(",");
    return (
      form.title !== base.title ||
      form.description !== base.description ||
      form.startDate !== base.startDate ||
      form.endDate !== base.endDate ||
      form.startTime !== base.startTime ||
      form.endTime !== base.endTime ||
      form.allDay !== base.allDay ||
      curGuest !== baseGuest ||
      form.location !== base.location ||
      form.projectId !== base.projectId ||
      form.projectName !== base.projectName
    );
  }

  function handleCancelClick() {
    if (isDirty()) {
      setDiscardOpen(true);
    } else {
      onClose();
    }
  }

  function handleDiscardConfirm() {
    setDiscardOpen(false);
    onClose();
    setTimeout(() => {
      setForm(empty);
      setSelectedGuests([]);
      setGuestInput("");
    }, 0);
  }

  const isTailwindBg = (c?: string | null) => typeof c === "string" && /^bg-[a-z0-9-]+$/.test(c);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-start justify-center p-6">
        <div className="absolute inset-0 bg-black/40" onClick={handleCancelClick} />

        <div
          className="relative bg-white rounded-lg shadow-xl overflow-hidden"
          style={{ width: 760, maxWidth: "95%", maxHeight: "90%", display: "flex", flexDirection: "column" }}
          role="dialog"
          aria-modal="true"
        >
          <div style={{ background: "linear-gradient(90deg,#8b1b1f,#5a0e12)", color: "#fff", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{initial ? "Edit Event" : "Add Event"}</div>
            <button onClick={handleCancelClick} style={{ color: "#fff", background: "transparent", border: "none", fontSize: 18 }}>✕</button>
          </div>

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

            {!form.allDay ? (
              <div className="grid grid-cols-2 gap-4 mb-4 items-end">
                <div>
                  <label className="block text-xs text-[#55565B] mb-1">Date</label>
                  <input
                    type="date"
                    value={form.startDate}
                    min={todayStr}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
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
                    <span className="mx-3 text-sm text-[#888]" aria-hidden>—</span>
                    <div className="flex flex-col">
                      <input
                        type="time"
                        value={form.endTime}
                        min={form.startTime}
                        onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                        className={`border rounded-xl px-2 py-2 text-sm text-[#55565B] ${form.endTime && form.startTime && form.endTime < form.startTime
                          ? "border-red-500"
                          : ""
                          }`}
                        style={{ width: 120 }}
                      />

                      {form.endTime && form.startTime && form.endTime < form.startTime && (
                        <span className="text-red-500 text-xs mt-1">
                          End time cannot be earlier than start time
                        </span>
                      )}
                    </div>


                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 mb-4 items-end">
                <div>
                  <label className="block text-xs text-[#55565B] mb-1">Start Date</label>
                  <input
                    type="date"
                    min={todayStr}
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full border rounded-xl px-2 py-2 text-sm text-[#55565B]"
                  />
                </div>

                <div>
                  <label className="block text-xs text-[#55565B] mb-1">End Date</label>
                  <input
                    type="date"
                    value={form.endDate}
                    min={form.startDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full border rounded-xl px-2 py-2 text-sm text-[#55565B]"
                  />
                </div>
              </div>
            )}

            <div className="mb-4 flex items-center gap-4">
              <label className="flex items-center cursor-pointer select-none">
                <input
                  id="allday"
                  type="checkbox"
                  className="sr-only"
                  checked={form.allDay}
                  onChange={() => setForm((s) => ({ ...s, allDay: !s.allDay }))}
                />
                <div aria-hidden className={`w-12 h-7 rounded-full p-[3px] relative transition-colors ${form.allDay ? "bg-[#B6252A]" : "bg-[#e6e6e6]"}`} style={{ boxShadow: "inset 0 1px 2px rgba(0,0,0,0.06)" }}>
                  <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${form.allDay ? "translate-x-[18px]" : "translate-x-0"}`} style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }} />
                </div>
                <span className="ml-3 text-sm text-[#55565B]">All Day</span>
              </label>
            </div>

            {/* Guest input + suggestions */}
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
                      placeholder="Type email or name, press Enter to add"
                      className="w-full text-sm outline-none bg-transparent"
                    />
                  </div>
                </div>

                {showSuggestions && (
                  <div className="mt-2 bg-white border rounded-lg shadow-md overflow-hidden z-50" style={{ maxWidth: 520 }}>
                    {usersLoading && <div className="px-3 py-2 text-sm text-gray-500">Searching...</div>}

                    {!usersLoading && remoteUsers.length === 0 && guestInput.trim() && (
                      <div
                        onClick={() => addGuestByEmail(guestInput)}
                        className="px-3 py-2 cursor-pointer text-sm text-[#333] hover:bg-gray-50"
                      >
                        Add "{guestInput.trim()}" as guest
                      </div>
                    )}

                    {remoteUsers.map((u) => (
                      <div
                        key={u.email}
                        onClick={() => addGuestFromUser(u)}
                        className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50"
                      >
                        <img src={u.profile_picture ?? avatarExample} alt={u.full_name ?? u.email} className="w-8 h-8 rounded-full object-cover" />
                        <div>
                          <div className="text-sm font-medium text-[#222]">{u.full_name ?? u.email}</div>
                          <div className="text-xs text-[#666]">{u.email}</div>
                        </div>
                      </div>
                    ))}

                    {!usersLoading && remoteUsers.length > 0 && guestInput.trim() && !remoteUsers.some((x) => x.email.toLowerCase() === guestInput.trim().toLowerCase()) && (
                      <div
                        onClick={() => addGuestByEmail(guestInput)}
                        className="px-3 py-2 cursor-pointer text-sm text-[#333] hover:bg-gray-50"
                      >
                        Add "{guestInput.trim()}" as guest
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedGuests.map((g) => (
                    <div key={g.email} className="flex items-center gap-2 px-3 py-1 rounded-full border bg-gray-50">
                      <img src={g.profile_picture ?? avatarExample} alt={g.full_name ?? g.email} className="w-6 h-6 rounded-full object-cover" />
                      <div className="text-sm text-[#444] max-w-[220px] truncate">{g.email}</div>
                      <button onClick={() => removeGuest(g.email)} className="ml-2 text-xs px-2 py-0">✕</button>
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
              <div style={{ maxWidth: 320 }} ref={projRef} className="relative">
                <button
                  type="button"
                  onClick={() => setProjDropdownOpen((s) => !s)}
                  className="w-full border rounded-xl px-3 py-2 text-sm text-[#55565B] flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    {(() => {
                      const raw =
                        (form.projectId && projects.find((p) => p.id === form.projectId)?.color) ||
                        (form.projectName && projects.find((p) => p.name === form.projectName)?.color) ||
                        "#E5E7EB";

                      if (isTailwindBg(raw)) {
                        return <div className={`w-3 h-3 rounded-full ${raw}`} />;
                      }
                      return <div className="w-3 h-3 rounded-full" style={{ backgroundColor: raw }} />;
                    })()}

                    <span className="truncate">
                      {form.projectId ? projects.find((p) => p.id === form.projectId)?.name : form.projectName || "No project"}
                    </span>
                  </div>

                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {projDropdownOpen && (
                  <div className="absolute z-50 mt-2 w-full bg-white border rounded-xl shadow-lg max-h-48 overflow-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setForm({ ...form, projectId: null, projectName: "" });
                        setProjDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-transparent border" />
                        <span className="text-sm text-[#444]">No project</span>
                      </div>
                    </button>

                    {loadingProjects && <div className="px-3 py-2 text-sm text-gray-500">Loading projects...</div>}

                    {projects.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setForm({ ...form, projectId: p.id, projectName: p.name });
                          setProjDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-3"
                      >
                        {typeof p.color === "string" && isTailwindBg(p.color) ? (
                          <div className={`w-3 h-3 rounded-full ${p.color}`} />
                        ) : (
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color ?? "#E5E7EB" }} />
                        )}

                        <div>
                          <div className="text-sm text-[#222]">{p.name}</div>
                          <div className="text-xs text-[#666]">{p.meetings ?? 0} meetings</div>
                        </div>
                      </button>
                    ))}

                    {projects.length === 0 && !loadingProjects && (
                      <div className="px-3 py-2 text-sm text-gray-500">No projects available</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, padding: 12, borderTop: "1px solid #eee" }}>
            <button onClick={handleCancelClick} className="text-sm text-gray-700 px-3 py-1">Cancel</button>
            <button onClick={handleSave} className="text-sm px-3 py-1" style={{ background: "#B6252A", color: "#fff", borderRadius: 6 }}>Save</button>
          </div>
        </div>
      </div>

      {discardOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDiscardOpen(false)} />

          <div className="relative bg-white rounded-lg shadow-xl overflow-hidden w-[640px] max-w-full">
            <div className="p-6">
              <h3 className="text-lg font-bold mb-2 text-black">Discard Unsaved Changes?</h3>
              <p className="text-[16px] text-[#55565B] mb-4">Your unsaved change will be discarded.</p>

              <div className="flex justify-end gap-3">
                <button onClick={() => setDiscardOpen(false)} className="px-4 py-2 rounded bg-[#E9EDE9] text-black text-sm">Cancel</button>
                <button onClick={handleDiscardConfirm} className="px-4 py-2 rounded bg-[#B6252A] text-white text-sm">Discard</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </>
  );
}
