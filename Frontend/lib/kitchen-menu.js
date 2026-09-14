import { authedFetch, resolveBackendAssetUrl } from "@/lib/api";
export async function loadKitchenMenu(session) {
    const items = await authedFetch("/foods/mine", {}, session);
    const normalizedItems = Array.isArray(items) ? items : [];
    return normalizedItems.map(mapKitchenFoodItem);
}
export async function createKitchenFood(session, input) {
    const formData = createFoodFormData(input);
    const item = await authedFetch("/foods", {
        method: "POST",
        body: formData,
    }, session);
    return mapKitchenFoodItem(item);
}
export async function updateKitchenFood(session, foodId, input) {
    const formData = createFoodFormData(input);
    const item = await authedFetch(`/foods/${foodId}`, {
        method: "PUT",
        body: formData,
    }, session);
    return mapKitchenFoodItem(item);
}
export async function deleteKitchenFood(session, foodId) {
    await authedFetch(`/foods/${foodId}`, {
        method: "DELETE",
    }, session);
}
function createFoodFormData(input) {
    const formData = new FormData();
    formData.append("food_name", input.name.trim());
    formData.append("category", input.category.trim());
    formData.append("meal_time", input.mealTime);
    formData.append("food_option", input.foodOption);
    formData.append("price", String(Math.max(0, Math.round(input.price))));
    formData.append("stock", String(Math.max(0, Math.floor(input.stock))));
    formData.append("visible", String(input.isAvailable));
    if (input.imageFile) {
        formData.append("image", input.imageFile);
    }
    return formData;
}
function mapKitchenFoodItem(item) {
    return {
        id: String(item.id),
        name: item.food_name,
        category: normalizeKitchenCategory(item.category),
        mealTime: normalizeKitchenMealTime(item.meal_time ?? item.category),
        foodOption: normalizeKitchenFoodOption(item.food_option ?? item.category),
        price: Number(item.price) || 0,
        stock: item.stock,
        isAvailable: item.visible,
        imageUrl: resolveBackendAssetUrl(item.image),
        approvalStatus: item.approval_status || "pending",
        updatedAt: item.update_at,
    };
}
function normalizeKitchenMealTime(value) {
    if (typeof value !== "string") {
        return "Any Time";
    }
    const normalized = value.trim().toLowerCase();
    if (normalized.startsWith("[lunch]") ||
        normalized.includes("lunch") ||
        normalized.includes("launch")) {
        return "Lunch";
    }
    if (normalized.startsWith("[dinner]") || normalized.includes("dinner")) {
        return "Dinner";
    }
    return "Any Time";
}
function normalizeKitchenCategory(value) {
    if (typeof value !== "string") {
        return "";
    }
    return value
        .replace(/^\[(Lunch|Dinner|Any Time)\]\s*/i, "")
        .replace(/^\[(Single|System|Package|Set Menu|Set Manu|Combo)\]\s*/i, "")
        .trim();
}
function normalizeKitchenFoodOption(value) {
    if (typeof value !== "string") {
        return "Single";
    }
    const normalized = value.trim().toLowerCase();
    if (/\[(lunch|dinner|any time)\]\s*\[(system|package|set menu|set manu|combo)\]/i.test(normalized)) {
        return "System";
    }
    if (/\[(lunch|dinner|any time)\]\s*\[(single|single item|one)\]/i.test(normalized)) {
        return "Single";
    }
    if (/\[(system|package|set menu|set manu|combo)\]/i.test(normalized)) {
        return "System";
    }
    if (/\[(single|single item|one)\]/i.test(normalized)) {
        return "Single";
    }
    if (normalized.includes("system") ||
        normalized.includes("set menu") ||
        normalized.includes("set manu") ||
        normalized.includes("package") ||
        normalized.includes("combo")) {
        return "System";
    }
    if (normalized.includes("single")) {
        return "Single";
    }
    return "Single";
}
