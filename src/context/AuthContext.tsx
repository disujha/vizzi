"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { getCurrentUser, fetchUserAttributes, signOut as amplifySignOut } from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";
import { configureAmplify } from "@/lib/amplify";
import { addAuthSessionListener, clearLocalSession, getLocalSession } from "@/lib/authSession";

configureAmplify();

export interface AmplifyUser {
    userId: string;
    username: string;
    email?: string;
    mobile?: string;
}

interface AuthContextType {
    user: AmplifyUser | null;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<AmplifyUser | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchUser = async () => {
        const localSession = getLocalSession();
        if (localSession?.userId) {
            setUser({
                userId: localSession.userId,
                username: localSession.username,
                email: localSession.email,
                mobile: localSession.mobile,
            });
            setLoading(false);
            return;
        }

        // Real AWS Auth
        try {
            const [current, attributes] = await Promise.all([
                getCurrentUser(),
                fetchUserAttributes()
            ]);
            setUser({
                userId: current.userId,
                username: current.username,
                email: attributes.email?.toLowerCase()
            });
        } catch {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUser();

        const unsubscribe = Hub.listen("auth", ({ payload }) => {
            switch (payload.event) {
                case "signedIn":
                    fetchUser();
                    break;
                case "signedOut":
                    setUser(null);
                    break;
            }
        });

        const unlistenLocalSession = addAuthSessionListener(() => {
            fetchUser();
        });

        return () => {
            unsubscribe();
            unlistenLocalSession();
        };
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);

export const signOut = async () => {
    clearLocalSession();
    try {
        await amplifySignOut();
    } catch {
        // Local session already cleared; ignore Amplify sign-out failures.
    }
};
