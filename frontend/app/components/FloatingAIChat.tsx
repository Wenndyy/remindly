"use client";

import React, { useState, useRef, useEffect } from "react";
import { useChatContext } from "../../contexts/ChatContext";
import { useUser } from "../../contexts/UserContext";
import axiosClient from "../api/axiosClient";
import { checkTimeConflict, validateTimeOrder, EventForConflictCheck } from "../utils/conflictDetection";

// Types
type ScheduleItem = {
    title: string;
    date: string;
    start_time: string;
    end_time: string;
    notes?: string;
    category?: string;
    meeting_type?: string;  // 'online' or 'onsite'
    location?: string;      // Location if specified by user
};

type ScheduleProposal = {
    title?: string;
    timezone?: string;
    items: ScheduleItem[];
};

type Message = {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
    scheduleProposal?: ScheduleProposal;
};

type ChatMessage = {
    role: string;
    content: string;
};

export default function FloatingAIChat() {
    const { messages, setMessages, isOpen, setIsOpen, clearMessages, setUserId } = useChatContext();
    const { user, loading: userLoading } = useUser();

    const [inputValue, setInputValue] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [existingEvents, setExistingEvents] = useState<EventForConflictCheck[]>([]);
    const [addingSchedule, setAddingSchedule] = useState<string | null>(null);
    const [addResult, setAddResult] = useState<{ messageId: string; success: number; conflicts: number; errors: string[] } | null>(null);
    const [showMenu, setShowMenu] = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // Sync userId with user context for scoped localStorage
    useEffect(() => {
        if (user?.id) {
            setUserId(String(user.id));
        } else {
            setUserId(null);
        }
    }, [user?.id, setUserId]);

    // Fetch existing events for conflict detection
    useEffect(() => {
        // Skip if user not logged in
        if (!user) return;

        const fetchEvents = async () => {
            try {
                const res = await axiosClient.get("/events");
                const events = res.data.map((ev: Record<string, unknown>) => ({
                    id: ev.id as number,
                    title: ev.title as string,
                    startDate: ev.start_date as string,
                    startTime: ev.start_time as string || "00:00",
                    endTime: ev.end_time as string || "23:59",
                    allDay: ev.all_day as boolean
                }));
                setExistingEvents(events);
            } catch (error) {
                console.error("Failed to fetch events for conflict check:", error);
            }
        };
        if (isOpen) {
            fetchEvents();
        }
    }, [isOpen, user]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (isOpen && user) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isOpen, user]);

    // Focus input when popup opens
    useEffect(() => {
        if (isOpen && user) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen, user]);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
        };

        if (showMenu) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showMenu]);

    // Handle clear chat with confirmation
    const handleClearChat = () => {
        clearMessages();
        setShowClearConfirm(false);
        setShowMenu(false);
    };

    // Don't render anything if user is not logged in
    if (!userLoading && !user) {
        return null;
    }

    const generateMessageId = () => {
        return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    };

    const handleSendMessage = async () => {
        if (!inputValue.trim() || isTyping) return;

        const userMessage: Message = {
            id: generateMessageId(),
            role: "user",
            content: inputValue.trim(),
            timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMessage]);
        const userInput = inputValue.trim();
        setInputValue("");
        setIsTyping(true);

        try {
            // Build conversation history for context (exclude welcome message only)
            const conversationHistory: ChatMessage[] = messages
                .filter(m => m.id !== "welcome")
                .map(m => ({ role: m.role, content: m.content }));

            // Build request body - only include history if not empty
            const requestBody: Record<string, unknown> = {
                message: userInput,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
            };

            if (conversationHistory.length > 0) {
                requestBody.conversation_history = conversationHistory;
            }

            console.log("[AI Chat] Sending request:", requestBody);
            const response = await axiosClient.post("/ai/chat", requestBody);

            const data = response.data;
            console.log("[AI Chat] Response received:", data);

            // Check for error type response from backend
            if (data.type === "error") {
                const errorMessage: Message = {
                    id: generateMessageId(),
                    role: "assistant",
                    content: data.message || "Maaf, terjadi kesalahan. Silakan coba lagi.",
                    timestamp: new Date(),
                };
                setMessages((prev) => [...prev, errorMessage]);
                return;
            }

            const assistantMessage: Message = {
                id: generateMessageId(),
                role: "assistant",
                content: data.message || "I received your message.",
                timestamp: new Date(),
            };

            // If schedule proposal, attach it to the message
            if (data.type === "schedule_proposal" && data.schedule) {
                assistantMessage.scheduleProposal = data.schedule;
            }

            setMessages((prev) => [...prev, assistantMessage]);
        } catch (error: any) {
            console.error("[AI Chat] Error:", error);
            console.error("[AI Chat] Error response:", error?.response?.data);

            // Get specific error message if available
            let errorContent = "AI service is temporarily unavailable. Please try again later.";
            if (error?.response?.data?.detail) {
                errorContent = `Error: ${error.response.data.detail}`;
            } else if (error?.response?.data?.message) {
                errorContent = error.response.data.message;
            } else if (error?.message) {
                errorContent = `Connection error: ${error.message}`;
            }

            const errorMessage: Message = {
                id: generateMessageId(),
                role: "assistant",
                content: errorContent,
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleAddToSchedule = async (messageId: string, items: ScheduleItem[]) => {
        setAddingSchedule(messageId);
        setAddResult(null);

        const results = { success: 0, conflicts: 0, errors: [] as string[] };

        for (const item of items) {
            // Validate time order
            const timeError = validateTimeOrder(item.start_time, item.end_time);
            if (timeError) {
                results.errors.push(`${item.title}: ${timeError}`);
                continue;
            }

            // Check for conflicts
            const conflictResult = checkTimeConflict(
                {
                    title: item.title,
                    startDate: item.date,
                    startTime: item.start_time,
                    endTime: item.end_time,
                    allDay: false
                },
                existingEvents
            );
            if (conflictResult.hasConflict) {
                results.conflicts++;
                results.errors.push(`${item.title}: ${conflictResult.message}`);
                continue;
            }

            try {
                // Normalize meeting_type to lowercase for backend
                const meetingType = (item.meeting_type || 'onsite').toLowerCase();
                console.log(`[AI Schedule] Creating event: ${item.title}, meeting_type: ${meetingType}, location: ${item.location || 'none'}`);

                await axiosClient.post("/events", {
                    title: item.title,
                    start_date: item.date,
                    end_date: item.date,
                    start_time: item.start_time,
                    end_time: item.end_time,
                    description: item.notes || "",
                    all_day: false,
                    meeting_type: meetingType,
                    location: item.location || null
                });
                results.success++;

                // Add to existing events for subsequent conflict checks
                setExistingEvents(prev => [...prev, {
                    id: Date.now(),
                    title: item.title,
                    startDate: item.date,
                    startTime: item.start_time,
                    endTime: item.end_time,
                    allDay: false
                }]);

                // Dispatch global event to update UI in other components
                window.dispatchEvent(new Event('events-updated'));
            } catch (error) {
                console.error("Failed to create event:", error);
                results.errors.push(`${item.title}: Failed to save`);
            }
        }

        setAddResult({ messageId, ...results });
        setAddingSchedule(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        });
    };

    return (
        <>
            {/* Chat Popup */}
            {isOpen && (
                <div
                    className="fixed bottom-20 right-6 w-[400px] max-w-[calc(100vw-48px)] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50"
                    style={{ height: "520px", maxHeight: "calc(100vh - 120px)" }}
                >
                    {/* Header */}
                    <div
                        className="flex items-center justify-between px-4 py-3"
                        style={{ background: "linear-gradient(135deg, #B6252A 0%, #8b1b1f 100%)" }}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-white font-semibold text-sm">AI Schedule Assistant</h3>
                                <p className="text-white/70 text-xs">{isTyping ? "Thinking..." : "Online"}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            {/* Three-dot menu */}
                            <div className="relative" ref={menuRef}>
                                <button
                                    onClick={() => setShowMenu(!showMenu)}
                                    className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
                                    title="Menu"
                                >
                                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                                        <circle cx="12" cy="5" r="1.5" />
                                        <circle cx="12" cy="12" r="1.5" />
                                        <circle cx="12" cy="19" r="1.5" />
                                    </svg>
                                </button>
                                {/* Dropdown menu */}
                                {showMenu && (
                                    <div className="absolute right-0 top-10 w-40 bg-white rounded-lg shadow-lg py-1 z-50">
                                        <button
                                            onClick={() => {
                                                setShowMenu(false);
                                                setShowClearConfirm(true);
                                            }}
                                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                        >
                                            <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                            Clear chat
                                        </button>
                                    </div>
                                )}
                            </div>
                            {/* Close button */}
                            <button
                                onClick={() => setIsOpen(false)}
                                className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
                            >
                                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Clear Chat Confirmation Modal */}
                    {showClearConfirm && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 rounded-2xl">
                            <div className="bg-white rounded-xl p-5 mx-4 shadow-xl max-w-[320px]">
                                <h4 className="text-lg font-semibold text-gray-900 mb-2">Clear chat?</h4>
                                <p className="text-sm text-gray-600 mb-4">
                                    Are you sure you want to clear this chat? This action cannot be undone.
                                </p>
                                <div className="flex gap-3 justify-end">
                                    <button
                                        onClick={() => setShowClearConfirm(false)}
                                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleClearChat}
                                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                                    >
                                        Clear chat
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                        {messages.map((message) => (
                            <div key={message.id}>
                                <div className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                                    <div
                                        className={`max-w-[85%] rounded-2xl px-4 py-2 ${message.role === "user"
                                            ? "bg-[#B6252A] text-white rounded-br-md"
                                            : "bg-white text-gray-800 shadow-sm rounded-bl-md"
                                            }`}
                                    >
                                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                                        <p className={`text-[10px] mt-1 ${message.role === "user" ? "text-white/60" : "text-gray-400"}`}>
                                            {formatTime(message.timestamp)}
                                        </p>
                                    </div>
                                </div>

                                {/* Schedule Proposal Panel */}
                                {message.scheduleProposal && message.scheduleProposal.items?.length > 0 && (
                                    <div className="mt-2 ml-0 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                        <div className="px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
                                            <h4 className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                Proposed Schedule ({message.scheduleProposal.items.length} items)
                                            </h4>
                                        </div>
                                        <div className="max-h-32 overflow-y-auto">
                                            {message.scheduleProposal.items.map((item, idx) => (
                                                <div key={idx} className="px-3 py-2 border-b border-gray-50 last:border-0 text-xs">
                                                    <div className="font-medium text-gray-800">{item.title}</div>
                                                    <div className="text-gray-500 mt-0.5">
                                                        {item.date} • {item.start_time} – {item.end_time}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Result feedback */}
                                        {addResult?.messageId === message.id && (
                                            <div className={`px-3 py-2 text-xs ${addResult.success > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                                {addResult.success > 0 && <span>✓ {addResult.success} added</span>}
                                                {addResult.conflicts > 0 && <span className="ml-2">⚠ {addResult.conflicts} conflicts</span>}
                                                {addResult.errors.length > 0 && (
                                                    <div className="mt-1 text-[10px]">
                                                        {addResult.errors.slice(0, 2).map((e, i) => <div key={i}>{e}</div>)}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className="flex gap-2 p-2 bg-gray-50">
                                            <button
                                                onClick={() => handleAddToSchedule(message.id, message.scheduleProposal!.items)}
                                                disabled={addingSchedule === message.id || addResult?.messageId === message.id}
                                                className="flex-1 py-1.5 px-3 text-xs font-medium rounded-lg bg-[#B6252A] text-white hover:bg-[#9a1f23] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            >
                                                {addingSchedule === message.id ? "Adding..." : addResult?.messageId === message.id ? "Added" : "Add to Schedule"}
                                            </button>
                                            <button
                                                onClick={() => setAddResult({ messageId: message.id, success: 0, conflicts: 0, errors: ["Discarded"] })}
                                                disabled={addResult?.messageId === message.id}
                                                className="py-1.5 px-3 text-xs font-medium rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition-colors"
                                            >
                                                Discard
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Typing indicator */}
                        {isTyping && (
                            <div className="flex justify-start">
                                <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                                    <div className="flex items-center gap-1">
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-3 bg-white border-t border-gray-100">
                        <div className="flex items-center gap-2">
                            <input
                                ref={inputRef}
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Describe what you want to schedule…"
                                className="flex-1 px-4 py-2.5 bg-gray-100 rounded-full text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#B6252A]/20"
                                disabled={isTyping}
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={!inputValue.trim() || isTyping}
                                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${inputValue.trim() && !isTyping
                                    ? "bg-[#B6252A] text-white hover:bg-[#9a1f23]"
                                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                                    }`}
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Action Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 z-50 ${isOpen
                    ? "bg-gray-700 hover:bg-gray-800"
                    : "bg-[#B6252A] hover:bg-[#9a1f23]"
                    }`}
                style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.25)" }}
            >
                {isOpen ? (
                    <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                ) : (
                    <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                )}
            </button>
        </>
    );
}
