"use client";

import { useState, useEffect, useRef, Key } from "react";
import { useRouter } from "next/navigation";
import axiosClient from "../api/axiosClient";

import EventModal, { EventForm } from "../components/EventModal";
import Header from "../components/Header";
import { EventForConflictCheck } from "../utils/conflictDetection";

type UserShape = { photoURL?: string | null; name?: string | null } | null;

type ScheduleEvent = {
  id: string;
  title: string;
  dateStart: string;
  dateEnd?: string;
  startTime?: string;
  endTime?: string;
  allDay?: boolean;
  participants: number;
  project: string;
  projectColor?: string;
  projectColorClass?: string;
};

export type EventItem = {
  id?: string;
  dateStart?: string;
  dateEnd?: string;
  startHour?: number;
  startMinute?: number;
  endHour?: number;
  endMinute?: number;
  allDay?: boolean;
  time?: string;
  title: string;
  description?: string;
  guest?: string;
  location?: string;
  meetingType?: "onsite" | "online";
  project?: string;
  projectId?: number | null;
  projectColor?: string;
};

type Project = {
  id: number;
  name: string;
  color?: string | null;
  meetings?: number;
};

// Helper to resolve image URL
const getImageUrl = (url?: string | null): string | null => {
  if (!url) return null;
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:")
  ) {
    return url;
  }
  return `http://127.0.0.1:8000${url}`;
};

// Helper to get initials from name or email
const getInitials = (name: string | null | undefined, email?: string): string => {
  const source = name || email || "?";
  const parts = source.trim().split(/\s+/);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0] ? parts[0][0].toUpperCase() : "?";
};


