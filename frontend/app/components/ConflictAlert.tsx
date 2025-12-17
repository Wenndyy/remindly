// ConflictAlert.tsx - Schedule Conflict Alert with AI Suggestions
"use client";

import React from "react";

export interface TimeSuggestion {
    label: string;
    startTime: string;
    endTime: string;
}

export interface ConflictAlertProps {
    conflictingEventTitle: string;
    conflictingStartTime: string;
    conflictingEndTime: string;
    suggestedTimes: TimeSuggestion[];
    onSelectSuggestion: (startTime: string, endTime: string) => void;
    onKeepOriginal: () => void;
    isLoading?: boolean;
}

export default function ConflictAlert({
    conflictingEventTitle,
    conflictingStartTime,
    conflictingEndTime,
    suggestedTimes,
    onSelectSuggestion,
    onKeepOriginal,
    isLoading = false,
}: ConflictAlertProps) {
    return (
        <div className="mt-3 p-4 bg-red-50 border border-red-200 rounded-xl">
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                    <svg
                        className="w-4 h-4 text-red-600"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                    </svg>
                </div>
                <div>
                    <h4 className="text-sm font-semibold text-red-800">
                        Schedule Conflict Detected
                    </h4>
                    <p className="text-xs text-red-600">
                        Conflicts with "{conflictingEventTitle}" ({conflictingStartTime} - {conflictingEndTime})
                    </p>
                </div>
            </div>

            {/* AI Suggestions */}
            {isLoading ? (
                <div className="flex items-center gap-2 py-3">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-gray-600">Finding alternative times...</span>
                </div>
            ) : suggestedTimes.length > 0 ? (
                <div className="mt-3">
                    <div className="flex items-center gap-1.5 mb-2">
                        <svg
                            className="w-4 h-4 text-blue-500"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                            />
                        </svg>
                        <span className="text-xs font-medium text-gray-700">AI Suggestions:</span>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3">
                        {suggestedTimes.map((suggestion, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => onSelectSuggestion(suggestion.startTime, suggestion.endTime)}
                                className="px-3 py-2 text-xs font-medium rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-300 transition-all"
                            >
                                <span className="block text-[10px] text-blue-500 uppercase mb-0.5">
                                    {suggestion.label}
                                </span>
                                <span>{suggestion.startTime} - {suggestion.endTime}</span>
                            </button>
                        ))}
                    </div>
                </div>
            ) : null}

            {/* Action buttons */}
            <div className="flex gap-2 mt-3 pt-3 border-t border-red-200">
                <button
                    type="button"
                    onClick={onKeepOriginal}
                    className="flex-1 px-3 py-2 text-xs font-medium rounded-lg border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-all"
                >
                    ⚠️ Save Anyway (with conflict)
                </button>
            </div>
        </div>
    );
}
