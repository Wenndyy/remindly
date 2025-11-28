"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import axiosClient from "../api/axiosClient";


type Project = {
  id: number;
  name: string;
  color?: string | null; 
  meetings: number;
};

type UserShape = { photoURL?: string | null; name?: string | null } | null;

export default function ProjectPage({
  initialUser = null,
}: {
  initialUser?: { photoURL?: string; name?: string } | null;
}) {
  const router = useRouter();

  const [checkedAuth, setCheckedAuth] = useState(false);
  const [user, setUser] = useState<UserShape>(initialUser);

  const [searchQuery, setSearchQuery] = useState("");

 
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [pendingCloseModal, setPendingCloseModal] = useState<"add" | "edit" | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState<number | null>(null);

  const [projectName, setProjectName] = useState("");
  const [projectColor, setProjectColor] = useState(""); // Sekarang menyimpan hex color
  const [showColorDropdown, setShowColorDropdown] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [editingProjectId, setEditingProjectId] = useState<number | null>(null);

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const colorOptions = [
    { label: 'Grey', value: '#6B7280', class: 'bg-gray-500' },
    { label: 'Blue', value: '#3B82F6', class: 'bg-blue-500' },
    { label: 'Green', value: '#22C55E', class: 'bg-green-500' },
    { label: 'Yellow', value: '#FB923C', class: 'bg-orange-400' },
    { label: 'Purple', value: '#A855F7', class: 'bg-purple-500' },
  ];

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

        await loadProjects();
      } catch (err: any) {
        console.error("Failed to bootstrap:", err);
        localStorage.removeItem("access_token");
        router.replace("/login");
      }
    }

    bootstrap();
    return () => {
      mounted = false;
    };
  }, [router]);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get<Project[]>("/projects");
      setProjects(res.data);
    } catch (err: any) {
      console.error("Failed fetching projects:", err);
      alert("Gagal memuat projects. Silakan refresh atau login ulang.");
      if (err?.response?.status === 401) {
        localStorage.removeItem("access_token");
        router.replace("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!checkedAuth) {
    return <div className="p-6">Memeriksa autentikasi...</div>;
  }

  const photo = user?.photoURL ?? null;
  const name = user?.name ?? "User";
  const fallback = "/person.svg";


  const handleAddProject = async () => {
    if (!projectName || !projectColor) return alert("Please fill all fields!");
    try {
      const payload = { name: projectName, color: projectColor }; // Mengirim hex color
      const res = await axiosClient.post("/projects", payload);
      setProjects((prev) => [res.data, ...prev]);
      setShowModal(false);
      setProjectName("");
      setProjectColor("");
    } catch (err: any) {
      console.error("Add project error:", err);
      const msg = err?.response?.data?.detail ?? "Gagal menambah project";
      alert(msg);
    }
  };

  const handleOpenEditModal = (project: Project) => {
    setEditingProjectId(project.id);
    setProjectName(project.name);
    setProjectColor(project.color ?? "");
    setShowEditModal(true);
    setOpenMenuId(null);
  };

  const handleUpdateProject = async () => {
    if (!editingProjectId) return;
    if (!projectName || !projectColor) return alert("Please fill all fields!");

    try {
      const payload = { name: projectName, color: projectColor }; // Mengirim hex color
      const res = await axiosClient.put(`/projects/${editingProjectId}`, payload);

      setProjects((prev) => prev.map((p) => (p.id === editingProjectId ? res.data : p)));

      setShowEditModal(false);
      setEditingProjectId(null);
      setProjectName("");
      setProjectColor("");
    } catch (err: any) {
      console.error("Update project error:", err);
      const msg = err?.response?.data?.detail ?? "Gagal update project";
      alert(msg);
    }
  };

  const openDeleteModal = (projectId: number) => {
    setDeletingProjectId(projectId);
    setShowDeleteConfirm(true);
    setOpenMenuId(null);
  };


  const confirmDeleteProject = async () => {
    if (deletingProjectId == null) return;
    try {
      await axiosClient.delete(`/projects/${deletingProjectId}`);
      setProjects((prev) => prev.filter((p) => p.id !== deletingProjectId));
      setDeletingProjectId(null);
      setShowDeleteConfirm(false);
      setOpenMenuId(null);
    } catch (err: any) {
      console.error("Delete error:", err);
      const msg = err?.response?.data?.detail ?? "Gagal menghapus project";
      alert(msg);
    }
  };


  const cancelDelete = () => {
    setDeletingProjectId(null);
    setShowDeleteConfirm(false);
  };

  
  const handleAttemptCloseModal = (modalType: "add" | "edit") => {
    if (projectName || projectColor) {
      setPendingCloseModal(modalType);
      setShowCancelConfirm(true);
    } else {
      if (modalType === "add") setShowModal(false);
      if (modalType === "edit") {
        setShowEditModal(false);
        setEditingProjectId(null);
      }
    }
  };

  const handleDiscardChanges = () => {
    if (pendingCloseModal === "add") {
      setShowModal(false);
    } else if (pendingCloseModal === "edit") {
      setShowEditModal(false);
      setEditingProjectId(null);
    }

    setShowCancelConfirm(false);
    setPendingCloseModal(null);
    setProjectName("");
    setProjectColor("");
  };


  const getColorLabel = (hexColor: string) => {
    const option = colorOptions.find(opt => opt.value === hexColor);
    return option ? option.label : "Select Color";
  };

  return (
    <>
      <div className="w-full h-full p-0 m-0">
        {/* Header */}
        <div className="flex items-center justify-between bg-white px-6 py-4 rounded-[15px] shadow mb-[15px]">
          <h2 className="text-2xl font-bold text-black">Project</h2>
          <div className="flex items-center gap-4">
            <img src="/notif-off.svg" alt="notification" />
            <img
                    src={photo ?? fallback}
                    alt={`${name} profile`}
                    className="w-[59px] h-[59px] rounded-full object-cover  border-gray-200"
                    onError={(e) => {
                      const t = e.currentTarget as HTMLImageElement;
                      t.onerror = null;
                      t.src = fallback;
                    }}
                  />
          </div>
        </div>

        <div className="bg-white rounded-[15px] shadow p-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h3 className="text-lg font-semibold text-black">
              You have {projects.length} projects
            </h3>

            <div className="flex items-center gap-3">
              <div className="relative" style={{ width: "285px" }}>
                <input
                  type="text"
                  placeholder="Search projects..."
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
                  <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              <button
                onClick={() => {
                  setProjectName("");
                  setProjectColor("");
                  setShowModal(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2"
                style={{ background: "#337AF7", color: "#fff", borderRadius: 6 }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Add Project
              </button>
            </div>
          </div>

          <hr className="h-5" />

          {loading ? (
            <div className="p-6 text-center">Loading projects...</div>
          ) : (
            <div className="grid grid-cols-2 gap-4 mt-4">
              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => router.push(`/project/${project.id}`)}
                  className="flex items-center justify-between border border-gray-200 rounded-xl px-6 py-4 shadow-sm hover:shadow-md transition cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-1 h-10 rounded-full" 
                      style={{ backgroundColor: project.color || '#6B7280' }}
                    />
                    <div>
                      <h4 className="font-semibold text-gray-900 text-[16px]">{project.name}</h4>
                      <p className="text-sm text-gray-500">You have {project.meetings} meetings</p>
                    </div>
                  </div>

                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === project.id ? null : project.id);
                      }}
                      className="px-2 py-1 rounded hover:bg-gray-200 transition"
                      aria-haspopup="true"
                      aria-expanded={openMenuId === project.id}
                    >
                      <svg className="w-5 h-5 text-gray-500" strokeWidth="2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="6" r="1" />
                        <circle cx="12" cy="12" r="1" />
                        <circle cx="12" cy="18" r="1" />
                      </svg>
                    </button>

                    {openMenuId === project.id && (
                      <div
                        ref={menuRef}
                        className="absolute right-[-1] top-10 z-50 shadow-gray-50"
                      >
                        <div className="w-4 h-5 bg-white absolute right-5 -top-2 rotate-45 rounded-tl-md shadow-black border"></div>

                        <div className="bg-white shadow-lg border-l border-r border-b rounded-xl p-2 w-36 relative">
                          <button
                            className="flex items-center gap-3 px-3 py-3 hover:bg-gray-100 w-full text-left"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditModal(project);
                            }}
                          >
                            <img src="/edit.svg" className="w-5 h-5" />
                            <span className="text-sm text-gray-800">Edit</span>
                          </button>

                          <div className="border-t my-1" />

                         <button
                            className="flex items-center gap-3 px-3 py-3 hover:bg-gray-100 text-red-600 w-full text-left"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDeleteModal(project.id);
                            }}
                          >
                          <img src="/delete.svg" className="w-5 h-5" />
                          <span className="text-sm">Delete</span>
                        </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
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
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-4 text-gray-700"
            />

            <label className="block text-gray-700 font-medium mb-1">Color</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowColorDropdown(!showColorDropdown)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-6 text-left text-gray-400 flex items-center justify-between"
              >
                {projectColor ? (
                  <span className="flex items-center gap-2">
                    <span 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: projectColor }}
                    ></span>
                    {getColorLabel(projectColor)}
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
                        setProjectColor(option.value); // Menyimpan hex value
                        setShowColorDropdown(false);
                      }}
                      className="w-full px-4 py-2 hover:bg-gray-50 flex items-center gap-3 text-left"
                    >
                      <span
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: option.value }}
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

      {/* EDIT PROJECT MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 shadow-lg">
          <div className="bg-white rounded-xl p-6 w-[450px] shadow-lg relative z-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-red-600">Edit Project</h3>

              <button onClick={() => handleAttemptCloseModal("edit")}>
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
              placeholder="Project name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-4 text-gray-700"
            />

            <label className="block text-gray-700 font-medium mb-1">Color</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowColorDropdown(!showColorDropdown)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-6 text-left text-gray-400 flex items-center justify-between"
              >
                {projectColor ? (
                  <span className="flex items-center gap-2">
                    <span 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: projectColor }}
                    ></span>
                    {getColorLabel(projectColor)}
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
                        setProjectColor(option.value); // Menyimpan hex value
                        setShowColorDropdown(false);
                      }}
                      className="w-full px-4 py-2 hover:bg-gray-50 flex items-center gap-3 text-left"
                    >
                      <span
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: option.value }}
                      ></span>
                      <span className="text-gray-700">{option.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-4">
              <button
                onClick={() => handleAttemptCloseModal("edit")}
                className="px-6 py-2 rounded-lg border border-gray-400 text-black w-[89px] items-center justify-center flex"
              >
                Cancel
              </button>

              <button
                onClick={handleUpdateProject}
                className="px-6 py-2 rounded-lg text-white w-[89px] items-center justify-center flex"
                style={{ background: "linear-gradient(to bottom, #BE2A2A, #7A0000)" }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DISCARD MODAL */}
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

      {/* DELETE CONFIRM MODAL */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg p-6 w-[370px] h-[198] shadow-lg text-center">
            <h3 className="text-2xl font-semibold mb-2 text-black">Delete?</h3>
            <p className="text-[16px] text-[#55565B] mb-6">Are you sure want to delete this Project?</p>

            <div className="flex justify-center gap-4">
              <button
                onClick={cancelDelete}
                className="px-6 py-2 rounded-lg text-black bg-[#E9EDE9] w-[148px] items-center justify-center flex"
              >
                Cancel
              </button>

              <button
                onClick={confirmDeleteProject}
                className="px-6 py-2 rounded-lg text-white w-[148px] items-center justify-center flex"
                style={{ background: '#B6252A' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}