"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import axiosClient from "../api/axiosClient";
import ProfileMenu from "../components/ProfileMenu";
import EventModal, { EventForm } from "../components/EventModal";


type UserShape = { photoURL?: string | null; name?: string | null } | null;

type ScheduleEvent = {
  id: string;
  title: string;
  date: string;
  participants: number;
  project: string;
  projectColor: string;
};

export type EventItem = {
  id?: string;
  date: string;
  startHour: number;
  startMinute?: number;
  endHour?: number;
  endMinute?: number;
  time?: string;
  title: string;
  description?: string;
  guest?: string;
  location?: string;
  project?: string;
};

export default function TaskPage({
  initialUser = null,
}: {
  initialUser?: { photoURL?: string; name?: string } | null;
}) {
  const router = useRouter();

  const [checkedAuth, setCheckedAuth] = useState(false);
  const [user, setUser] = useState<UserShape>(initialUser);
  const [filter, setFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);

  // FIXED — now events is state with setter
  const [events, setEvents] = useState<ScheduleEvent[]>([
    {
      id: "1",
      title: "Review",
      date: "01 November 2025",
      participants: 10,
      project: "Project A",
      projectColor: "#FCD34D",
    },
    {
      id: "2",
      title: "Meetings",
      date: "07 November 2025",
      participants: 7,
      project: "UI Teams",
      projectColor: "#60A5FA",
    },
    {
      id: "3",
      title: "Budget Review Meeting",
      date: "10 November 2025",
      participants: 15,
      project: "Telkom",
      projectColor: "#F472B6",
    },
    {
      id: "4",
      title: "Presentation",
      date: "10 November 2025",
      participants: 30,
      project: "Telkom",
      projectColor: "#F472B6",
    },
    {
      id: "5",
      title: "UI/UX Webinar",
      date: "06 November 2025",
      participants: 320,
      project: "UI Teams",
      projectColor: "#60A5FA",
    },
  ]);

  const menuRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  if (!checkedAuth) return <div className="p-6">Memeriksa autentikasi...</div>;

  const filteredEvents = events.filter((event) => {
    const matchesFilter = filter === "All" || event.project === filter;
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // ---- MODAL STATES ----
  

  const openEventModal = (ev?: EventItem | null) => {
    setEditingEvent(ev ?? null);
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setEditingEvent(null);
  };

  // ---- FIXED: Cleaner conversion ----
  const eventFormToItem = (form: EventForm, existing?: EventItem | null): EventItem => {
    const id = existing?.id ?? String(Date.now());

    const startParts = form.startTime
      ? form.startTime.split(":").map((n) => parseInt(n, 10))
      : [9, 0];

    const endParts = form.endTime
      ? form.endTime.split(":").map((n) => parseInt(n, 10))
      : [startParts[0] + 1, startParts[1]];

    return {
      id,
      date: form.date,
      startHour: startParts[0],
      startMinute: startParts[1],
      endHour: endParts[0],
      endMinute: endParts[1],
      time: `${startParts[0]}:${startParts[1]} - ${endParts[0]}:${endParts[1]}`,
      title: form.title || "(No title)",
      description: form.description,
      guest: form.guest,
      location: form.location,
      project: form.project,
    };
  };

  // ---- SAVE HANDLER FIXED ----
  const handleSaveFromModal = (data: EventForm) => {
    if (!data.date) {
      alert("Please choose a date");
      return;
    }

    const newItem = eventFormToItem(data, editingEvent);

    // helper to derive a color from project name (fallbacks can be adjusted)
    const mapProjectColor = (proj?: string) => {
      if (!proj) return "#888888";
      if (proj === "Project A") return "#FCD34D";
      if (proj === "UI Teams") return "#60A5FA";
      if (proj === "Telkom") return "#F472B6";
      return "#888888";
    };

    setEvents((prev) => {
      const id = newItem.id ?? String(Date.now());
      const found = prev.find((p) => p.id === id);

      // build a ScheduleEvent from the EventItem (newItem)
      const scheduleItem: ScheduleEvent = {
        id,
        title: newItem.title,
        date: newItem.date,
        participants: found?.participants ?? 1,
        project: newItem.project ?? found?.project ?? "General",
        projectColor: found?.projectColor ?? mapProjectColor(newItem.project),
      };

      if (found) {
        return prev.map((p) => (p.id === id ? scheduleItem : p));
      }
      return [...prev, scheduleItem];
    });

    closeModal();
  };
  const photo = user?.photoURL ?? null;
  const name = user?.name ?? "User";


  return (
    <div className="w-full h-full p-0 m-0">
     <div className="flex items-center justify-between bg-linear-to-r bg-white text-white px-6 py-4 rounded-[15px] shadow mb-[15px]">
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

      <div className="bg-white rounded-[15px] shadow p-6">
       {/* Filter and Search Bar */}
        <div className="flex items-center justify-end gap-4 mb-6">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All</option>
            <option value="Project A">Project A</option>
            <option value="UI Teams">UI Teams</option>
            <option value="Telkom">Telkom</option>
          </select>

          <div className="relative" style={{ width: "285px" }}>
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 pl-10 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <svg
              className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

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

        {/* Events List */}
        <div className="space-y-3">
          {filteredEvents.map((event) => (
            <div
              key={event.id}
              className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow relative"
            >
              {/* Left colored border */}
              <div
                className="absolute left-0 top-0 bottom-0 w-1 mt-5 mb-5 ml-[15px]"
                style={{ backgroundColor: event.projectColor }}
              ></div>

              <div className="flex items-center justify-between pl-3">
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-gray-900 mb-1">{event.title}</h3>
                  <p className="text-sm text-gray-500">{event.date}</p>
                </div>

                <div className="flex items-center gap-8">
                  <div className="flex items-center gap-2 pr-8 border-r border-gray-200">
                    <img src="/participants.svg" alt="Participants" className="w-6 h-6"/>
                   
                    <span className="text-sm text-gray-700">{event.participants} Participants</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: event.projectColor }}
                    ></div>
                    <span className="text-sm text-gray-700 font-medium">{event.project}</span>
                  </div>

                  <button className="px-4 py-2 text-sm font-medium text-[#337AF7] border border-[#337AF7] rounded-lg hover:bg-gray-50 transition-colors">
                    View Details
                  </button>

                  <button
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                    onClick={() => setOpenMenuId(openMenuId === event.id ? null : event.id)}
                  >
                    <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="5" r="2" />
                      <circle cx="12" cy="12" r="2" />
                      <circle cx="12" cy="19" r="2" />
                    </svg>
                  </button>
                 
                  {openMenuId === event.id && (
                    <div
                      ref={menuRef}
                      className="absolute right-4 top-14 z-50 shadow-gray-50"
                    >
                      {/* Arrow */}
                      <div className="w-4 h-5 bg-white absolute right-5 -top-2 rotate-45 rounded-tl-md shadow-black border"></div>

                      {/* Menu Box */}
                      <div className="bg-white shadow-lg border-l border-r border-b rounded-xl p-2 w-36 relative">
                        <button
                          className="flex items-center gap-3 px-3 py-3 hover:bg-gray-100 w-full text-left"
                          onClick={() => console.log('Edit', event.id)}
                        >
                          <img src="/edit.svg" className="w-5 h-5" />
                          <span className="text-sm text-gray-800">Edit</span>
                        </button>

                        <div className="border-t my-1" />

                        <button
                          className="flex items-center gap-3 px-3 py-3 hover:bg-gray-100 text-red-600 w-full text-left"
                          onClick={() => console.log('Delete', event.id)}
                        >
                          <img src="/delete.svg" className="w-5 h-5" />
                          <span className="text-sm">Delete</span>
                        </button>
                      </div>
                    </div>
                  )}



                </div>
                
              </div>
              
            </div>
            
          ))}

          {filteredEvents.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p>No events found</p>
            </div>
          )}
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
                startTime: `${String(editingEvent.startHour).padStart(2, "0")}:${String(
                  editingEvent.startMinute ?? 0
                ).padStart(2, "0")}`,
                endTime:
                  editingEvent.endHour !== undefined
                    ? `${String(editingEvent.endHour).padStart(2, "0")}:${String(
                        editingEvent.endMinute ?? 0
                      ).padStart(2, "0")}`
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