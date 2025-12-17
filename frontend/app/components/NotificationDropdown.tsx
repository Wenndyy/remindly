"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import axiosClient from "../api/axiosClient";

/**
 * Interface for upcoming event from API
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
    location: string | null;
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
 * Get today's date key for localStorage
 */
const getTodayKey = (): string => {
    const today = new Date();
    return `notif_read_${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

/**
 * NotificationDropdown - Today's Schedule Notification Component
 * 
 * Displays today's scheduled events with time and location.
 * Shows a red bell icon and a clean dropdown panel with notifications.
 * Supports Mark as Read / Mark as Unread toggle with localStorage persistence.
 */
export default function NotificationDropdown() {
    const router = useRouter();
    const dropdownRef = useRef<HTMLDivElement>(null);

    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [upcomingData, setUpcomingData] = useState<UpcomingTasksResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [markedAsRead, setMarkedAsRead] = useState(false);
    const [lastFetched, setLastFetched] = useState<number>(0);

    // Cache TTL: 5 minutes for client-side cache
    const CACHE_TTL_MS = 5 * 60 * 1000;

    /**
     * Check if already marked as read today (from localStorage)
     */
    const checkIfMarkedAsRead = (): boolean => {
        if (typeof window === 'undefined') return false;
        const todayKey = getTodayKey();
        return localStorage.getItem(todayKey) === 'true';
    };

    /**
     * Fetch today's schedule on mount (initial load)
     */
    useEffect(() => {
        setMarkedAsRead(checkIfMarkedAsRead());
        fetchUpcomingTasks(false);
    }, []);

    /**
     * Fetch today's schedule with caching support
     * @param isBackgroundRefresh - If true, don't show loading spinner
     */
    const fetchUpcomingTasks = async (isBackgroundRefresh: boolean = false) => {
        // Only show loading on initial fetch, not background refresh
        if (!isBackgroundRefresh) {
            setLoading(true);
        }
        setError(null);

        try {
            const response = await axiosClient.get("/notifications/upcoming");
            setUpcomingData(response.data);
            setLastFetched(Date.now());
        } catch (err: any) {
            console.error("Failed to fetch today's schedule:", err);
            // Only show error if no cached data available
            if (!upcomingData) {
                setError("Gagal memuat notifikasi");
            }
        } finally {
            if (!isBackgroundRefresh) {
                setLoading(false);
            }
        }
    };

    /**
     * Handle dropdown toggle with smart caching
     * - If cache exists and is fresh: show immediately, no fetch
     * - If cache exists but stale: show immediately, fetch in background
     * - If no cache: fetch and show loading
     */
    const toggleDropdown = () => {
        if (!isOpen) {
            const now = Date.now();
            const isCacheStale = now - lastFetched > CACHE_TTL_MS;

            if (upcomingData && !isCacheStale) {
                // Cache is fresh, just open dropdown instantly
                // No fetch needed
            } else if (upcomingData && isCacheStale) {
                // Have cached data but it's stale - refresh in background
                fetchUpcomingTasks(true);
            } else {
                // No cached data - need to fetch with loading
                fetchUpcomingTasks(false);
            }

            setMarkedAsRead(checkIfMarkedAsRead());
        }
        setIsOpen(!isOpen);
    };

    /**
     * Mark all as read - saves to localStorage
     */
    const handleMarkAllAsRead = async () => {
        try {
            await axiosClient.patch("/notifications/read-all");
            const todayKey = getTodayKey();
            localStorage.setItem(todayKey, 'true');
            cleanupOldKeys();
            setMarkedAsRead(true);
        } catch (err) {
            console.error("Failed to mark all as read:", err);
        }
    };

    /**
     * Mark as unread - removes from localStorage
     */
    const handleMarkAsUnread = () => {
        const todayKey = getTodayKey();
        localStorage.removeItem(todayKey);
        setMarkedAsRead(false);
    };

    /**
     * Clean up localStorage keys older than today
     */
    const cleanupOldKeys = () => {
        if (typeof window === 'undefined') return;
        const todayKey = getTodayKey();
        const keysToRemove: string[] = [];

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('notif_read_') && key !== todayKey) {
                keysToRemove.push(key);
            }
        }

        keysToRemove.forEach(key => localStorage.removeItem(key));
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
     * Format time display (e.g., "13.00 - 15.00")
     */
    const formatTimeRange = (startTime: string | null, endTime: string | null): string => {
        if (!startTime) return "";
        const start = startTime.replace(":", ".");
        if (!endTime) return start;
        const end = endTime.replace(":", ".");
        return `${start} - ${end}`;
    };

    const hasNotifications = upcomingData && upcomingData.total_events > 0;
    const todayCount = upcomingData?.total_events || 0;

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Icon Button */}
            <button
                onClick={toggleDropdown}
                className="relative p-1 rounded-full hover:bg-gray-100 transition-colors duration-200 focus:outline-none"
                aria-label="Notifications"
                id="notification-bell-button"
            >
                <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="drop-shadow-sm"
                >
                    <defs>
                        <linearGradient id="bellGradient" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
                            <stop stopColor={hasNotifications && !markedAsRead ? "#DC2626" : "#9CA3AF"} />
                            <stop offset="1" stopColor={hasNotifications && !markedAsRead ? "#7F1D1D" : "#6B7280"} />
                        </linearGradient>
                    </defs>
                    <path
                        d="M12 2C10.9 2 10 2.9 10 4V4.29C7.03 5.17 5 7.9 5 11V17L3 19V20H21V19L19 17V11C19 7.9 16.97 5.17 14 4.29V4C14 2.9 13.1 2 12 2ZM12 22C10.9 22 10 21.1 10 20H14C14 21.1 13.1 22 12 22Z"
                        fill="url(#bellGradient)"
                    />
                </svg>

                {/* Badge */}
                {hasNotifications && !markedAsRead && (
                    <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 rounded-full border-2 border-white">
                        {todayCount > 9 ? "9+" : todayCount}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div
                    className="absolute right-0 mt-3 w-[380px] bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden"
                    id="notification-dropdown-panel"
                    style={{ boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}
                >
                    {/* Speech bubble pointer */}
                    <div className="absolute -top-2 right-6 w-4 h-4 bg-white transform rotate-45 border-l border-t border-gray-100"></div>

                    {/* Header */}
                    <div className="px-5 pt-5 pb-3 flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">Notification</h3>
                            {todayCount > 0 && (
                                <p className="text-sm text-gray-500 mt-0.5">
                                    You have {todayCount} meeting{todayCount > 1 ? 's' : ''} today
                                </p>
                            )}
                        </div>

                        {/* Toggle Button: Mark as Read / Mark as Unread */}
                        {hasNotifications && (
                            markedAsRead ? (
                                <button
                                    onClick={handleMarkAsUnread}
                                    className="text-sm text-blue-500 hover:text-blue-700 transition-colors"
                                >
                                    Mark as unread
                                </button>
                            ) : (
                                <button
                                    onClick={handleMarkAllAsRead}
                                    className="text-sm text-gray-400 hover:text-red-600 transition-colors"
                                >
                                    Mark all as read
                                </button>
                            )
                        )}
                    </div>

                    {/* Content */}
                    <div className="px-5 pb-5 max-h-80 overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-red-500"></div>
                            </div>
                        ) : error ? (
                            <div className="py-6 text-center">
                                <p className="text-gray-500 text-sm">{error}</p>
                                <button
                                    onClick={() => fetchUpcomingTasks(false)}
                                    className="mt-2 text-sm text-red-600 hover:underline"
                                >
                                    Coba lagi
                                </button>
                            </div>
                        ) : hasNotifications ? (
                            <div className="space-y-3">
                                {upcomingData.upcoming_events.map((event) => (
                                    <div
                                        key={event.event_id}
                                        className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                                        onClick={() => {
                                            setIsOpen(false);
                                            router.push(`/calendar?event=${event.event_id}`);
                                        }}
                                    >
                                        {/* Time & Location */}
                                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                                            <span>{formatTimeRange(event.start_time, event.end_time)}</span>
                                            {event.location && (
                                                <>
                                                    <span className="text-gray-300">•</span>
                                                    <span>{event.location}</span>
                                                </>
                                            )}
                                            {!event.location && event.project_name && (
                                                <>
                                                    <span className="text-gray-300">•</span>
                                                    <span>{event.project_name}</span>
                                                </>
                                            )}
                                        </div>

                                        {/* Event Title */}
                                        <span className="text-sm font-semibold text-gray-900 hover:text-red-600 transition-colors">
                                            {event.title}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-8 text-center">
                                <div className="text-4xl mb-3">🎉</div>
                                <p className="text-gray-600 font-medium">No meetings today</p>
                                <p className="text-sm text-gray-400 mt-1">Enjoy your free time!</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
