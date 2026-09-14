import { ApiError, authedFetch } from "@/lib/api";
export async function loadMyStudentKitchen(session) {
    try {
        const kitchen = await authedFetch("/student-kitchens/me", {}, session);
        return mapStudentKitchen(kitchen);
    }
    catch (error) {
        if (error instanceof ApiError && error.status === 404) {
            return null;
        }
        throw error;
    }
}
export async function createMyStudentKitchen(session, sellerName) {
    const kitchen = await authedFetch("/student-kitchens/me", {
        method: "POST",
        body: JSON.stringify({
            seller_name: sellerName.trim(),
        }),
    }, session);
    return mapStudentKitchen(kitchen);
}
export async function createMyStudentKitchenAccessSession(session) {
    return authedFetch("/student-kitchens/me/access", {
        method: "POST",
    }, session);
}
function mapStudentKitchen(kitchen) {
    return {
        userId: kitchen.user_id,
        sellerName: kitchen.seller_name,
        studentId: kitchen.student_id,
        email: kitchen.email,
        phoneNumber: kitchen.phone_number,
        hallName: kitchen.hall_name,
        status: kitchen.status,
        createdAt: kitchen.create_at,
        updatedAt: kitchen.update_at,
    };
}
