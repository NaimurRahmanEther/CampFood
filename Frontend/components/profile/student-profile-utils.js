"use client";
export function getInitials(name) {
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) {
        return "U";
    }
    if (words.length === 1) {
        return words[0].slice(0, 2).toUpperCase();
    }
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
}
export function formatFreeStatusLabel(status) {
    if (status === "approved") {
        return "Approved";
    }
    if (status === "pending") {
        return "Pending";
    }
    if (status === "rejected") {
        return "Rejected";
    }
    return "Not Registered";
}
export function formatStudentKitchenStatusLabel(status) {
    if (status === "approved") {
        return "Approved";
    }
    if (status === "rejected") {
        return "Rejected";
    }
    return "Pending Approval";
}
export function getStudentKitchenBadgeVariant(status) {
    if (status === "approved") {
        return "default";
    }
    if (status === "rejected") {
        return "destructive";
    }
    return "secondary";
}
export function getStudentKitchenStatusMessage(status) {
    if (status === "approved") {
        return "Your kitchen is approved. Open the workspace to manage menu items, stock, and sales.";
    }
    if (status === "rejected") {
        return "Your kitchen was rejected by admin. Please contact admin before trying to proceed.";
    }
    return "Your kitchen registration is waiting for admin approval. Refresh this status later to check again.";
}
