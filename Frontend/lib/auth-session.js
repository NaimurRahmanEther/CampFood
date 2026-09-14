const STORAGE_KEY = "ru-food-express.auth-session";
const KITCHEN_ACCESS_STORAGE_KEY = "ru-food-express.kitchen-access-session";
const AUTH_SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
export const AUTH_SESSION_CHANGED_EVENT = "ru-food-express.auth-session-changed";
export const KITCHEN_ACCESS_SESSION_CHANGED_EVENT = "ru-food-express.kitchen-access-session-changed";
export function isKitchenRole(role) {
    return role === "hall-kitchen" || role === "campus-kitchen" || role === "student-kitchen";
}
export function isAdminRole(role) {
    return role === "admin";
}
export function getRoleHomePath(role) {
    if (role === "student") {
        return "/browse-food";
    }
    if (role === "admin") {
        return "/admin/dashboard";
    }
    return "/kitchen/dashboard";
}
export function getAuthPagePath(input) {
    const params = new URLSearchParams();
    if (input?.role) {
        params.set("role", input.role);
    }
    if (input?.mode) {
        params.set("mode", input.mode);
    }
    const safeNext = resolveSafeNextPath(input?.next);
    if (safeNext) {
        params.set("next", safeNext);
    }
    const query = params.toString();
    return query ? `/auth?${query}` : "/auth";
}
export function getPostAuthPath(_role, next) {
    return resolveSafeNextPath(next) ?? "/";
}
export function getRoleLabel(role) {
    if (role === "student") {
        return "Student";
    }
    if (role === "hall-kitchen") {
        return "Hall Kitchen";
    }
    if (role === "campus-kitchen") {
        return "Campus Kitchen";
    }
    if (role === "admin") {
        return "Admin";
    }
    return "Student Kitchen";
}
export function getSessionStorageKey() {
    return STORAGE_KEY;
}
export function getAuthSession() {
    return readSessionFromStorage(STORAGE_KEY);
}
export function getKitchenAccessSession() {
    const session = readSessionFromStorage(KITCHEN_ACCESS_STORAGE_KEY);
    if (!session || !isKitchenRole(session.role)) {
        return null;
    }
    return session;
}
export function setAuthSession(input) {
    return persistSession(STORAGE_KEY, AUTH_SESSION_CHANGED_EVENT, input);
}
export function setKitchenAccessSession(input) {
    if (!isKitchenRole(input.role)) {
        throw new Error("Kitchen access session must use a kitchen role.");
    }
    return persistSession(KITCHEN_ACCESS_STORAGE_KEY, KITCHEN_ACCESS_SESSION_CHANGED_EVENT, input);
}
export function clearKitchenAccessSession() {
    removeSessionFromStorage(KITCHEN_ACCESS_STORAGE_KEY, KITCHEN_ACCESS_SESSION_CHANGED_EVENT);
}
export function clearAuthSession() {
    removeSessionFromStorage(STORAGE_KEY, AUTH_SESSION_CHANGED_EVENT);
    removeSessionFromStorage(KITCHEN_ACCESS_STORAGE_KEY, KITCHEN_ACCESS_SESSION_CHANGED_EVENT);
}
export function updateAuthSessionName(name) {
    const currentSession = getAuthSession();
    if (!currentSession) {
        return null;
    }
    const normalizedName = name.trim();
    if (!normalizedName) {
        return currentSession;
    }
    const updatedSession = {
        ...currentSession,
        name: normalizedName,
    };
    if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSession));
        emitSessionChanged(AUTH_SESSION_CHANGED_EVENT);
    }
    return updatedSession;
}
export function resolveGetStartedPath() {
    const session = getAuthSession();
    if (!session) {
        return getAuthPagePath({
            role: "student",
            mode: "login",
            next: getRoleHomePath("student"),
        });
    }
    return getRoleHomePath(session.role);
}
export function resolveSafeNextPath(value) {
    if (!value) {
        return null;
    }
    const normalizedValue = value.trim();
    if (!normalizedValue.startsWith("/") ||
        normalizedValue.startsWith("//") ||
        normalizedValue.startsWith("/auth")) {
        return null;
    }
    return normalizedValue;
}
function persistSession(storageKey, eventName, input) {
    const email = input.email.trim().toLowerCase();
    const role = input.role;
    const name = input.name?.trim() || getDefaultNameByRole(role);
    const token = input.token.trim();
    const session = {
        userId: input.userId?.trim() || `${role}:${email}`,
        role,
        email,
        name,
        token,
        authSource: input.authSource,
        signedInAt: new Date().toISOString(),
    };
    if (typeof window !== "undefined") {
        window.localStorage.setItem(storageKey, JSON.stringify(session));
        emitSessionChanged(eventName);
    }
    return session;
}
function readSessionFromStorage(storageKey) {
    if (typeof window !== "undefined") {
        const raw = window.localStorage.getItem(storageKey);
        if (!raw) {
            return null;
        }
        try {
            const parsed = JSON.parse(raw);
            if (typeof parsed.userId !== "string" ||
                typeof parsed.role !== "string" ||
                typeof parsed.email !== "string" ||
                typeof parsed.name !== "string" ||
                typeof parsed.token !== "string" ||
                typeof parsed.authSource !== "string" ||
                typeof parsed.signedInAt !== "string") {
                return null;
            }
            if (!isUserRole(parsed.role)) {
                return null;
            }
            if (parsed.authSource !== "login" && parsed.authSource !== "register") {
                return null;
            }
            const signedInAtTimestamp = Date.parse(parsed.signedInAt);
            if (Number.isNaN(signedInAtTimestamp)) {
                return null;
            }
            if (Date.now() - signedInAtTimestamp >= AUTH_SESSION_MAX_AGE_MS) {
                window.localStorage.removeItem(storageKey);
                return null;
            }
            return parsed;
        }
        catch {
            return null;
        }
    }
    return null;
}
function removeSessionFromStorage(storageKey, eventName) {
    if (typeof window !== "undefined") {
        window.localStorage.removeItem(storageKey);
        emitSessionChanged(eventName);
    }
}
function isUserRole(role) {
    return (role === "student" ||
        role === "hall-kitchen" ||
        role === "campus-kitchen" ||
        role === "student-kitchen" ||
        role === "admin");
}
function getDefaultNameByRole(role) {
    if (role === "student") {
        return "Student User";
    }
    if (role === "hall-kitchen") {
        return "Hall Kitchen Manager";
    }
    if (role === "campus-kitchen") {
        return "Campus Kitchen Manager";
    }
    if (role === "admin") {
        return "System Admin";
    }
    return "Student Kitchen Seller";
}
function emitSessionChanged(eventName) {
    if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(eventName));
    }
}
