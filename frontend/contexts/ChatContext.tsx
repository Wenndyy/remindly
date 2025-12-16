"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

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

type ChatContextType = {
    messages: Message[];
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
    isOpen: boolean;
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "welcome",
            role: "assistant",
            content: "Hello! I'm your AI Schedule Assistant. I can help you create schedules, plan study sessions, set up meetings, and more. Just describe what you want to schedule!",
            timestamp: new Date(),
        },
    ]);
    const [isOpen, setIsOpen] = useState(false);

    return (
        <ChatContext.Provider value={{ messages, setMessages, isOpen, setIsOpen }}>
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
