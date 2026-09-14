"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { clearKitchenAccessSession, setKitchenAccessSession, } from "@/lib/auth-session";
import { createMyStudentKitchen, createMyStudentKitchenAccessSession, loadMyStudentKitchen, } from "@/lib/student-kitchen";
export function useStudentKitchenWorkspace(session) {
    const router = useRouter();
    const [studentKitchen, setStudentKitchen] = useState(null);
    const [studentKitchenNameDraft, setStudentKitchenNameDraft] = useState(session.name);
    const [studentKitchenMessage, setStudentKitchenMessage] = useState("");
    const [loadingKitchen, setLoadingKitchen] = useState(true);
    const [creatingStudentKitchen, setCreatingStudentKitchen] = useState(false);
    const [refreshingStudentKitchen, setRefreshingStudentKitchen] = useState(false);
    const [openingStudentKitchen, setOpeningStudentKitchen] = useState(false);
    useEffect(() => {
        let cancelled = false;
        async function initializeKitchen() {
            setLoadingKitchen(true);
            try {
                const kitchen = await loadMyStudentKitchen(session);
                if (cancelled) {
                    return;
                }
                syncKitchenState(kitchen, session.name, {
                    setStudentKitchen,
                    setStudentKitchenNameDraft,
                });
            }
            catch (error) {
                if (!cancelled) {
                    setStudentKitchenMessage(error instanceof Error ? error.message : "Could not load your student kitchen.");
                }
            }
            finally {
                if (!cancelled) {
                    setLoadingKitchen(false);
                }
            }
        }
        void initializeKitchen();
        return () => {
            cancelled = true;
        };
    }, [session]);
    function updateStudentKitchenNameDraft(value) {
        setStudentKitchenNameDraft(value);
        setStudentKitchenMessage("");
    }
    async function createStudentKitchen() {
        setCreatingStudentKitchen(true);
        setStudentKitchenMessage("");
        try {
            const createdKitchen = await createMyStudentKitchen(session, studentKitchenNameDraft);
            syncKitchenState(createdKitchen, session.name, {
                setStudentKitchen,
                setStudentKitchenNameDraft,
            });
            setStudentKitchenMessage("Student kitchen created. Admin approval is required before the workspace opens.");
        }
        catch (error) {
            if (error instanceof ApiError && error.status === 409) {
                try {
                    const existingKitchen = await loadMyStudentKitchen(session);
                    if (existingKitchen) {
                        syncKitchenState(existingKitchen, session.name, {
                            setStudentKitchen,
                            setStudentKitchenNameDraft,
                        });
                        setStudentKitchenMessage("Your student kitchen already exists. You can track it here.");
                        return;
                    }
                }
                catch {
                    // Fall through to the generic message below.
                }
            }
            setStudentKitchenMessage(error instanceof Error ? error.message : "Could not create your student kitchen.");
        }
        finally {
            setCreatingStudentKitchen(false);
        }
    }
    async function refreshStudentKitchenStatus() {
        setRefreshingStudentKitchen(true);
        setStudentKitchenMessage("");
        try {
            const kitchen = await loadMyStudentKitchen(session);
            syncKitchenState(kitchen, session.name, {
                setStudentKitchen,
                setStudentKitchenNameDraft,
            });
            setStudentKitchenMessage(kitchen ? "Student kitchen status refreshed." : "No student kitchen found yet.");
        }
        catch (error) {
            setStudentKitchenMessage(error instanceof Error ? error.message : "Could not refresh your student kitchen status.");
        }
        finally {
            setRefreshingStudentKitchen(false);
        }
    }
    async function openStudentKitchen() {
        setOpeningStudentKitchen(true);
        setStudentKitchenMessage("");
        try {
            const response = await createMyStudentKitchenAccessSession(session);
            setKitchenAccessSession({
                userId: response.user.userId,
                role: response.user.role,
                email: response.user.email,
                name: response.user.name,
                token: response.token,
                authSource: "login",
            });
            router.push("/kitchen/dashboard");
        }
        catch (error) {
            if (error instanceof ApiError && (error.status === 403 || error.status === 404)) {
                try {
                    const kitchen = await loadMyStudentKitchen(session);
                    syncKitchenState(kitchen, session.name, {
                        setStudentKitchen,
                        setStudentKitchenNameDraft,
                    });
                }
                catch {
                    clearKitchenAccessSession();
                }
            }
            setStudentKitchenMessage(error instanceof Error ? error.message : "Could not open your kitchen workspace.");
        }
        finally {
            setOpeningStudentKitchen(false);
        }
    }
    return {
        studentKitchen,
        studentKitchenNameDraft,
        studentKitchenMessage,
        loadingKitchen,
        creatingStudentKitchen,
        refreshingStudentKitchen,
        openingStudentKitchen,
        updateStudentKitchenNameDraft,
        createStudentKitchen,
        refreshStudentKitchenStatus,
        openStudentKitchen,
    };
}
function syncKitchenState(kitchen, defaultName, handlers) {
    handlers.setStudentKitchen(kitchen);
    handlers.setStudentKitchenNameDraft(kitchen ? kitchen.sellerName : defaultName);
    if (!kitchen || kitchen.status !== "approved") {
        clearKitchenAccessSession();
    }
}
