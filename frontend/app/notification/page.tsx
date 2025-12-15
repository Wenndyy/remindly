"use client";

import React, { useState, useEffect } from "react";
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
 * NotificationPage - Full Notification List View
 * 
 * Displays all upcoming tasks with AI-generated reminders in a
 * comprehensive list format with filtering and actions.
 */
export default function NotificationPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [upcomingData, setUpcomingData] = useState<UpcomingTasksResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkedAuth, setCheckedAuth] = useState(false);

  /**
   * Check authentication and fetch notifications
   */
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
        // Verify authentication
        await axiosClient.get("/me");
        if (!mounted) return;
        setCheckedAuth(true);

        // Fetch upcoming tasks with AI reminders
        const response = await axiosClient.get("/notifications/upcoming");
        if (!mounted) return;
        setUpcomingData(response.data);
      } catch (err: any) {
        console.error("Failed to load notifications:", err);
        if (err.response?.status === 401) {
          localStorage.removeItem("access_token");
          router.replace("/login");
        } else {
          setError("Gagal memuat notifikasi. Silakan coba lagi.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    bootstrap();

    return () => {
      mounted = false;
    };
  }, [router]);

  /**
   * Get urgency color based on days until event
   */
  const getUrgencyColor = (daysUntil: number): string => {
    if (daysUntil === 0) return "from-red-500 to-red-600";
    if (daysUntil === 1) return "from-orange-500 to-orange-600";
    if (daysUntil === 2) return "from-yellow-500 to-yellow-600";
    return "from-blue-500 to-blue-600";
  };

  /**
   * Get urgency badge color
   */
  const getUrgencyBadge = (daysUntil: number): string => {
    if (daysUntil === 0) return "bg-red-100 text-red-700 border-red-200";
    if (daysUntil === 1) return "bg-orange-100 text-orange-700 border-orange-200";
    if (daysUntil === 2) return "bg-yellow-100 text-yellow-700 border-yellow-200";
    return "bg-blue-100 text-blue-700 border-blue-200";
  };

  /**
   * Get urgency label
   */
  const getUrgencyLabel = (daysUntil: number): string => {
    if (daysUntil === 0) return "🔴 Hari Ini";
    if (daysUntil === 1) return "🟠 Besok";
    if (daysUntil === 2) return "🟡 Lusa";
    return `🔵 ${daysUntil} hari lagi`;
  };

  /**
   * Format date for display
   */
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  if (!checkedAuth || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat notifikasi...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-5xl mb-4">😕</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <span className="text-3xl">🔔</span>
          Notifikasi & Pengingat AI
        </h1>
        <p className="text-gray-600">
          Pengingat cerdas untuk tugas dalam 3 hari ke depan
        </p>
      </div>

      {/* AI Summary Card */}
      {upcomingData?.ai_summary && (
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 mb-8 text-white shadow-lg">
          <div className="flex items-start gap-4">
            <div className="text-4xl">🤖</div>
            <div>
              <h2 className="text-xl font-semibold mb-2">Ringkasan AI</h2>
              <p className="text-purple-100 leading-relaxed">
                {upcomingData.ai_summary}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-3xl font-bold text-blue-600">
            {upcomingData?.total_events ?? 0}
          </div>
          <div className="text-sm text-gray-500">Total Tugas</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-3xl font-bold text-red-600">
            {upcomingData?.upcoming_events.filter(e => e.days_until === 0).length ?? 0}
          </div>
          <div className="text-sm text-gray-500">Hari Ini</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-3xl font-bold text-orange-600">
            {upcomingData?.upcoming_events.filter(e => e.days_until === 1).length ?? 0}
          </div>
          <div className="text-sm text-gray-500">Besok</div>
        </div>
      </div>

      {/* Event List */}
      {upcomingData && upcomingData.total_events > 0 ? (
        <div className="space-y-4">
          {upcomingData.upcoming_events.map((event, index) => (
            <div
              key={event.event_id}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-200"
            >
              {/* Urgency Bar */}
              <div className={`h-1 bg-gradient-to-r ${getUrgencyColor(event.days_until)}`}></div>

              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    {/* Title & Badge */}
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900">
                        {event.title}
                      </h3>
                      <span className={`text-xs px-2 py-1 rounded-full border ${getUrgencyBadge(event.days_until)}`}>
                        {getUrgencyLabel(event.days_until)}
                      </span>
                    </div>

                    {/* Meta Info */}
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-4">
                      <span className="flex items-center gap-1">
                        📅 {formatDate(event.start_date)}
                      </span>
                      {event.start_time && (
                        <span className="flex items-center gap-1">
                          ⏰ {event.start_time}
                          {event.end_time && ` - ${event.end_time}`}
                        </span>
                      )}
                      {event.project_name && (
                        <span className="flex items-center gap-1">
                          📁 {event.project_name}
                        </span>
                      )}
                    </div>

                    {/* AI Reminder */}
                    {event.ai_reminder && (
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border-l-4 border-blue-500">
                        <div className="flex items-start gap-2">
                          <span className="text-lg">💡</span>
                          <p className="text-gray-700 leading-relaxed">
                            {event.ai_reminder}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => router.push(`/calendar?event=${event.event_id}`)}
                    className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors whitespace-nowrap"
                  >
                    Lihat Detail
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="text-6xl mb-4">✨</div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            Tidak ada tugas dalam 3 hari ke depan
          </h3>
          <p className="text-gray-500 mb-6">
            Selamat! Jadwalmu kosong. Waktu yang tepat untuk bersantai atau merencanakan hal baru.
          </p>
          <button
            onClick={() => router.push("/calendar")}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md"
          >
            Buat Tugas Baru
          </button>
        </div>
      )}

      {/* Back to Dashboard */}
      <div className="mt-8 text-center">
        <button
          onClick={() => router.push("/dashboard")}
          className="text-gray-500 hover:text-gray-700 transition-colors"
        >
          ← Kembali ke Dashboard
        </button>
      </div>
    </div>
  );
}
