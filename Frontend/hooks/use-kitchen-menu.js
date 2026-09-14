"use client";
import { useEffect, useState } from "react";
import { createKitchenFood, deleteKitchenFood, loadKitchenMenu, updateKitchenFood, } from "@/lib/kitchen-menu";
export function useKitchenMenu(session) {
    const [items, setItems] = useState([]);
    const [ready, setReady] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loadError, setLoadError] = useState("");
    useEffect(() => {
        let cancelled = false;
        async function syncMenu() {
            if (!session) {
                setItems([]);
                setLoadError("");
                setReady(false);
                return;
            }
            setReady(false);
            setLoadError("");
            try {
                const loadedItems = await loadKitchenMenu(session);
                if (!cancelled) {
                    setItems(loadedItems);
                    setLoadError("");
                }
            }
            catch (error) {
                if (!cancelled) {
                    setItems([]);
                    setLoadError(error instanceof Error ? error.message : "Could not load kitchen menu.");
                }
            }
            finally {
                if (!cancelled) {
                    setReady(true);
                }
            }
        }
        void syncMenu();
        return () => {
            cancelled = true;
        };
    }, [session?.token, session?.userId]);
    async function refresh() {
        if (!session) {
            return;
        }
        try {
            const loadedItems = await loadKitchenMenu(session);
            setItems(loadedItems);
            setLoadError("");
        }
        catch (error) {
            setLoadError(error instanceof Error ? error.message : "Could not refresh kitchen menu.");
        }
    }
    async function createItem(input) {
        if (!session) {
            throw new Error("Please login first.");
        }
        setSaving(true);
        try {
            const created = await createKitchenFood(session, input);
            setItems((current) => [created, ...current]);
            return created;
        }
        finally {
            setSaving(false);
        }
    }
    async function updateItem(foodId, input) {
        if (!session) {
            throw new Error("Please login first.");
        }
        setSaving(true);
        try {
            const updated = await updateKitchenFood(session, foodId, input);
            setItems((current) => current.map((item) => (item.id === foodId ? updated : item)));
            return updated;
        }
        finally {
            setSaving(false);
        }
    }
    async function removeItem(foodId) {
        if (!session) {
            throw new Error("Please login first.");
        }
        setSaving(true);
        try {
            await deleteKitchenFood(session, foodId);
            setItems((current) => current.filter((item) => item.id !== foodId));
        }
        finally {
            setSaving(false);
        }
    }
    return {
        items,
        ready,
        saving,
        loadError,
        refresh,
        createItem,
        updateItem,
        removeItem,
    };
}
