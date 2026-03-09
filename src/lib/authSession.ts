"use client";

export type LocalAuthSession = {
    userId: string;
    username: string;
    email?: string;
    mobile?: string;
};

const SESSION_KEY = "vizzi_auth_session";
const SESSION_EVENT = "vizzi_auth_session_changed";

const canUseStorage = () => typeof window !== "undefined";

export const getLocalSession = (): LocalAuthSession | null => {
    if (!canUseStorage()) return null;
    try {
        const raw = window.localStorage.getItem(SESSION_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as LocalAuthSession;
        if (!parsed?.userId) return null;
        return parsed;
    } catch {
        return null;
    }
};

export const setLocalSession = (session: LocalAuthSession) => {
    if (!canUseStorage()) return;
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    window.dispatchEvent(new CustomEvent(SESSION_EVENT));
};

export const clearLocalSession = () => {
    if (!canUseStorage()) return;
    window.localStorage.removeItem(SESSION_KEY);
    window.dispatchEvent(new CustomEvent(SESSION_EVENT));
};

export const addAuthSessionListener = (callback: () => void) => {
    if (!canUseStorage()) return () => undefined;
    const handler = () => callback();
    window.addEventListener(SESSION_EVENT, handler);
    return () => window.removeEventListener(SESSION_EVENT, handler);
};
