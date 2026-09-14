import { loadDeliveryRegistrationStatuses } from "@/lib/admin-approvals";
import { getAllowedDeliveryPlans, isFreeQueueWindowOpen } from "@/lib/delivery-partner";
import { loadDeliveryOrders, } from "@/lib/delivery-orders";
import { loadStudentPointState } from "@/lib/student-points";
export async function loadDeliveryWorkspace(session) {
    const [pointState, registrationStatuses] = await Promise.all([
        loadStudentPointState(session),
        loadDeliveryRegistrationStatuses(session.email),
    ]);
    const allowedPlans = getAllowedDeliveryPlans(registrationStatuses, pointState.isFreeDeliveryPartner);
    const orders = allowedPlans.length > 0 ? await loadDeliveryOrders("queue", session) : [];
    return {
        pointState,
        registrationStatuses,
        allowedPlans,
        orders,
    };
}
export function resolveActiveDeliveryPlan(allowedPlans, currentPlan) {
    if (currentPlan && allowedPlans.includes(currentPlan)) {
        return currentPlan;
    }
    return allowedPlans[0] ?? null;
}
export function getPendingOrdersForPlan(orders, activePlan) {
    if (!activePlan) {
        return [];
    }
    return orders.filter((order) => {
        if (order.status !== "pending") {
            return false;
        }
        if (activePlan === "free") {
            return order.routeMode === "free-first";
        }
        return order.routeMode === "paid-only";
    });
}
export function getActionablePendingOrders(orders, allowedPlans, now, viewerUserId) {
    return orders.filter((order) => {
        if (viewerUserId && order.studentUserId === viewerUserId) {
            return false;
        }
        if (order.status !== "pending") {
            return false;
        }
        if (order.routeMode === "paid-only") {
            return allowedPlans.includes("permanent");
        }
        return allowedPlans.includes("free") && isFreeQueueWindowOpen(order, now);
    });
}
export function getExpiredFreeQueueOrders(orders, now, viewerUserId) {
    return orders.filter((order) => (!viewerUserId || order.studentUserId !== viewerUserId) &&
        order.status === "pending" &&
        order.routeMode === "free-first" &&
        !isFreeQueueWindowOpen(order, now));
}
export function getAcceptedOrdersForUser(orders, userId) {
    return orders.filter((order) => order.status === "accepted" && order.assignedToUserId === userId);
}
export function getDeliveredOrdersForUser(orders, userId, limit = 8) {
    return orders
        .filter((order) => order.status === "delivered" && order.assignedToUserId === userId)
        .slice(0, limit);
}
