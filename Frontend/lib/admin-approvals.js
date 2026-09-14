import { apiFetch, authedFetch } from "@/lib/api";
export async function loadApprovalRequests(sessionOverride) {
    const requests = await authedFetch("/admin/approvals", {}, sessionOverride);
    return Array.isArray(requests) ? requests : [];
}
export async function submitApprovalRequest(input) {
    return apiFetch("/approval-requests", {
        method: "POST",
        body: JSON.stringify(input),
    });
}
export async function reviewApprovalRequest(requestId, status, reviewNote, sessionOverride) {
    await authedFetch(`/admin/approvals/${requestId}`, {
        method: "PATCH",
        body: JSON.stringify({
            status,
            reviewNote: reviewNote?.trim() || "",
        }),
    }, sessionOverride);
}
export async function loadDeliveryRegistrationStatus(email, plan) {
    const response = await apiFetch(`/approval-requests/status?type=delivery-registration&email=${encodeURIComponent(email)}&plan=${plan}`);
    return response.status;
}
export const getDeliveryRegistrationStatus = loadDeliveryRegistrationStatus;
export async function loadDeliveryRegistrationStatuses(email) {
    const [free, permanent] = await Promise.all([
        loadDeliveryRegistrationStatus(email, "free"),
        loadDeliveryRegistrationStatus(email, "permanent"),
    ]);
    return {
        free,
        permanent,
    };
}