export default function TaskPage({
  initialUser = null,
}: {
  initialUser?: { photoURL?: string; name?: string } | null;
}) {
  const router = useRouter();

  const [checkedAuth, setCheckedAuth] = useState(false);
  const [user, setUser] = useState<UserShape>(initialUser);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filter, setFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [originalEventData, setOriginalEventData] = useState<EventItem | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
  const [eventDetails, setEventDetails] = useState<any>(null);

  // Multi-select state
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

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

  const formatDate = (dateString: string) => {
    if (!dateString) return "Not specified";

    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    };
    return date.toLocaleDateString('id-ID', options);
  };

  const formatDisplayDate = (startDate: string, endDate?: string) => {
    if (!startDate) return "Not specified";

    const start = new Date(startDate);

    if (!endDate || startDate === endDate) {
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      };
      return start.toLocaleDateString('en-US', options);
    }

    const end = new Date(endDate);


    const startOptions: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    };

    const endOptions: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    };

    const startFormatted = start.toLocaleDateString('en-US', startOptions);
    const endFormatted = end.toLocaleDateString('en-US', endOptions);

    return `${startFormatted} - ${endFormatted}`;
  };


  const formatTimeDisplay = (startTime?: string, endTime?: string) => {
    if (!startTime) return "Not specified";

    const formatTime = (timeString: string) => {
      const time = new Date(`2000-01-01T${timeString}`);
      return time.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    };

    if (endTime) {
      return `${formatTime(startTime)} - ${formatTime(endTime)}`;
    }

    return formatTime(startTime);
  };


  const calculateDuration = (startTime?: string, endTime?: string) => {
    if (!startTime || !endTime) return "";

    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    const diffMs = end.getTime() - start.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 0) {
      return `(${diffHours}h${diffMinutes > 0 ? ` ${diffMinutes}m` : ''})`;
    }

    return `(${diffMinutes}m)`;
  };

  const mapApiEventToSchedule = (ev: any, projects: Project[]): ScheduleEvent => {
    const projectName = ev.project_name || "General";

    const project = projects.find(p => p.id === ev.project_id);
    const projectColorClass = project?.color || "bg-gray-300";


    const participants = ev.participants ?? ev.attendees_count ?? ev.guest_count ?? 0;

    return {
      id: String(ev.id),
      title: ev.title,
      dateStart: ev.start_date,
      dateEnd: ev.end_date,
      startTime: ev.start_time || '',
      endTime: ev.end_time || '',
      allDay: ev.all_day || false,
      participants: Number(participants),
      project: projectName,
      projectColorClass,
    };
  };

  const loadInitialData = async () => {
    if (typeof window === "undefined") return;

    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      setIsLoading(true);

      const userRes = await axiosClient.get("/me");
      setUser({
        name: userRes.data.full_name ?? userRes.data.email ?? "User",
        photoURL: userRes.data.profile_picture ?? null,
      });
      setCheckedAuth(true);

      const config = { headers: { Authorization: `Bearer ${token}` } };

      const projRes = await axiosClient.get<Project[]>("/projects", config);
      const projectsList = projRes.data || [];
      setProjects(projectsList);

      const evRes = await axiosClient.get("/events", config);
      const data = Array.isArray(evRes.data) ? evRes.data : [];
      const mappedEvents = data.map((ev) => mapApiEventToSchedule(ev, projectsList));
      setEvents(mappedEvents);

    } catch (err) {
      console.error("Failed to load initial data:", err);
      localStorage.removeItem("access_token");
      router.replace("/login");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();

    // Listen for updates from FloatingAIChat
    const handleEventsUpdated = () => {
      reloadEvents();
    };

    window.addEventListener('events-updated', handleEventsUpdated);
    return () => {
      window.removeEventListener('events-updated', handleEventsUpdated);
    };
  }, [router]);

  const reloadEvents = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const evRes = await axiosClient.get("/events", config);
      const data = Array.isArray(evRes.data) ? evRes.data : [];
      const mappedEvents = data.map((ev) => mapApiEventToSchedule(ev, projects));
      setEvents(mappedEvents);
    } catch (err) {
      console.error("Failed to reload events:", err);
    }
  };

  const loadEventDetails = async (eventId: string) => {
    try {
      const response = await axiosClient.get(`/events/${eventId}`);
      const raw = response.data;
      const event = {
        id: raw.id,
        title: raw.title,
        description: raw.description,
        start_date: raw.start_date,
        end_date: raw.end_date,
        start_time: raw.start_time,
        end_time: raw.end_time,
        all_day: raw.all_day,
        location: raw.location,
        meeting_type: raw.meeting_type,
        participants: raw.participants,
        guest_list: raw.guest_list || [],
        invitedBy: raw.organizer_name || raw.organizer_email,
        organizer_name: raw.organizer_name,
        organizer_profile_picture: raw.organizer_profile_picture,
        project_id: raw.project_id,
        project_name: raw.project_name,
        project_color: raw.project_color,
        time_display: raw.time_display,
        created_at: raw.created_at,
        updated_at: raw.updated_at,
      };

      setEventDetails(event);
    } catch (err) {
      console.error("Failed to load event details:", err);
    }
  };



  const openEventDetails = async (event: ScheduleEvent) => {
    setSelectedEvent(event);
    await loadEventDetails(event.id);
    setShowDetailsModal(true);
  };

  const closeEventDetails = () => {
    setShowDetailsModal(false);
    setSelectedEvent(null);
    setEventDetails(null);
  };

  const filteredEvents = events.filter((event) => {
    const matchesFilter = filter === "All" || event.project === filter;
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const openEventModal = async (ev?: EventItem | null) => {
    try {
      if (ev?.id) {
        // Fetch detail event dari API
        const response = await axiosClient.get(`/events/${ev.id}`);
        const eventDetails = response.data;

        console.log("Event details for editing:", eventDetails);

        // Format data untuk modal - GUNAKAN PROPERTY YANG SESUAI DENGAN TYPE
        const eventData: EventItem = {
          id: eventDetails.id,
          title: eventDetails.title,
          description: eventDetails.description || "",
          dateStart: eventDetails.start_date, // GUNAKAN dateStart, BUKAN startDate
          dateEnd: eventDetails.end_date || eventDetails.start_date, // GUNAKAN dateEnd, BUKAN endDate
          startHour: eventDetails.start_time ? parseInt(eventDetails.start_time.split(':')[0]) : undefined,
          startMinute: eventDetails.start_time ? parseInt(eventDetails.start_time.split(':')[1]) : undefined,
          endHour: eventDetails.end_time ? parseInt(eventDetails.end_time.split(':')[0]) : undefined,
          endMinute: eventDetails.end_time ? parseInt(eventDetails.end_time.split(':')[1]) : undefined,
          allDay: eventDetails.all_day || false,
          guest: eventDetails.guest || "",
          location: eventDetails.location || "",
          meetingType: eventDetails.meeting_type || "onsite",
          project: eventDetails.project_name || "",
          projectId: eventDetails.project_id || null,
        };

        setEditingEvent(eventData);
        setOriginalEventData(eventData);
      } else {
        // Untuk event baru
        const today = new Date().toISOString().split('T')[0];
        setEditingEvent({
          title: "",
          description: "",
          dateStart: today, // GUNAKAN dateStart
          dateEnd: today, // GUNAKAN dateEnd
          allDay: false,
          guest: "",
          location: "",
          meetingType: "onsite",
          project: "",
          projectId: null,
        });
        setOriginalEventData(null);
      }
      setModalOpen(true);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Error loading event details:", error);

      // Fallback
      // Fallback
      if (ev) {

        const proj = projects.find((p) => p.name === ev.project);
        const eventData: EventItem = {
          ...ev,
          project: ev.project ?? (proj?.name ?? ""),
          projectId: proj?.id ?? ev.projectId ?? null,
        };
        setEditingEvent(eventData);
        setOriginalEventData(eventData);
      } else {

        const today = new Date().toISOString().split('T')[0];
        setEditingEvent({
          title: "",
          description: "",
          dateStart: today,
          dateEnd: today,
          allDay: false,
          guest: "",
          location: "",
          project: "",
          projectId: null,
        });
        setOriginalEventData(null);
      }
      setModalOpen(true);
      setHasUnsavedChanges(false);
    }
  };

  const closeModal = () => {
    if (hasUnsavedChanges) {
      setShowCancelConfirm(true);
    } else {
      setModalOpen(false);
      setEditingEvent(null);
      setOriginalEventData(null);
      setHasUnsavedChanges(false);
    }
  };

  const handleDiscardChanges = () => {
    setModalOpen(false);
    setEditingEvent(null);
    setOriginalEventData(null);
    setHasUnsavedChanges(false);
    setShowCancelConfirm(false);
  };

  const handleSaveFromModal = async (data: EventForm) => {
    if (!data.title?.trim()) {
      alert("Please enter event title");
      return;
    }

    if (!data.startDate) {
      alert("Please choose a date");
      return;
    }

    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        router.replace("/login");
        return;
      }

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };

      const payload: any = {
        title: data.title.trim(),
        description: data.description?.trim() || null,
        start_date: data.startDate,
        end_date: data.endDate || data.startDate,
        start_time: data.startTime || null,
        end_time: data.endTime || null,
        all_day: data.allDay || false,
        guest: data.guest?.trim() || null,
        location: data.location?.trim() || null,
        meeting_type: data.meetingType || "onsite",
        project_id: data.projectId || null,
      };

      let response;

      if (data.id) {
        response = await axiosClient.put(`/events/${data.id}`, payload, config);
      } else {
        response = await axiosClient.post("/events", payload, config);
      }

      await reloadEvents();
      setModalOpen(false);
      setEditingEvent(null);
      setOriginalEventData(null);
      setHasUnsavedChanges(false);

      console.log("Event saved successfully:", response.data);

    } catch (err: any) {
      console.error("Failed to save event:", err);
      const errorMessage = err?.response?.data?.detail
        || err?.response?.data?.message
        || err?.message
        || "Gagal menyimpan event";
      alert(errorMessage);
    }
  };

  const fallback = "/person.svg";
  // Delete confirmation handlers
  const openDeleteConfirm = (eventId: string) => {
    setEventToDelete(eventId);
    setShowDeleteConfirm(true);
    setOpenMenuId(null);
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setEventToDelete(null);
  };

  const confirmDeleteEvent = async () => {
    if (!eventToDelete) return;

    try {
      const token = localStorage.getItem("access_token");
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;

      await axiosClient.delete(`/events/${eventToDelete}`, config);
      await reloadEvents();

      setShowDeleteConfirm(false);
      setEventToDelete(null);

    } catch (err: any) {
      console.error("Failed to delete event:", err);
      const errorMessage = err?.response?.data?.detail
        || err?.response?.data?.message
        || "Gagal menghapus event";
      alert(errorMessage);
      setShowDeleteConfirm(false);
      setEventToDelete(null);
    }
  };

  // Multi-select handlers
  const toggleSelectMode = () => {
    setIsSelectMode(!isSelectMode);
    setSelectedEventIds(new Set());
  };

  const toggleEventSelection = (eventId: string) => {
    setSelectedEventIds(prev => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  const selectAllEvents = () => {
    if (selectedEventIds.size === filteredEvents.length) {
      setSelectedEventIds(new Set());
    } else {
      setSelectedEventIds(new Set(filteredEvents.map(e => e.id)));
    }
  };

  const confirmBulkDelete = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;

      for (const id of selectedEventIds) {
        await axiosClient.delete(`/events/${id}`, config);
      }

      await reloadEvents();
      setSelectedEventIds(new Set());
      setShowBulkDeleteConfirm(false);
      setIsSelectMode(false);
    } catch (err: any) {
      console.error("Failed to bulk delete events:", err);
      alert("Gagal menghapus beberapa event");
    }
  };

  const photo = user?.photoURL ?? null;
  const name = user?.name ?? "User";

  if (!checkedAuth || isLoading) {
    return <div className="p-6">Memeriksa autentikasi...</div>;
  }

  return (
    <div className="w-full h-full p-0 m-0">
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg p-6 w-[370px] h-[198px] shadow-lg text-center">
            <h3 className="text-2xl font-semibold mb-2 text-black">Delete?</h3>
            <p className="text-[16px] text-[#55565B] mb-6">Are you sure want to delete this Event?</p>

            <div className="flex justify-center gap-4">
              <button
                onClick={cancelDelete}
                className="px-6 py-2 rounded-lg text-black bg-[#E9EDE9] w-[148px] items-center justify-center flex"
              >
                Cancel
              </button>

              <button
                onClick={confirmDeleteEvent}
                className="px-6 py-2 rounded-lg text-white w-[148px] items-center justify-center flex"
                style={{ background: '#B6252A' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg p-6 w-[370px] shadow-lg text-center">
            <h3 className="text-2xl font-semibold mb-2 text-black">Delete {selectedEventIds.size} Events?</h3>
            <p className="text-[16px] text-[#55565B] mb-6">
              Are you sure you want to delete {selectedEventIds.size} selected events? This action cannot be undone.
            </p>

            <div className="flex justify-center gap-4">
              <button
                onClick={() => setShowBulkDeleteConfirm(false)}
                className="px-6 py-2 rounded-lg text-black bg-[#E9EDE9] w-[148px] items-center justify-center flex"
              >
                Cancel
              </button>

              <button
                onClick={confirmBulkDelete}
                className="px-6 py-2 rounded-lg text-white w-[148px] items-center justify-center flex"
                style={{ background: '#B6252A' }}
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg p-6 w-[627px] shadow-lg">
            <h3 className="text-2xl font-semibold mb-2 text-black">Discard Unsaved Changes?</h3>
            <p className="text-l text-[#55565B] mb-6">Your unsaved change will be discarded.</p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="px-4 py-2 rounded-lg text-black bg-[#E9EDE9] w-[89px] items-center justify-center flex"
              >
                Cancel
              </button>

              <button
                onClick={handleDiscardChanges}
                className="px-4 py-2 rounded-lg text-white w-[89px] items-center justify-center flex"
                style={{ background: '#B6252A' }}
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event Details Modal */}
      {showDetailsModal && eventDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60">
          <div className="bg-white rounded-2xl p-6 w-[92%] max-w-md shadow-xl">
            {/* Back / Title row (mirip gambar) */}
            <div className="flex items-center gap-4 mb-4">
              <button onClick={closeEventDetails} className="p-1 rounded-full hover:bg-gray-100">
                <svg className="w-5 h-5 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="text-xl font-medium text-gray-800">Event Details</h2>
            </div>

            {/* Review title & invited by */}
            <div className="mb-4">
              <h3 className="text-2xl font-bold text-gray-900 mt-6">Review</h3>
              <div className="flex items-center gap-2 mt-4">
                <span className="text-sm text-gray-500">Invited by:</span>
                {(() => {
                  const organizerName = eventDetails.organizer_name ?? eventDetails.invitedBy ?? eventDetails.invited_by ?? eventDetails.organizer ?? eventDetails.host ?? "Unknown";
                  const organizerPhoto = eventDetails.organizer_profile_picture;

                  return (
                    <div className="flex items-center gap-2">
                      {organizerPhoto ? (
                        <img
                          src={getImageUrl(organizerPhoto) || ""}
                          alt={organizerName}
                          className="w-6 h-6 rounded-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      {!organizerPhoto && (
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs text-white font-semibold"
                          style={{ backgroundColor: '#6B7280' }}
                        >
                          {getInitials(organizerName, undefined)}
                        </div>
                      )}
                      <span className="text-gray-700 font-medium">{organizerName}</span>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Info rows */}
            <div className="space-y-4 text-gray-700 mt-5">
              {/* Date */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <img src="/date.svg" alt="Date" />

                </div>
                <div>
                  <div className="text-sm text-gray-500">Date</div>
                  <div className="text-gray-900 font-medium">
                    {formatDisplayDate(
                      eventDetails.date ??
                      eventDetails.start_date ??
                      eventDetails.startDate ??
                      eventDetails.start, eventDetails.end_date ?? eventDetails.endDate ?? eventDetails.end
                    )}
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                  <img src="/location.svg" alt="Location" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">Location</div>
                  <div className="text-gray-900 font-medium">
                    {eventDetails.location ?? eventDetails.venue ?? "Not specified"}
                  </div>
                </div>
              </div>

              {/* Meeting Type */}
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${eventDetails.meeting_type === 'online' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'
                  }`}>
                  {eventDetails.meeting_type === 'online' ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                  )}
                </div>
                <div>
                  <div className="text-sm text-gray-500">Meeting Type</div>
                  <div className="text-gray-900 font-medium capitalize">
                    {eventDetails.meeting_type || "Onsite"}
                  </div>
                </div>
              </div>

              {/* Time */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                  <img src="/time.svg" alt="Time" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">Time</div>
                  <div className="text-gray-900 font-medium">
                    {formatTimeDisplay(
                      eventDetails.start_time ?? eventDetails.start_time_local ?? eventDetails.startTime,
                      eventDetails.end_time ?? eventDetails.end_time_local ?? eventDetails.endTime
                    )}
                    <span className="text-gray-500 ml-2">
                      {calculateDuration(
                        eventDetails.start_time ?? eventDetails.start_time_local ?? eventDetails.startTime,
                        eventDetails.end_time ?? eventDetails.end_time_local ?? eventDetails.endTime
                      )}
                    </span>
                  </div>
                </div>
              </div>


              <div className="flex items-start gap-3">
                <div className="flex-1">

                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-3">
                      {(() => {
                        const guestsArray =
                          eventDetails.guest_list && Array.isArray(eventDetails.guest_list) ? eventDetails.guest_list :
                            eventDetails.guests && Array.isArray(eventDetails.guests) ? eventDetails.guests :
                              eventDetails.attendees && Array.isArray(eventDetails.attendees) ? eventDetails.attendees :
                                [];

                        const totalParticipants = eventDetails.participants ?? guestsArray.length;
                        const displayGuests = guestsArray.slice(0, 3);

                        return (
                          <>
                            {displayGuests.length > 0 ? (
                              <>
                                <div className="flex -space-x-3">
                                  {displayGuests.map((guest: { name?: any; full_name?: any; email: any; photo?: any; profile_picture?: any; }, index: Key | null | undefined) => {
                                    const guestName = typeof guest === 'string' ? guest :
                                      guest?.full_name ?? guest?.name ?? guest?.email ?? 'Guest';
                                    const guestEmail = typeof guest === 'object' ? guest.email : null;
                                    const guestPhoto = typeof guest === 'object' ? (guest.profile_picture ?? guest.photo) : null;

                                    return (
                                      <div
                                        key={index}
                                        className="mr-2 w-[50px] h-[50px] rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-800 overflow-hidden"
                                        style={{ boxShadow: "0 1px 0 rgba(0,0,0,0.04)" }}
                                        title={guestName}
                                      >
                                        {guestPhoto ? (
                                          <img src={getImageUrl(guestPhoto) || ""} className="w-full h-full rounded-full object-cover" alt={guestName} />
                                        ) : (
                                          <div
                                            className="w-full h-full rounded-full flex items-center justify-center text-white font-semibold"
                                            style={{ backgroundColor: '#6B7280' }}
                                          >
                                            {getInitials(guestName, guestEmail)}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>


                                {totalParticipants > 3 && (
                                  <div className="ml-4 text-gray-700 font-medium items-center justify-center flex ">
                                    +{totalParticipants - 3}
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="text-gray-500 text-sm">
                                {totalParticipants > 0 ? `${totalParticipants} participants` : 'No participants'}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>


                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2 mt-5">About Event</h4>
              <p className="text-sm text-gray-600 leading-relaxed text-justify">
                {eventDetails.description ?? eventDetails.details ?? "No description available."}
              </p>
            </div>


          </div>
        </div>
      )}



      <Header title="Schedule" />

      <div className="bg-white rounded-[15px] shadow p-6">
        <div className="flex items-center justify-end gap-4 mb-6">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All</option>
            {projects.map((p) => (
              <option key={p.id} value={p.name}>
                {p.name}
              </option>
            ))}
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
            onClick={() => openEventModal()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Add Event
          </button>

          <button
            onClick={toggleSelectMode}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${isSelectMode
              ? "bg-gray-600 text-white hover:bg-gray-700"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
          >
            {isSelectMode ? "Cancel" : "Select"}
          </button>
        </div>

        {/* Multi-select controls */}
        {isSelectMode && (
          <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-4">
              <button
                onClick={selectAllEvents}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                {selectedEventIds.size === filteredEvents.length ? "Deselect All" : "Select All"}
              </button>
              <span className="text-sm text-gray-600">
                {selectedEventIds.size} selected
              </span>
            </div>
            {selectedEventIds.size > 0 && (
              <button
                onClick={() => setShowBulkDeleteConfirm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Delete Selected ({selectedEventIds.size})
              </button>
            )}
          </div>
        )}

        <div className="space-y-3">
          {filteredEvents.map((event) => (
            <div
              key={event.id}
              className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow relative"
            >
              <div
                className={`absolute left-0 top-0 bottom-0 w-1 mt-5 mb-5 ml-[15px]`}
                style={{ backgroundColor: event.projectColorClass || '#6B7280' }}></div>

              <div className="flex items-center justify-between pl-3">
                {/* Checkbox for multi-select */}
                {isSelectMode && (
                  <div className="mr-4">
                    <input
                      type="checkbox"
                      checked={selectedEventIds.has(event.id)}
                      onChange={() => toggleEventSelection(event.id)}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                    />
                  </div>
                )}

                <div className="flex-1">
                  <h3 className="text-base font-semibold text-gray-900 mb-1">{event.title}</h3>
                  <p className="text-sm text-gray-500">{formatDate(event.dateStart)}</p>
                </div>

                <div className="flex items-center gap-8">
                  <div className="flex items-center gap-2 pr-8 border-r border-gray-200">
                    <img src="/participants.svg" alt="Participants" className="w-6 h-6" />
                    <span className="text-sm text-gray-700">{event.participants} Participants</span>
                  </div>

                  <div className="flex items-center gap-2 justify-center ">
                    <div className={`w-3 h-3 rounded-full `} style={{ backgroundColor: event.projectColorClass || '#6B7280' }} />
                    <span className="text-sm text-gray-700 font-medium">{event.project}</span>
                  </div>

                  <button
                    className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-lg hover:bg-gray-50 transition-colors"
                    onClick={() => openEventDetails(event)}
                  >
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
                    <div ref={menuRef} className="absolute right-4 top-14 z-50 shadow-lg">
                      <div className="w-4 h-4 bg-white absolute right-5 -top-2 rotate-45 border-l border-t"></div>
                      <div className="bg-white shadow-lg border rounded-xl p-2 w-36 relative">
                        <button
                          className="flex items-center gap-3 px-3 py-3 hover:bg-gray-100 w-full text-left rounded-lg"
                          onClick={() => {
                            openEventModal({
                              id: event.id,
                              dateStart: event.dateStart,
                              dateEnd: event.dateEnd,
                              allDay: event.allDay,
                              title: event.title,
                              location: "",
                              description: "",
                              guest: "",
                              project: event.project,
                              projectId: projects.find((p) => p.name === event.project)?.id ?? null,
                            });
                            setOpenMenuId(null);
                          }}
                        >
                          <img src="/edit.svg" className="w-5 h-5" />
                          <span className="text-sm text-gray-800">Edit</span>
                        </button>

                        <div className="border-t my-1" />

                        <button
                          className="flex items-center gap-3 px-3 py-3 hover:bg-gray-100 text-red-600 w-full text-left rounded-lg"
                          onClick={() => openDeleteConfirm(event.id)}
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
              <p>{events.length === 0 ? "No events yet" : "No events found"}</p>
            </div>
          )}
        </div>
      </div>


      <EventModal
        open={modalOpen}

        initial={
          editingEvent
            ? {
              id: editingEvent.id ? Number(editingEvent.id) : undefined,
              title: editingEvent.title,
              description: editingEvent.description || "",
              startDate: editingEvent.dateStart || "",
              endDate: editingEvent.dateEnd || "",
              startTime:
                typeof editingEvent.startHour === "number"
                  ? `${String(editingEvent.startHour).padStart(2, "0")}:${String(editingEvent.startMinute ?? 0).padStart(2, "0")}`
                  : "",
              endTime:
                typeof editingEvent.endHour === "number"
                  ? `${String(editingEvent.endHour).padStart(2, "0")}:${String(editingEvent.endMinute ?? 0).padStart(2, "0")}`
                  : "",
              allDay: editingEvent.allDay || false,
              guest: editingEvent.guest || "",
              location: editingEvent.location || "",
              meetingType: editingEvent.meetingType || "onsite",
              projectId: editingEvent.projectId ?? undefined,
              projectName: editingEvent.project || "",
            }
            : null
        }
        onClose={closeModal}
        onSave={handleSaveFromModal}
        existingEvents={events.map((ev): EventForConflictCheck => ({
          id: ev.id,
          startDate: ev.dateStart,
          endDate: ev.dateEnd,
          startTime: ev.startTime || '',
          endTime: ev.endTime || '',
          title: ev.title,
          allDay: ev.allDay,
        }))}
      />
    </div>
  );
}