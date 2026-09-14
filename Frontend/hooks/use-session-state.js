"use client";
import { useEffect, useState } from "react";
import { AUTH_SESSION_CHANGED_EVENT, getAuthSession, getKitchenAccessSession, KITCHEN_ACCESS_SESSION_CHANGED_EVENT, } from "@/lib/auth-session";
const authSessionEvents = [AUTH_SESSION_CHANGED_EVENT];
const kitchenSessionEvents = [KITCHEN_ACCESS_SESSION_CHANGED_EVENT];
export function useAuthSessionState() {
    return useSessionState(getAuthSession, authSessionEvents);
}
export function useKitchenAccessSessionState() {
    return useSessionState(getKitchenAccessSession, kitchenSessionEvents);
}
function useSessionState(resolver, events) {
    const [session, setSession] = useState(null);
    const [hydrated, setHydrated] = useState(false);
    useEffect(() => {
        const syncSession = () => {
            const nextSession = resolver();
            setSession((currentSession) => areSessionsEqual(currentSession, nextSession) ? currentSession : nextSession);
            setHydrated(true);
        };
        syncSession();
        for (const eventName of events) {
            window.addEventListener(eventName, syncSession);
        }
        window.addEventListener("storage", syncSession);
        return () => {
            for (const eventName of events) {
                window.removeEventListener(eventName, syncSession);
            }
            window.removeEventListener("storage", syncSession);
        };
    }, [events, resolver]);
    return {
        hydrated,
        session,
    };
}
function areSessionsEqual(left, right) {
    if (left === right) {
        return true;
    }
    if (!left || !right) {
        return false;
    }
    return (left.userId === right.userId &&
        left.name === right.name &&
        left.email === right.email &&
        left.role === right.role &&
        left.authSource === right.authSource &&
        left.token === right.token);
}
