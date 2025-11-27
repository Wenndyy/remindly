"use client";

import { useState, useEffect, useRef, Key } from "react";
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
  projectColor?: string;
  projectColorClass?: string; 
};

export type EventItem = {
  id?: string;
  date?: string;
  startHour?: number;
  startMinute?: number;
  endHour?: number;
  endMinute?: number;
  time?: string;
  title: string;
  description?: string;
  guest?: string;
  location?: string;
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

// Extended EventModal props dengan onFormChange
interface ExtendedEventModalProps {
  open: boolean;
  initial?: Partial<EventForm> | null;
  onClose: () => void;
  onSave: (data: EventForm) => void;
  onFormChange?: (hasChanges: boolean) => void;
  projects?: Project[];
}

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

const mapApiEventToSchedule = (ev: any, projects: Project[]): ScheduleEvent => {
  const projectName = ev.project_name || "General";
  
  const project = projects.find(p => p.id === ev.project_id);
  const projectColorClass = project?.color || "bg-gray-300";

  // Gunakan logika yang sama dengan detail event
  const participants = ev.participants ?? ev.attendees_count ?? ev.guest_count ?? 0;

  return {
    id: String(ev.id),
    title: ev.title,
    date: ev.start_date,
    participants: Number(participants), // Pastikan number
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

  // Load event details
const loadEventDetails = async (eventId: string) => {
  try {
    const response = await axiosClient.get(`/events/${eventId}`);
    console.log("Event details API response:", response.data); // DEBUG
    
    const raw = response.data;
    
    // Gunakan data yang benar-benar ada di response
  // Di loadEventDetails
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

  participants: raw.participants,
  guest_list: raw.guest_list || [],
  
  // Gunakan field organizer yang baru
  invitedBy: raw.organizer_name || raw.organizer_email,

  project_id: raw.project_id,
  project_name: raw.project_name,
  project_color: raw.project_color,

  time_display: raw.time_display,
  created_at: raw.created_at,
  updated_at: raw.updated_at,
};

    console.log("Processed event details:", event); // DEBUG
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

  const openEventModal = (ev?: EventItem | null) => {
    if (ev) {
      const proj = projects.find((p) => p.name === ev.project);
      const eventData = {
        ...ev,
        project: ev.project ?? (proj?.name ?? ""),
        projectId: proj?.id ?? ev.projectId ?? null,
      };
      setEditingEvent(eventData);
      setOriginalEventData(eventData);
    } else {
      setEditingEvent(null);
      setOriginalEventData(null);
    }
    setModalOpen(true);
    setHasUnsavedChanges(false);
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

  // Handler untuk mendeteksi perubahan di EventModal
  const handleEventFormChange = (hasChanges: boolean) => {
    setHasUnsavedChanges(hasChanges);
  };

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

  // Format date untuk display
  const formatDisplayDate = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    };
    return date.toLocaleDateString('en-US', options);
  };

  // Format time untuk display
  const formatTimeDisplay = (startTime?: string, endTime?: string) => {
    if (!startTime || !endTime) return "Time not specified";
    
    const formatTime = (time: string) => {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours);
      return hour >= 12 ? `${hour === 12 ? 12 : hour - 12}:${minutes} PM` : `${hour}:${minutes} AM`;
    };

    return `${formatTime(startTime)} - ${formatTime(endTime)}`;
  };

  // Calculate duration
  const calculateDuration = (startTime?: string, endTime?: string) => {
    if (!startTime || !endTime) return "";
    
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    
    return `(${diff} Hours)`;
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
        <p className="text-sm text-gray-500 mt-4">
          {/* fallback ke beberapa kemungkinan nama field dari API */}
          Invited by:{" "}
          <span className="text-gray-700 font-medium ">
            {eventDetails.invitedBy ??
             eventDetails.invited_by ??
             eventDetails.organizer ??
             eventDetails.host ??
             "Unknown"}
          </span>
        </p>
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
                eventDetails.start
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
                eventDetails.end_time   ?? eventDetails.end_time_local   ?? eventDetails.endTime
              )}
              <span className="text-gray-500 ml-2">
                {calculateDuration(
                  eventDetails.start_time ?? eventDetails.start_time_local ?? eventDetails.startTime,
                  eventDetails.end_time   ?? eventDetails.end_time_local   ?? eventDetails.endTime
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Participants (avatars + +N) */}
{/* Participants Section */}
<div className="flex items-start gap-3">
 
  <div className="flex-1">
    
    
    {/* Avatar dan count */}
    <div className="flex items-center gap-3">
      <div className="flex -space-x-3">
        {(() => {
          // Ambil daftar participants dari berbagai kemungkinan field
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
                    {displayGuests.map((guest: { name: any; email: any; photo: any; }, index: Key | null | undefined) => {
                      const guestName = typeof guest === 'string' ? guest : 
                                      guest?.name ?? guest?.email ?? 'Guest';
                      const guestPhoto = typeof guest === 'object' ? guest.photo : null;
                      
                      return (
                        <div
                          key={index}
                          className="mr-2 w-[50px] h-[50px] rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-800"
                          style={{ boxShadow: "0 1px 0 rgba(0,0,0,0.04)" }}
                          title={guestName}
                        >
                          {guestPhoto ? (
                            <img src={guestPhoto} className="w-full h-full rounded-full object-cover" alt={guestName} />
                          ) : (
                            guestName.charAt(0).toUpperCase()
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

      

      {/* About */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-2 mt-5">About Event</h4>
        <p className="text-sm text-gray-600 leading-relaxed text-justify">
          {eventDetails.description ?? eventDetails.details ?? "No description available."}
        </p>
      </div>

     
    </div>
  </div>
)}



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
        </div>

        <div className="space-y-3">
          {filteredEvents.map((event) => (
            <div
              key={event.id}
              className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow relative"
            >
              <div
                className={`absolute left-0 top-0 bottom-0 w-1 mt-5 mb-5 ml-[15px] ${event.projectColorClass || 'bg-gray-300'}`}
              ></div>

              <div className="flex items-center justify-between pl-3">
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-gray-900 mb-1">{event.title}</h3>
                  <p className="text-sm text-gray-500">{event.date}</p>
                </div>

                <div className="flex items-center gap-8">
                  <div className="flex items-center gap-2 pr-8 border-r border-gray-200">
                    <img src="/participants.svg" alt="Participants" className="w-6 h-6" />
                    <span className="text-sm text-gray-700">{event.participants} Participants</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${event.projectColorClass || 'bg-gray-300'}`} />
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
                              date: event.date,
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

      {/* EventModal dengan onFormChange yang opsional */}
      <EventModal
        open={modalOpen}
        initial={
          editingEvent
            ? {
                id: editingEvent.id ? Number(editingEvent.id) : undefined,
                title: editingEvent.title,
                description: editingEvent.description || "",
                startDate: editingEvent.date || "",
                endDate: editingEvent.date || "",
                startTime:
                  typeof editingEvent.startHour === "number"
                    ? `${String(editingEvent.startHour).padStart(2, "0")}:${String(editingEvent.startMinute ?? 0).padStart(2, "0")}`
                    : "",
                endTime:
                  typeof editingEvent.endHour === "number"
                    ? `${String(editingEvent.endHour).padStart(2, "0")}:${String(editingEvent.endMinute ?? 0).padStart(2, "0")}`
                    : "",
                allDay: false,
                guest: editingEvent.guest || "",
                location: editingEvent.location || "",
                projectId: editingEvent.projectId ?? undefined,
                projectName: editingEvent.project || "",
              }
            : null
        }
        onClose={closeModal}
        onSave={handleSaveFromModal}
       
      />
    </div>
  );
}