"use client";
import { useEffect, useRef } from "react";
export function useAutoRefresh({ enabled = true, intervalMs, onRefresh, }) {
    const refreshRef = useRef(onRefresh);
    refreshRef.current = onRefresh;
    useEffect(() => {
        if (!enabled) {
            return;
        }
        const refresh = () => {
            void refreshRef.current();
        };
        const handleVisibility = () => {
            if (document.visibilityState === "visible") {
                refresh();
            }
        };
        const intervalId = window.setInterval(refresh, intervalMs);
        window.addEventListener("focus", refresh);
        document.addEventListener("visibilitychange", handleVisibility);
        return () => {
            window.clearInterval(intervalId);
            window.removeEventListener("focus", refresh);
            document.removeEventListener("visibilitychange", handleVisibility);
        };
    }, [enabled, intervalMs]);
}
