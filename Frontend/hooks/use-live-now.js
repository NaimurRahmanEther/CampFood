"use client";
import { useEffect, useState } from "react";
export function useLiveNow(intervalMs = 1000) {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const timerId = window.setInterval(() => {
            setNow(new Date());
        }, intervalMs);
        return () => {
            window.clearInterval(timerId);
        };
    }, [intervalMs]);
    return now;
}
