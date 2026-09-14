import { apiFetch } from "@/lib/api";
export async function loginStudent(input) {
    const response = await apiFetch("/students/login", {
        method: "POST",
        body: JSON.stringify({
            student_id: input.studentId.trim(),
            email: input.email.trim().toLowerCase(),
            password: input.password,
        }),
    });
    return mapAuthenticatedUser(response, "student");
}
export async function loginKitchen(role, input) {
    const response = await apiFetch(resolveKitchenLoginPath(role), {
        method: "POST",
        body: JSON.stringify({
            email: input.email.trim().toLowerCase(),
            password: input.password,
        }),
    });
    return mapAuthenticatedUser(response, role);
}
export async function registerStudent(input) {
    await apiFetch("/students", {
        method: "POST",
        body: JSON.stringify({
            full_name: input.fullName.trim(),
            student_id: input.studentId.trim(),
            email: input.email.trim().toLowerCase(),
            password: input.password,
            phone_number: input.phoneNumber.trim(),
            hall_name: input.hallName.trim(),
            department: input.department.trim(),
        }),
    });
}
export async function registerHallKitchen(input) {
    await apiFetch("/hall-kitchens", {
        method: "POST",
        body: JSON.stringify({
            kitchen_name: input.kitchenName.trim(),
            manager_phone: input.managerPhone.trim(),
            email: input.email.trim().toLowerCase(),
            password: input.password,
            phone_number: input.phoneNumber.trim(),
            hall_name: input.hallName.trim(),
            subscription: input.subscriptionFee,
        }),
    });
}
export async function registerCampusKitchen(input) {
    await apiFetch("/camp-kitchens", {
        method: "POST",
        body: JSON.stringify({
            kitchen_name: input.kitchenName.trim(),
            location: input.location.trim(),
            manager_phone: input.managerPhone.trim(),
            email: input.email.trim().toLowerCase(),
            password: input.password,
            phone_number: input.phoneNumber.trim(),
            trade_license: input.tradeLicense.trim(),
            subscription: input.subscriptionFee,
        }),
    });
}
function resolveKitchenLoginPath(role) {
    return role === "hall-kitchen" ? "/hall-kitchens/login" : "/camp-kitchens/login";
}
function mapAuthenticatedUser(response, fallbackRole) {
    return {
        userId: response.user.userId,
        role: isUserRole(response.user.role) ? response.user.role : fallbackRole,
        email: response.user.email.trim().toLowerCase(),
        name: response.user.name.trim(),
        token: response.token,
    };
}
function isUserRole(role) {
    return (role === "student" ||
        role === "hall-kitchen" ||
        role === "campus-kitchen" ||
        role === "student-kitchen" ||
        role === "admin");
}
