import { getAuthSession } from "@/lib/auth-session";
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:8000";
const ASSET_PLACEHOLDER_URL = "/placeholder.svg";
const API_ASSET_BASE_URL = resolveApiAssetBaseUrl(API_BASE_URL);
export class ApiError extends Error {
    status;
    body;
    constructor(message, status, body) {
        super(message);
        this.status = status;
        this.body = body;
    }
}
export async function apiFetch(path, init = {}) {
    const headers = new Headers(init.headers);
    const method = (init.method || "GET").toUpperCase();
    if (!(init.body instanceof FormData) && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }
    const requestInit = {
        ...init,
        headers,
    };
    if (!requestInit.cache && (method === "GET" || method === "HEAD")) {
        requestInit.cache = "no-store";
    }
    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...requestInit,
    });
    const body = await parseResponse(response);
    if (!response.ok) {
        throw new ApiError(extractErrorMessage(body), response.status, body);
    }
    return body;
}
export async function authedFetch(path, init = {}, sessionOverride) {
    const session = sessionOverride ?? getAuthSession();
    if (!session?.token) {
        throw new Error("Please login first.");
    }
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${session.token}`);
    return apiFetch(path, {
        ...init,
        headers,
    });
}
export function resolveBackendAssetUrl(path) {
    if (!path) {
        return ASSET_PLACEHOLDER_URL;
    }
    const raw = path.trim();
    if (!raw) {
        return ASSET_PLACEHOLDER_URL;
    }
    const normalized = raw.replace(/\\/g, "/");
    if (normalized.startsWith("http://") ||
        normalized.startsWith("https://") ||
        normalized.startsWith("data:") ||
        normalized.startsWith("blob:")) {
        return encodeURI(normalized);
    }
    if (normalized.startsWith("/uploads/")) {
        return encodeURI(`${API_ASSET_BASE_URL}${normalized}`);
    }
    if (normalized.startsWith("uploads/")) {
        return encodeURI(`${API_ASSET_BASE_URL}/${normalized}`);
    }
    // Handle filesystem-style or mixed paths that still contain /uploads/...
    const uploadsIndex = normalized.toLowerCase().indexOf("/uploads/");
    if (uploadsIndex >= 0) {
        const uploadsPath = normalized.slice(uploadsIndex);
        return encodeURI(`${API_ASSET_BASE_URL}${uploadsPath}`);
    }
    return encodeURI(normalized);
}
function resolveApiAssetBaseUrl(apiBaseUrl) {
    try {
        return new URL(apiBaseUrl).origin;
    }
    catch {
        return apiBaseUrl;
    }
}
async function parseResponse(response) {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
        return response.json();
    }
    const text = await response.text();
    return text ? { message: text } : null;
}
function extractErrorMessage(body) {
    if (typeof body === "string" && body.trim()) {
        return body;
    }
    if (body && typeof body === "object") {
        const candidate = body;
        if (typeof candidate.message === "string" && candidate.message.trim()) {
            return candidate.message;
        }
        if (typeof candidate.error === "string" && candidate.error.trim()) {
            return candidate.error;
        }
        if (typeof candidate.status === "string" && candidate.status.trim()) {
            return candidate.status;
        }
    }
    return "Request failed";
}
