"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import axiosClient from "../api/axiosClient";
import Toast, { useToast } from "../components/Toast";

import { useRouter } from "next/navigation";
import { useUser } from "../../contexts/UserContext";
import Header from "../components/Header";

type UserProfile = {
    id: number;
    email: string;
    full_name: string | null;
    first_name: string | null;
    last_name: string | null;
    date_of_birth: string | null;
    phone_number: string | null;
    country: string | null;
    city: string | null;
    profile_picture: string | null;
};

type EditForm = {
    first_name: string;
    last_name: string;
    date_of_birth: string;
    phone_number: string;
    country: string;
    city: string;
    profile_picture: string;
};

// Helper function to get full image URL
const getImageUrl = (url: string | null | undefined): string => {
    if (!url) return '';
    // If already a full URL, return as-is
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
        return url;
    }
    // Otherwise, prepend the backend URL
    return `http://127.0.0.1:8000${url}`;
};

export default function ProfilePage() {
    const router = useRouter();
    const { refreshUser } = useUser();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [discardModalOpen, setDiscardModalOpen] = useState(false);
    const [logoutModalOpen, setLogoutModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const { toast, showToast, hideToast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Draft state for edit form
    const [editForm, setEditForm] = useState<EditForm>({
        first_name: "",
        last_name: "",
        date_of_birth: "",
        phone_number: "",
        country: "",
        city: "",
        profile_picture: "",
    });
    const [originalForm, setOriginalForm] = useState<EditForm>({
        first_name: "",
        last_name: "",
        date_of_birth: "",
        phone_number: "",
        country: "",
        city: "",
        profile_picture: "",
    });

    // Fetch profile
    const fetchProfile = useCallback(async () => {
        try {
            const res = await axiosClient.get("/me");
            setProfile(res.data);
            const formData: EditForm = {
                first_name: res.data.first_name || "",
                last_name: res.data.last_name || "",
                date_of_birth: res.data.date_of_birth || "",
                phone_number: res.data.phone_number || "",
                country: res.data.country || "",
                city: res.data.city || "",
                profile_picture: res.data.profile_picture || "",
            };
            setEditForm(formData);
            setOriginalForm(formData);
        } catch (err) {
            console.error("Failed to fetch profile:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    // Check if form has changes
    const hasChanges = () => {
        return JSON.stringify(editForm) !== JSON.stringify(originalForm);
    };

    // Open edit modal
    const openEditModal = () => {
        setEditForm({ ...originalForm });
        setEditModalOpen(true);
    };

    // Close edit modal with check for unsaved changes
    const handleCloseEditModal = () => {
        if (hasChanges()) {
            setDiscardModalOpen(true);
        } else {
            setEditModalOpen(false);
        }
    };

    // Discard changes
    const handleDiscard = () => {
        setEditForm({ ...originalForm });
        setDiscardModalOpen(false);
        setEditModalOpen(false);
    };

    // Save profile
    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await axiosClient.put("/profile", editForm);
            setProfile(res.data);
            setOriginalForm({ ...editForm });

            // Refresh global user context to update sidebar icon
            await refreshUser();

            showToast("Profile updated successfully!", "success");
            setTimeout(() => {
                setEditModalOpen(false);
            }, 500);
        } catch (err: any) {
            console.error("Failed to update profile:", err);
            // Handle different error response formats
            let errorMsg = "Failed to update profile";
            if (err.response?.data?.detail) {
                const detail = err.response.data.detail;
                if (typeof detail === "string") {
                    errorMsg = detail;
                } else if (Array.isArray(detail)) {
                    // Pydantic validation errors are arrays
                    // Handle wrapped detail if present
                    if (detail.length > 0 && detail[0].msg) {
                        errorMsg = detail.map((e: any) => e.msg).join(", ");
                    }
                }
            }
            showToast(errorMsg, "error");
        } finally {
            setSaving(false);
        }
    };

    // Handle logout
    const handleLogout = async () => {
        try {
            const refreshToken = localStorage.getItem("refresh_token");
            if (refreshToken) {
                await axiosClient.post("/logout", refreshToken);
            }
        } catch (err) {
            console.error("Logout error:", err);
        } finally {
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            localStorage.removeItem("token");
            sessionStorage.clear();
            window.location.href = "/login";
        }
    };

    // Delete picture
    const handleDeletePicture = () => {
        setEditForm({ ...editForm, profile_picture: "" });
    };

    // Handle file upload
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
        if (!allowedTypes.includes(file.type)) {
            showToast("Invalid file type. Please upload JPG, PNG, GIF, or WebP.", "error");
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            showToast("File too large. Maximum size is 5MB.", "error");
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await axiosClient.post("/upload-profile-picture", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });

            // Update form with relative URL from backend (for storage)
            // The backend returns /uploads/filename which we store as-is
            setEditForm({ ...editForm, profile_picture: res.data.url });
            showToast("Picture uploaded successfully!", "success");
        } catch (err: any) {
            console.error("Upload failed:", err);
            showToast(err.response?.data?.detail || "Failed to upload picture", "error");
        } finally {
            setUploading(false);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-gray-500">Loading profile...</div>
            </div>
        );
    }

    const displayName = profile?.full_name || `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() || "User";

    return (
        <div className="w-full">
            {/* Header */}
            <div className="mb-6">
                <Header title="Profile" />
            </div>

            {/* Edit Profile Button - Top Right */}
            <div className="flex justify-end mb-4">
                <button
                    onClick={openEditModal}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg"
                    style={{ backgroundColor: "#337AF7" }}
                >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit Profile
                </button>
            </div>

            {/* Outer Container - Groups all profile sections */}
            <div className="bg-white rounded-2xl shadow-sm border">
                {/* Profile Avatar Section */}
                <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 rounded-full bg-gray-200 overflow-hidden border-4 border-gray-100">
                            {profile?.profile_picture ? (
                                <img src={getImageUrl(profile.profile_picture)} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-500 text-2xl font-medium">
                                    {displayName.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                        <h2 className="text-xl font-semibold" style={{ color: "#B6252A" }}>{displayName}</h2>
                    </div>
                </div>

                {/* Personal Information Section */}
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-lg font-semibold mb-6" style={{ color: "#B6252A" }}>Personal Information</h3>
                    <div className="grid grid-cols-3 gap-x-8 gap-y-6">
                        <div>
                            <label className="block text-sm text-gray-500 mb-1">First Name</label>
                            <div className="text-gray-900">{profile?.first_name || "-"}</div>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-500 mb-1">Last Name</label>
                            <div className="text-gray-900">{profile?.last_name || "-"}</div>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-500 mb-1">Date of Birth</label>
                            <div className="text-gray-900">{profile?.date_of_birth || "-"}</div>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-500 mb-1">Email Address</label>
                            <div className="text-gray-900">{profile?.email || "-"}</div>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-500 mb-1">Phone Number</label>
                            <div className="text-gray-900">{profile?.phone_number || "-"}</div>
                        </div>
                    </div>
                </div>

                {/* Address Section */}
                <div className="p-6">
                    <h3 className="text-lg font-semibold mb-6" style={{ color: "#B6252A" }}>Address</h3>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                        <div>
                            <label className="block text-sm text-gray-500 mb-1">Country</label>
                            <div className="text-gray-900">{profile?.country || "-"}</div>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-500 mb-1">City</label>
                            <div className="text-gray-900">{profile?.city || "-"}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Profile Modal */}
            {
                editModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-start justify-center p-6 overflow-auto">
                        <div className="absolute inset-0 bg-black/40" onClick={handleCloseEditModal} />

                        <div className="relative bg-white rounded-lg shadow-xl overflow-hidden w-[500px] max-w-full my-8">
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b">
                                <h3 className="text-lg font-bold text-gray-900">Edit Profile</h3>
                                <button onClick={handleCloseEditModal} className="text-gray-500 hover:text-gray-700">
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Form */}
                            <div className="p-6 max-h-[70vh] overflow-auto">
                                {/* Avatar Section */}
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-16 h-16 rounded-full bg-gray-200 overflow-hidden">
                                        {editForm.profile_picture ? (
                                            <img src={getImageUrl(editForm.profile_picture)} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-500 text-xl font-medium">
                                                {(editForm.first_name || "U").charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        {/* Hidden file input */}
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/jpeg,image/png,image/gif,image/webp"
                                            onChange={handleFileUpload}
                                            className="hidden"
                                        />
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={uploading}
                                            className="px-3 py-1 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                                            style={{ borderColor: "#337AF7", color: "#337AF7" }}
                                        >
                                            {uploading ? "Uploading..." : "Change picture"}
                                        </button>
                                        <button
                                            onClick={handleDeletePicture}
                                            disabled={uploading}
                                            className="px-3 py-1 text-sm text-red-500 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50"
                                        >
                                            Delete picture
                                        </button>
                                    </div>
                                </div>

                                {/* Name Fields */}
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm text-[#55565B] mb-1">First Name</label>
                                        <input
                                            type="text"
                                            value={editForm.first_name}
                                            onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                                            className="w-full border rounded-lg px-3 py-2 text-sm text-[#55565B]"
                                            placeholder="First name"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-[#55565B] mb-1">First Name</label>
                                        <input
                                            type="text"
                                            value={editForm.last_name}
                                            onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                                            className="w-full border rounded-lg px-3 py-2 text-sm text-[#55565B]"
                                            placeholder="Last name"
                                        />
                                    </div>
                                </div>

                                {/* Date of Birth */}
                                <div className="mb-4">
                                    <label className="block text-sm text-[#55565B] mb-1">Date of Birth</label>
                                    <input
                                        type="date"
                                        value={editForm.date_of_birth}
                                        onChange={(e) => setEditForm({ ...editForm, date_of_birth: e.target.value })}
                                        className="w-full border rounded-lg px-3 py-2 text-sm text-[#55565B]"
                                    />
                                </div>

                                {/* Email (read-only) */}
                                <div className="mb-4">
                                    <label className="block text-sm text-[#55565B] mb-1">Email Address</label>
                                    <input
                                        type="email"
                                        value={profile?.email || ""}
                                        className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50"
                                        disabled
                                    />
                                </div>

                                {/* Phone Number */}
                                <div className="mb-4">
                                    <label className="block text-sm text-[#55565B] mb-1">Phone Number</label>
                                    <input
                                        type="tel"
                                        value={editForm.phone_number}
                                        onChange={(e) => setEditForm({ ...editForm, phone_number: e.target.value })}
                                        className="w-full border rounded-lg px-3 py-2 text-sm text-[#55565B]"
                                        placeholder="Phone number"
                                    />
                                </div>

                                {/* Country */}
                                <div className="mb-4">
                                    <label className="block text-sm text-[#55565B] mb-1">Country</label>
                                    <input
                                        type="text"
                                        value={editForm.country}
                                        onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                                        className="w-full border rounded-lg px-3 py-2 text-sm text-[#55565B]"
                                        placeholder="Country"
                                    />
                                </div>

                                {/* City */}
                                <div className="mb-4">
                                    <label className="block text-sm text-[#55565B] mb-1">City</label>
                                    <input
                                        type="text"
                                        value={editForm.city}
                                        onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                                        className="w-full border rounded-lg px-3 py-2 text-sm text-[#55565B]"
                                        placeholder="City"
                                    />
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex justify-end gap-3 px-6 py-4 border-t">
                                <button
                                    onClick={handleCloseEditModal}
                                    className="px-4 py-2 text-sm text-gray-700 border rounded-lg hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={!hasChanges() || saving}
                                    className={`px-4 py-2 text-sm text-white rounded-lg ${hasChanges() && !saving ? "bg-[#337AF7] hover:bg-blue-600" : "bg-gray-300 cursor-not-allowed"
                                        }`}
                                >
                                    {saving ? "Saving..." : "Edit"}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Discard Unsaved Changes Modal */}
            {
                discardModalOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
                        <div className="absolute inset-0 bg-black/40" onClick={() => setDiscardModalOpen(false)} />

                        <div className="relative bg-white rounded-lg shadow-xl overflow-hidden w-[400px] max-w-full">
                            <div className="p-6">
                                <h3 className="text-lg font-bold mb-2 text-gray-900">Discard Unsaved Changes?</h3>
                                <p className="text-gray-600 mb-6">Your unsaved change will be discarded.</p>

                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={() => setDiscardModalOpen(false)}
                                        className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleDiscard}
                                        className="px-4 py-2 text-sm text-white rounded-lg"
                                        style={{ backgroundColor: "#B6252A" }}
                                    >
                                        Discard
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Logout Confirmation Modal */}
            {
                logoutModalOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
                        <div className="absolute inset-0 bg-black/40" onClick={() => setLogoutModalOpen(false)} />

                        <div className="relative bg-white rounded-lg shadow-xl overflow-hidden w-[300px] max-w-full">
                            <div className="p-6 text-center">
                                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-yellow-100 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-yellow-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-bold mb-2 text-gray-900">Are you Logging out?</h3>
                                <p className="text-sm text-gray-500 mb-6">Are you sure you want to Log out?<br />You will have to log in again.</p>

                                <div className="flex justify-center gap-3">
                                    <button
                                        onClick={() => setLogoutModalOpen(false)}
                                        className="px-6 py-2 text-sm text-gray-700 border rounded-lg hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleLogout}
                                        className="px-6 py-2 text-sm text-white rounded-lg"
                                        style={{ backgroundColor: "#B6252A" }}
                                    >
                                        Log out
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            <Toast
                message={toast.message}
                type={toast.type}
                isVisible={toast.isVisible}
                onClose={hideToast}
            />
        </div >
    );
}
