import { ApiError } from "@/lib/api";
export function getErrorMessage(error, fallback = "Something went wrong. Please try again.") {
    if (error instanceof ApiError) {
        const bodyMessage = extractMessageFromBody(error.body);
        if (bodyMessage) {
            return normalizeErrorMessage(bodyMessage, fallback);
        }
    }
    if (error instanceof Error && error.message.trim()) {
        return normalizeErrorMessage(error.message, fallback);
    }
    return fallback;
}
function extractMessageFromBody(body) {
    if (typeof body === "string" && body.trim()) {
        return body;
    }
    if (!body || typeof body !== "object") {
        return null;
    }
    const record = body;
    const directMessage = pickFirstString(record, ["message", "error", "status", "detail"]);
    if (directMessage) {
        return directMessage;
    }
    const nestedErrors = record.errors;
    const nestedMessage = extractNestedValidationMessage(nestedErrors);
    if (nestedMessage) {
        return nestedMessage;
    }
    return null;
}
function pickFirstString(record, keys) {
    for (const key of keys) {
        const value = record[key];
        if (typeof value === "string" && value.trim()) {
            return value;
        }
    }
    return null;
}
function extractNestedValidationMessage(value) {
    if (!value) {
        return null;
    }
    if (typeof value === "string" && value.trim()) {
        return value;
    }
    if (Array.isArray(value)) {
        for (const item of value) {
            const message = extractNestedValidationMessage(item);
            if (message) {
                return message;
            }
        }
        return null;
    }
    if (typeof value === "object") {
        const record = value;
        const directMessage = pickFirstString(record, ["message", "error"]);
        if (directMessage) {
            return directMessage;
        }
        for (const nested of Object.values(record)) {
            const nestedMessage = extractNestedValidationMessage(nested);
            if (nestedMessage) {
                return nestedMessage;
            }
        }
    }
    return null;
}
function normalizeErrorMessage(message, fallback) {
    const normalized = message.trim();
    if (!normalized) {
        return fallback;
    }
    const lowered = normalized.toLowerCase();
    if (lowered.includes("no rows in result set")) {
        return "Invalid credentials. Please check your details and try again.";
    }
    if (lowered.includes("duplicate key value violates unique constraint") ||
        lowered.includes("duplicate key")) {
        return "This information is already in use. Please use different details.";
    }
    if (lowered.startsWith("pq:") || lowered.includes("sql")) {
        return fallback;
    }
    return normalized;
}
