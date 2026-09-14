export const FREE_DELIVERY_CLAIM_WINDOW_MINUTES = 5;
export const DELIVERY_PARTNER_MAX_ACTIVE_ORDERS = 3;
const FREE_DELIVERY_CLAIM_WINDOW_MS = FREE_DELIVERY_CLAIM_WINDOW_MINUTES * 60 * 1000;
export function formatDeliveryPlanLabel(plan) {
    return plan === "free" ? "Free Delivery Partner" : "Permanent Delivery Partner";
}
export function formatDeliveryRegistrationStatusLabel(status) {
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
export function getFreeQueueDeadline(createdAt) {
    return new Date(new Date(createdAt).getTime() + FREE_DELIVERY_CLAIM_WINDOW_MS);
}
export function getFreeQueueTimeRemainingMs(createdAt, now = new Date()) {
    return getFreeQueueDeadline(createdAt).getTime() - now.getTime();
}
export function isFreeQueueWindowOpen(order, now = new Date()) {
    return (order.status === "pending" &&
        order.routeMode === "free-first" &&
        getFreeQueueTimeRemainingMs(order.createdAt, now) > 0);
}
export function canAdminForwardFreeQueueOrder(order, now = new Date()) {
    return (order.status === "pending" &&
        order.routeMode === "free-first" &&
        getFreeQueueTimeRemainingMs(order.createdAt, now) <= 0);
}
export function formatDurationFromMs(durationMs) {
    const totalSeconds = Math.max(0, Math.ceil(durationMs / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes <= 0) {
        return `${seconds}s`;
    }
    return `${minutes}m ${seconds}s`;
}
export function getFreeQueueStatusText(order, now = new Date()) {
    if (order.status === "canceled") {
        return "Order canceled";
    }
    if (order.status === "delivered") {
        return "Delivery completed";
    }
    if (order.status === "accepted") {
        return "Already assigned";
    }
    if (order.routeMode === "paid-only") {
        return "Ready for paid delivery service";
    }
    const remainingMs = getFreeQueueTimeRemainingMs(order.createdAt, now);
    if (remainingMs <= 0) {
        return "Waiting for paid delivery service";
    }
    return `Available for free delivery for ${formatDurationFromMs(remainingMs)}`;
}
export function hasAnyApprovedDeliveryPlan(statuses, isFreeDeliveryPartner) {
    return isFreeDeliveryPartner || statuses.free === "approved" || statuses.permanent === "approved";
}
export function getAllowedDeliveryPlans(statuses, isFreeDeliveryPartner) {
    const plans = [];
    if (isFreeDeliveryPartner || statuses.free === "approved") {
        plans.push("free");
    }
    if (statuses.permanent === "approved") {
        plans.push("permanent");
    }
    return plans;
}
