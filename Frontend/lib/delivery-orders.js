import { authedFetch } from "@/lib/api";
export async function loadDeliveryOrders(scope = "mine", sessionOverride) {
    const orders = await authedFetch(buildOrdersPath(scope), {}, sessionOverride);
    return Array.isArray(orders) ? orders : [];
}
export async function createDeliveryOrder(input) {
    return authedFetch("/orders", {
        method: "POST",
        body: JSON.stringify({
            routeMode: input.routeMode ?? "free-first",
            deliveryDetails: input.deliveryDetails,
            items: input.items,
        }),
    }, input.session);
}
export async function acceptDeliveryOrder(orderId, courierSession, plan) {
    try {
        await authedFetch(`/delivery-orders/${orderId}/accept`, {
            method: "POST",
            body: JSON.stringify({ plan }),
        }, courierSession);
        return {
            ok: true,
            orders: await loadDeliveryOrders("queue", courierSession),
        };
    }
    catch (error) {
        return {
            ok: false,
            error: error instanceof Error ? error.message : "Could not accept order.",
            orders: await safeLoadOrders("queue", courierSession),
        };
    }
}
export async function completeDeliveryOrder(orderId, courierSession) {
    try {
        const response = await authedFetch(`/delivery-orders/${orderId}/complete`, {
            method: "POST",
        }, courierSession);
        return {
            ok: true,
            orders: await loadDeliveryOrders("queue", courierSession),
            rewardPoints: response.rewardPoints,
        };
    }
    catch (error) {
        return {
            ok: false,
            error: error instanceof Error ? error.message : "Could not complete order.",
            orders: await safeLoadOrders("queue", courierSession),
        };
    }
}
export async function sendDeliveryOrderMessage(orderId, session, message) {
    return authedFetch(`/delivery-orders/${orderId}/chat`, {
        method: "POST",
        body: JSON.stringify({ message }),
    }, session);
}
export async function forwardOrderToPaidDelivery(orderId, adminSession) {
    try {
        await authedFetch(`/delivery-orders/${orderId}/forward-to-paid`, {
            method: "POST",
        }, adminSession);
        return {
            ok: true,
            orders: await loadDeliveryOrders("all", adminSession),
        };
    }
    catch (error) {
        return {
            ok: false,
            error: error instanceof Error ? error.message : "Could not forward order.",
            orders: await safeLoadOrders("all", adminSession),
        };
    }
}
export async function cancelDeliveryOrder(orderId, adminSession, reason) {
    try {
        await authedFetch(`/delivery-orders/${orderId}/cancel`, {
            method: "POST",
            body: JSON.stringify({ reason }),
        }, adminSession);
        return {
            ok: true,
            orders: await loadDeliveryOrders("all", adminSession),
        };
    }
    catch (error) {
        return {
            ok: false,
            error: error instanceof Error ? error.message : "Could not cancel order.",
            orders: await safeLoadOrders("all", adminSession),
        };
    }
}
async function safeLoadOrders(scope, sessionOverride) {
    try {
        return await loadDeliveryOrders(scope, sessionOverride);
    }
    catch {
        return [];
    }
}
function buildOrdersPath(scope) {
    return `/delivery-orders?scope=${encodeURIComponent(scope)}`;
}
