"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import axiosClient from "../api/axiosClient";

/**
 * Interface for upcoming event from AI-powered API
 */
interface UpcomingEvent {
    event_id: number;
    title: string;
    start_date: string;
    end_date: string;
    start_time: string | null;
    end_time: string | null;
    days_until: number;
    project_name: string | null;
    ai_reminder: string | null;
}

/**
 * Interface for upcoming tasks response
 */
interface UpcomingTasksResponse {
    total_events: number;
    upcoming_events: UpcomingEvent[];
    ai_summary: string | null;
}

/**
 * NotificationDropdown - AI-Powered Notification Component
 * 
 * Displays upcoming tasks (within 3 days) with AI-generated reminders.
 * Shows a badge with count and a dropdown panel with notifications.
 */
export default function NotificationDropdown() {
    const router = useRouter();
    const dropdownRef = useRef<HTMLDivElement>(null);

    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [upcomingData, setUpcomingData] = useState<UpcomingTasksResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    /**
     * Fetch upcoming tasks with AI-generated reminders
     */
    const fetchUpcomingTasks = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await axiosClient.get("/notifications/upcoming");
            setUpcomingData(response.data);
        } catch (err: any) {
            console.error("Failed to fetch upcoming tasks:", err);
            setError("Gagal memuat notifikasi");
        } finally {
            setLoading(false);
        }
    };

    /**
     * Handle dropdown toggle
     */
    const toggleDropdown = () => {
        if (!isOpen) {
            fetchUpcomingTasks();
        }
        setIsOpen(!isOpen);
    };

    /**
     * Close dropdown when clicking outside
     */
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    /**
     * Get urgency color based on days until event
     */
    const getUrgencyColor = (daysUntil: number): string => {
        if (daysUntil === 0) return "bg-red-500";
        if (daysUntil === 1) return "bg-orange-500";
        return "bg-blue-500";
    };

    /**
     * Get urgency label
     */
    const getUrgencyLabel = (daysUntil: number): string => {
        if (daysUntil === 0) return "Hari Ini";
        if (daysUntil === 1) return "Besok";
        return `${daysUntil} hari lagi`;
    };

    /**
     * Format time display
     */
    const formatTime = (time: string | null): string => {
        if (!time) return "";
        return time;
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Icon Button */}
            <button
                onClick={toggleDropdown}
                className="relative p-2 rounded-full hover:bg-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Notifications"
                id="notification-bell-button"
            >
                <img
                    src={upcomingData && upcomingData.total_events > 0 ? "/notification.svg" : "/notif-off.svg"}
                    alt="notification"
                    className="w-6 h-6"
                />

                {/* Badge - Show count of upcoming events */}
                {upcomingData && upcomingData.total_events > 0 && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full animate-pulse">
                        {upcomingData.total_events > 9 ? "9+" : upcomingData.total_events}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div
                    className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden"
                    id="notification-dropdown-panel"
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3">
                        <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                            <span>🔔</span> Pengingat AI
                        </h3>
                        <p className="text-blue-100 text-sm">Tugas dalam 3 hari ke depan</p>
                    </div>

                    {/* Content */}
                    <div className="max-h-96 overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            </div>
                        ) : error ? (
                            <div className="p-4 text-center text-red-500">
                                <p>{error}</p>
                                <button
                                    onClick={fetchUpcomingTasks}
                                    className="mt-2 text-sm text-blue-600 hover:underline"
                                >
                                    Coba lagi
                                </button>
                            </div>
                        ) : upcomingData && upcomingData.total_events > 0 ? (
                            <>
                                {/* AI Summary */}
                                {upcomingData.ai_summary && (
                                    <div className="px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-b border-gray-100">
                                        <p className="text-sm text-gray-700 leading-relaxed">
                                            {upcomingData.ai_summary}
                                        </p>
                                    </div>
                                )}

                                {/* Event List */}
                                <div className="divide-y divide-gray-100">
                                    {upcomingData.upcoming_events.map((event) => (
                                        <div
                                            key={event.event_id}
                                            className="p-4 hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
                                            onClick={() => {
                                                setIsOpen(false);
                                                router.push(`/calendar?event=${event.event_id}`);
                                            }}
                                        >
                                            <div className="flex items-start gap-3">
                                                {/* Urgency Indicator */}
                                                <div className={`w-1 h-full min-h-[60px] rounded-full ${getUrgencyColor(event.days_until)}`}></div>

                                                <div className="flex-1 min-w-0">
                                                    {/* Event Title & Time */}
                                                    <div className="flex items-center justify-between gap-2">
                                                        <h4 className="font-medium text-gray-900 truncate">
                                                            {event.title}
                                                        </h4>
                                                        <span className={`text-xs px-2 py-0.5 rounded-full text-white ${getUrgencyColor(event.days_until)}`}>
                                                            {getUrgencyLabel(event.days_until)}
                                                        </span>
                                                    </div>

                                                    {/* Date & Time */}
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        📅 {event.start_date}
                                                        {event.start_time && <span> • ⏰ {formatTime(event.start_time)}</span>}
                                                        {event.project_name && <span> • 📁 {event.project_name}</span>}
                                                    </p>

                                                    {/* AI Reminder Message */}
                                                    {event.ai_reminder && (
                                                        <p className="text-sm text-gray-600 mt-2 bg-gray-50 rounded-lg p-2 border-l-2 border-blue-400">
                                                            {event.ai_reminder}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="p-8 text-center">
                                <div className="text-4xl mb-2">✨</div>
                                <p className="text-gray-600">Tidak ada tugas dalam 3 hari ke depan</p>
                                <p className="text-sm text-gray-400 mt-1">Waktu santai!</p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="border-t border-gray-100 p-3 bg-gray-50">
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                router.push("/notification");
                            }}
                            className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                            id="view-all-notifications-button"
                        >
                            Lihat semua notifikasi →
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
