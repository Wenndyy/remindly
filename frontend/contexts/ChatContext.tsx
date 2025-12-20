"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

// Schedule proposal types
type ScheduleItem = {
    title: string;
    date: string;
    start_time: string;
    end_time: string;
    notes?: string;
    category?: string;
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

// Storage format for localStorage (dates as strings)
type StoredMessage = Omit<Message, 'timestamp'> & { timestamp: string };

type ChatContextType = {
    messages: Message[];
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
    isOpen: boolean;
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    clearMessages: () => void;
    userId: string | null;
    setUserId: (id: string | null) => void;
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const STORAGE_KEY_PREFIX = "remindly_chat_history_";
const WELCOME_MESSAGE: Message = {
    id: "welcome",
    role: "assistant",
    content: "Hello! I'm your AI Schedule Assistant. I can help you create schedules, plan study sessions, set up meetings, and more. Just describe what you want to schedule!",
    timestamp: new Date(),
};

export function ChatProvider({ children }: { children: ReactNode }) {
    const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
    const [isOpen, setIsOpen] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);

    // Get storage key for current user
    const getStorageKey = useCallback(() => {
        if (!userId) return null;
        return `${STORAGE_KEY_PREFIX}${userId}`;
    }, [userId]);

    // Load messages from localStorage when userId changes
    useEffect(() => {
        const key = getStorageKey();
        if (!key) {
            // No user, reset to welcome message
            setMessages([{ ...WELCOME_MESSAGE, timestamp: new Date() }]);
            setIsInitialized(true);
            return;
        }

        try {
            const stored = localStorage.getItem(key);
            if (stored) {
                const parsed: StoredMessage[] = JSON.parse(stored);
                const loadedMessages: Message[] = parsed.map(msg => ({
                    ...msg,
                    timestamp: new Date(msg.timestamp)
                }));
                // Ensure we have at least the welcome message
                if (loadedMessages.length === 0) {
                    setMessages([{ ...WELCOME_MESSAGE, timestamp: new Date() }]);
                } else {
                    setMessages(loadedMessages);
                }
            } else {
                // No stored messages, use welcome message
                setMessages([{ ...WELCOME_MESSAGE, timestamp: new Date() }]);
            }
        } catch (error) {
            console.error("Failed to load chat history from localStorage:", error);
            // Fallback to welcome message on error
            setMessages([{ ...WELCOME_MESSAGE, timestamp: new Date() }]);
        }
        setIsInitialized(true);
    }, [userId, getStorageKey]);

    // Save messages to localStorage when they change
    useEffect(() => {
        // Don't save before initialization or without userId
        if (!isInitialized || !userId) return;

        const key = getStorageKey();
        if (!key) return;

        try {
            const toStore: StoredMessage[] = messages.map(msg => ({
                ...msg,
                timestamp: msg.timestamp.toISOString()
            }));
            localStorage.setItem(key, JSON.stringify(toStore));
        } catch (error) {
            console.error("Failed to save chat history to localStorage:", error);
        }
    }, [messages, userId, isInitialized, getStorageKey]);

    // Clear messages for current user
    const clearMessages = useCallback(() => {
        const key = getStorageKey();
        if (key) {
            try {
                localStorage.removeItem(key);
            } catch (error) {
                console.error("Failed to clear chat history from localStorage:", error);
            }
        }
        // Reset to welcome message
        setMessages([{ ...WELCOME_MESSAGE, timestamp: new Date() }]);
    }, [getStorageKey]);

    return (
        <ChatContext.Provider value={{
            messages,
            setMessages,
            isOpen,
            setIsOpen,
            clearMessages,
            userId,
            setUserId
        }}>
            {children}
        </ChatContext.Provider>
    );
}

export function useChatContext() {
    const context = useContext(ChatContext);
    if (context === undefined) {
        throw new Error("useChatContext must be used within a ChatProvider");
    }
    return context;
}
