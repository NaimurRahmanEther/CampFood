import { loadApprovalRequests } from "@/lib/admin-approvals";
import { loadDeliveryOrders } from "@/lib/delivery-orders";
export async function loadAdminDashboardData(sessionOverride) {
    const [requests, orders] = await Promise.all([
        loadApprovalRequests(sessionOverride),
        loadDeliveryOrders("all", sessionOverride),
    ]);
    return {
        requests,
        orders,
    };
}
