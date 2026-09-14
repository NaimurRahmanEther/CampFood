import { authedFetch } from "@/lib/api";
const DEFAULT_NOTIFICATION_LIMIT = 20;
export async function loadNotifications(session, limit = DEFAULT_NOTIFICATION_LIMIT) {
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : DEFAULT_NOTIFICATION_LIMIT;
    return authedFetch(`/me/notifications?limit=${encodeURIComponent(String(safeLimit))}`, {}, session);
}
export async function markAllNotificationsRead(session) {
    await authedFetch("/me/notifications/read-all", {
        method: "POST",
    }, session);
}
export async function markNotificationRead(notificationId, session) {
    await authedFetch(`/me/notifications/${encodeURIComponent(notificationId)}/read`, {
        method: "POST",
    }, session);
}
