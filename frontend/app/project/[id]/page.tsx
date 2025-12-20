// app/projects/[id]/page.tsx
"use client";

import { useEffect, useState, useRef, Key } from "react";
import { useParams, useRouter } from "next/navigation";
import axiosClient from "../../api/axiosClient";
import Header from "../../components/Header";

import EventModal from "../../components/EventModal";
import { EventForConflictCheck } from "../../utils/conflictDetection";

type EventShape = {
  id: number;
  title: string;
  dateStart: string;
  dateEnd: string;
  participants: number;
  project_name: string;
  project_color: string;
  project_id: number;
  description?: string;
  location?: string;
  start_time?: string;
  end_time?: string;
  all_day?: boolean;
  guest?: string;
  project?: string;
  projectId?: number;
  startHour?: number;
  startMinute?: number;
  endHour?: number;
  endMinute?: number;
  guest_list?: string[];
  time_display?: string;
  organizer_id?: number;
  organizer_name?: string;
  organizer_email?: string;
};

type UserShape = { photoURL?: string | null; name?: string | null } | null;

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

export default function ProjectDetailPage({
  initialUser = null,
}: {
  initialUser?: { photoURL?: string; name?: string } | null;
}) {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.id;


  const [checkedAuth, setCheckedAuth] = useState(false);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventShape[]>([]);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [projectName, setProjectName] = useState(`Project ${projectId}`);
  const [user, setUser] = useState<UserShape>(initialUser);
  const photo = user?.photoURL ?? null;
  const name = user?.name ?? "User";
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [, setPendingCloseModal] = useState<"add" | "edit" | null>(null);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectColor, setNewProjectColor] = useState("");
  const [showColorDropdown, setShowColorDropdown] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventShape | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [eventDetails, setEventDetails] = useState<EventShape | null>(null);


  const colorOptions = [
    { label: 'Grey', value: '#6B7280', class: 'bg-gray-500' },
    { label: 'Blue', value: '#3B82F6', class: 'bg-blue-500' },
    { label: 'Green', value: '#22C55E', class: 'bg-green-500' },
    { label: 'Yellow', value: '#FB923C', class: 'bg-orange-400' },
    { label: 'Purple', value: '#A855F7', class: 'bg-purple-500' },
  ];


  const getColorLabel = (hexColor: string) => {
    const option = colorOptions.find(opt => opt.value === hexColor);
    return option ? option.label : "Select Color";
  };


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


  useEffect(() => {
    let mounted = true;

    async function fetchProjectAndEvents() {
      try {
        setLoading(true);

        const projectRes = await axiosClient.get(`/projects/${projectId}?include_events=true`);

        if (!mounted) return;

        const projectData = projectRes.data;
        if (projectData) {
          setProjectName(projectData.name);

          if (projectData.events && projectData.events.length > 0) {
            const formattedEvents = projectData.events.map((event: any) => {
              const projectColor =
                event.color ||
                event.project_color ||
                projectData.color ||
                "#337AF7";


              return {
                id: event.id,
                title: event.title,
                dateStart: event.start_date,
                dateEnd: event.end_date,
                participants: event.participants || 0,
                project_name: event.project_name || projectData.name,
                project_color: projectColor,
                project_id: Number(projectId),
                description: event.description,
                location: event.location,
                start_time: event.start_time,
                end_time: event.end_time,
                all_day: event.all_day,
                guest: event.guest || "",
                project: projectData.name,
                projectId: Number(projectId),
                startHour: event.start_time ? parseInt(event.start_time.split(':')[0]) : undefined,
                startMinute: event.start_time ? parseInt(event.start_time.split(':')[1]) : undefined,
                endHour: event.end_time ? parseInt(event.end_time.split(':')[0]) : undefined,
                endMinute: event.end_time ? parseInt(event.end_time.split(':')[1]) : undefined,
                guest_list: event.guest_list || [],
                time_display: event.time_display,
                organizer_id: event.organizer_id,
                organizer_name: event.organizer_name,
                organizer_email: event.organizer_email
              };
            });
            setEvents(formattedEvents);
          } else {
            setEvents([]);
          }
        }
      } catch (err) {
        console.error("Failed to fetch project data:", err);
        setEvents([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    if (projectId) {
      fetchProjectAndEvents();
    }
    return () => {
      mounted = false;
    };
  }, [projectId]);



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
  // Event Modal Handlers
  const openModal = (event?: EventShape) => {
    if (event) {
      setEditingEvent(event);
    } else {
      setEditingEvent(null);
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingEvent(null);
  };

  const handleSaveFromModal = async (eventData: any) => {
    // EventModal already saved the event to the backend.
    // This callback only needs to update the local UI state.
    try {
      // Get the new project ID from the modal's data
      const newProjectId = eventData.projectId;

      // If the event was moved to a DIFFERENT project, remove it from this page's list
      if (editingEvent && newProjectId !== undefined && String(newProjectId) !== String(projectId)) {
        setEvents(prev => prev.filter(e => e.id !== editingEvent.id));
        closeModal();
        return;
      }

      // Otherwise, refresh the current project's events list from the server
      const projectRes = await axiosClient.get(`/projects/${projectId}`);
      const projectData = projectRes.data;

      if (projectData.events && projectData.events.length > 0) {
        const formattedEvents = projectData.events.map((event: any) => ({
          id: event.id,
          title: event.title,
          dateStart: event.start_date,
          dateEnd: event.end_date,
          participants: event.participants || 0,
          project_name: projectData.name,
          project_color: event.color || "#337AF7",
          project_id: Number(projectId),
          description: event.description,
          location: event.location,
          start_time: event.start_time,
          end_time: event.end_time,
          all_day: event.all_day,
          guest: event.guest || "",
          project: projectData.name,
          projectId: Number(projectId),
          startHour: event.start_hour,
          startMinute: event.start_minute,
          endHour: event.end_hour,
          endMinute: event.end_minute,
        }));
        setEvents(formattedEvents);
      } else {
        setEvents([]);
      }

      closeModal();
    } catch (err: any) {
      console.error("Failed to refresh events:", err);
    }
  };


  const handleDeleteEvent = (event: EventShape) => {
    setEventDetails(event);
    setShowDeleteConfirm(true);
    setOpenMenuId(null);
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setEventDetails(null);
  };

  const confirmDeleteEvent = async () => {
    if (!eventDetails) return;

    try {
      await axiosClient.delete(`/events/${eventDetails.id}`);
      setEvents(events.filter(event => event.id !== eventDetails.id));
      setShowDeleteConfirm(false);
      setEventDetails(null);
    } catch (err) {
      console.error("Failed to delete event:", err);
      alert("Failed to delete event");
    }
  };


  const openEventDetails = (event: EventShape) => {
    setEventDetails(event);
    setShowDetailsModal(true);
  };

  const closeEventDetails = () => {
    setShowDetailsModal(false);
    setEventDetails(null);
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

  const handleAttemptCloseModal = (modalType: "add") => {
    if (newProjectName || newProjectColor) {
      setPendingCloseModal(modalType);
      setShowCancelConfirm(true);
    } else {
      if (modalType === "add") setShowModal(false);
    }
  };

  const handleAddProject = async () => {
    if (!newProjectName.trim()) {
      alert("Please enter project name");
      return;
    }

    try {
      const projectData = {
        name: newProjectName,
        color: newProjectColor || "#337AF7",
      };

      await axiosClient.post("/projects", { payload: projectData });

      setNewProjectName("");
      setNewProjectColor("");
      setShowModal(false);

      alert("Project created successfully!");

    } catch (err) {
      console.error("Failed to add project:", err);
      alert("Failed to add project");
    }
  };

  const handleDiscardChanges = () => {
    setShowModal(false);
    setShowCancelConfirm(false);
    setPendingCloseModal(null);
    setNewProjectName("");
    setNewProjectColor("");
  };


  const filteredEvents = events.filter((event) => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });
  const fallback = "/person.svg";

  if (!checkedAuth) {
    return <div className="p-6">Memeriksa autentikasi...</div>;
  }

  return (
    <div className="w-full h-full p-0 m-0">
      {/* Header */}
      <Header title="Project" />

      {/* Events Section */}
      <div className="bg-white rounded-[15px] shadow p-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3 flex-1">
            <button
              onClick={() => router.push("/project")}
              aria-label="Kembali ke daftar project"
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.8}
                stroke="currentColor"
                className="w-6 h-6 text-black"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>


            <h3 className="text-lg font-semibold text-black min-w-[120px]">
              {projectName}
            </h3>
          </div>

          <div className="flex items-center gap-3">

            <div className="relative flex-1 max-w-[480px]">
              <svg
                className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 pl-10 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => {
                setNewProjectName("");
                setNewProjectColor("");
                setShowModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2"
              style={{ background: "#337AF7", color: "#fff", borderRadius: 6 }}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Add Project
            </button>
          </div>
        </div>

        <hr className="h-5" />

        {/* Event List */}
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="text-gray-600">Loading events...</div>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>{events.length === 0 ? "No events yet" : "No events found"}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEvents.map((event) => (
              <div
                key={event.id}
                className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow relative"
              >
                <div
                  className="absolute left-0 top-0 bottom-0 w-1 mt-5 mb-5 ml-[15px]"
                  style={{ backgroundColor: event.project_color || '#337AF7' }} // Menggunakan inline style dengan hex
                ></div>

                <div className="flex items-center justify-between pl-3">
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-gray-900 mb-1">{event.title}</h3>
                    <p className="text-sm text-gray-500">{formatDate(event.dateStart)}</p>
                  </div>

                  <div className="flex items-center gap-8">
                    <div className="flex items-center gap-2 pr-8 border-r border-gray-200">
                      <img src="/participants.svg" alt="Participants" className="w-6 h-6" />
                      <span className="text-sm text-gray-700">{event.participants} Participants</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: event.project_color || '#337AF7' }} // Menggunakan inline style dengan hex
                      />
                      <span className="text-sm text-gray-700 font-medium">{event.project_name}</span>
                    </div>

                    <button
                      className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-lg hover:bg-gray-50 transition-colors"
                      onClick={() => openEventDetails(event)}
                    >
                      View Details
                    </button>

                    <button
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === event.id ? null : event.id);
                      }}
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
                            onClick={(e) => {
                              e.stopPropagation();
                              openModal(event);
                              setOpenMenuId(null);
                            }}
                          >
                            <img src="/edit.svg" className="w-5 h-5" alt="Edit" />
                            <span className="text-sm text-gray-800">Edit</span>
                          </button>

                          <div className="border-t my-1" />

                          <button
                            className="flex items-center gap-3 px-3 py-3 hover:bg-gray-100 text-red-600 w-full text-left rounded-lg"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteEvent(event);
                            }}
                          >
                            <img src="/delete.svg" className="w-5 h-5" alt="Delete" />
                            <span className="text-sm">Delete</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ADD PROJECT MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 shadow-lg">
          <div className="bg-white rounded-xl p-6 w-[450px] shadow-lg relative z-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-red-600">Add New Project</h3>

              <button onClick={() => handleAttemptCloseModal("add")}>
                <svg viewBox="0 0 24 24" className="w-7 h-7 text-red-600"
                  fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <label className="block text-gray-700 font-medium mb-1">Name</label>
            <input
              type="text"
              placeholder="Add Title Project"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-4 text-gray-700"
            />

            <label className="block text-gray-700 font-medium mb-1">Color</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowColorDropdown(!showColorDropdown)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-6 text-left text-gray-400 flex items-center justify-between"
              >
                {newProjectColor ? (
                  <span className="flex items-center gap-2">
                    <span
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: newProjectColor }} // Menggunakan inline style dengan hex
                    ></span>
                    {getColorLabel(newProjectColor)}
                  </span>
                ) : (
                  "Select Color"
                )}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showColorDropdown && (
                <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-lg shadow-lg -mt-5">
                  {colorOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setNewProjectColor(option.value); // Menyimpan hex value
                        setShowColorDropdown(false);
                      }}
                      className="w-full px-4 py-2 hover:bg-gray-50 flex items-center gap-3 text-left"
                    >
                      <span
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: option.value }} // Menggunakan inline style dengan hex
                      ></span>
                      <span className="text-gray-700">{option.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-4">
              <button
                onClick={() => handleAttemptCloseModal("add")}
                className="px-6 py-2 rounded-lg border border-gray-400 text-black w-[89px] items-center justify-center flex"
              >
                Cancel
              </button>

              <button
                onClick={handleAddProject}
                className="px-6 py-2 rounded-lg text-white w-[89px] items-center justify-center flex"
                style={{ background: "linear-gradient(to bottom, #BE2A2A, #7A0000)" }}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Event Modal */}
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
              allDay: editingEvent.all_day || false,
              guest: editingEvent.guest || "",
              location: editingEvent.location || "",
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
          startTime: ev.start_time || '',
          endTime: ev.end_time || '',
          title: ev.title,
          allDay: ev.all_day,
        }))}
      />

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

      {/* Event Details Modal */}
      {showDetailsModal && eventDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60">
          <div className="bg-white rounded-2xl p-6 w-[92%] max-w-md shadow-xl">
            {/* Back / Title row */}
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
              <h3 className="text-2xl font-bold text-gray-900 mt-6">{eventDetails.title}</h3>
              <div className="flex items-center gap-2 mt-4">
                <span className="text-sm text-gray-500">Invited by:</span>
                {(() => {
                  const organizerName = (eventDetails as any).organizer_name || user?.name || "Unknown";
                  const organizerPhoto = (eventDetails as any).organizer_profile_picture;

                  return (
                    <div className="flex items-center gap-2">
                      {organizerPhoto ? (
                        <img
                          src={getImageUrl(organizerPhoto) || ""}
                          alt={organizerName}
                          className="w-6 h-6 rounded-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
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
                    {formatDisplayDate(eventDetails.dateStart, eventDetails.dateEnd)}
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
                    {eventDetails.location || "Not specified"}
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
                    {formatTimeDisplay(eventDetails.start_time, eventDetails.end_time)}
                    <span className="text-gray-500 ml-2">
                      {calculateDuration(eventDetails.start_time, eventDetails.end_time)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Participants */}
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-3">
                      {(() => {
                        const guestsArray = eventDetails.guest_list && Array.isArray(eventDetails.guest_list) ? eventDetails.guest_list : [];
                        const totalParticipants = eventDetails.participants || guestsArray.length || 0;
                        const displayGuests = guestsArray.slice(0, 3);

                        if (displayGuests.length > 0) {
                          return (
                            <>
                              {displayGuests.map((guest: any, index: number) => {
                                const guestName = typeof guest === 'string' ? guest :
                                  guest?.full_name ?? guest?.name ?? guest?.email ?? 'Guest';
                                const guestEmail = typeof guest === 'object' ? guest.email : null;
                                const guestPhoto = typeof guest === 'object' ? (guest.profile_picture ?? guest.photo) : null;

                                return (
                                  <div
                                    key={index}
                                    className="w-[50px] h-[50px] rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-800 overflow-hidden"
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

                              {totalParticipants > 3 && (
                                <div className="ml-4 text-gray-700 font-medium items-center justify-center flex">
                                  +{totalParticipants - 3}
                                </div>
                              )}
                            </>
                          );
                        } else if (totalParticipants > 0) {
                          // Fallback if no guest_list but participants count exists
                          return (
                            <>
                              {Array.from({ length: Math.min(3, totalParticipants) }).map((_, index) => (
                                <div
                                  key={index}
                                  className="w-[50px] h-[50px] rounded-full border-2 border-white flex items-center justify-center text-sm font-semibold text-white overflow-hidden"
                                  style={{ boxShadow: "0 1px 0 rgba(0,0,0,0.04)", backgroundColor: '#6B7280' }}
                                >
                                  {String.fromCharCode(65 + index)}
                                </div>
                              ))}

                              {totalParticipants > 3 && (
                                <div className="ml-4 text-gray-700 font-medium items-center justify-center flex">
                                  +{totalParticipants - 3}
                                </div>
                              )}
                            </>
                          );
                        } else {
                          return (
                            <div className="text-gray-500 text-sm">
                              No participants
                            </div>
                          );
                        }
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>


            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2 mt-5">About Event</h4>
              <p className="text-sm text-gray-600 leading-relaxed text-justify">
                {eventDetails.description || "No description available."}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}