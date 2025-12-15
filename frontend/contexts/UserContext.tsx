"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import axiosClient from "../app/api/axiosClient";

type UserProfile = {
    id: number;
    email: string;
    full_name: string | null;
    first_name: string | null;
    last_name: string | null;
    profile_picture: string | null;
    // Add other fields as needed
};

type UserContextType = {
    user: UserProfile | null;
    loading: boolean;
    refreshUser: () => Promise<void>;
    updateUser: (newUser: UserProfile) => void;
    clearUser: () => void;
};

const UserContext = createContext<UserContextType>({
    user: null,
    loading: true,
    refreshUser: async () => { },
    updateUser: () => { },
    clearUser: () => { },
});

export const useUser = () => useContext(UserContext);

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);

    // Set mounted after hydration to avoid SSR mismatch
    useEffect(() => {
        setMounted(true);
    }, []);

    const fetchUser = useCallback(async () => {
        // Only access localStorage after mount (client-side only)
        if (!mounted) {
            return;
        }

        try {
            // Check if token exists first to avoid unnecessary 401 calls
            const token = localStorage.getItem("access_token");
            if (!token) {
                setUser(null); // Clear user if no token
                setLoading(false);
                return;
            }

            const res = await axiosClient.get("/me");
            setUser(res.data);
        } catch (err) {
            console.error("Failed to fetch user context:", err);
            setUser(null); // Clear user on error
        } finally {
            setLoading(false);
        }
    }, [mounted]);

    useEffect(() => {
        if (mounted) {
            fetchUser();
        }
    }, [mounted, fetchUser]);

    const refreshUser = async () => {
        await fetchUser();
    };

    const updateUser = (newUser: UserProfile) => {
        setUser(newUser);
    };

    // Clear user data (call on logout)
    const clearUser = () => {
        setUser(null);
    };

    return (
        <UserContext.Provider value={{ user, loading, refreshUser, updateUser, clearUser }}>
            {children}
        </UserContext.Provider>
    );
};
