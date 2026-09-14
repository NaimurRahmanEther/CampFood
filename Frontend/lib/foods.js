import { apiFetch, authedFetch, resolveBackendAssetUrl } from "@/lib/api";
const FOOD_OPTION_LABELS = {
    Single: "Single Item",
    System: "Package / Set Menu",
};
export function getFoodOptionLabel(option) {
    return FOOD_OPTION_LABELS[normalizeFoodOption(option)];
}
export function getFoodOptionHelperText(option) {
    const normalized = normalizeFoodOption(option);
    if (normalized === "System") {
        return "Package / set menu (for example: rice + dal + vegetable + chicken/beef).";
    }
    return "Single item (for example: rice, vegetable, dal, ruti, chicken, beef).";
}
export async function loadFoodCatalog(query = {}) {
    const params = new URLSearchParams();
    if (query.search?.trim()) {
        params.set("search", query.search.trim());
    }
    if (query.providerType) {
        params.set("providerType", query.providerType);
    }
    if (query.hallName?.trim()) {
        params.set("hallName", query.hallName.trim());
    }
    if (query.providerName?.trim()) {
        params.set("providerName", query.providerName.trim());
    }
    if (query.mealTime) {
        params.set("mealTime", query.mealTime);
    }
    if (query.foodOption) {
        params.set("foodOption", query.foodOption);
    }
    if (typeof query.minPrice === "number") {
        params.set("minPrice", String(Math.max(0, Math.floor(query.minPrice))));
    }
    if (typeof query.maxPrice === "number") {
        params.set("maxPrice", String(Math.max(0, Math.floor(query.maxPrice))));
    }
    if (query.sortBy) {
        params.set("sortBy", query.sortBy);
    }
    if (query.freeDelivery) {
        params.set("freeDelivery", "true");
    }
    if (query.pointsOnly) {
        params.set("pointsOnly", "true");
    }
    if (typeof query.page === "number" && query.page > 0) {
        params.set("page", String(Math.floor(query.page)));
    }
    if (typeof query.limit === "number" && query.limit > 0) {
        params.set("limit", String(Math.floor(query.limit)));
    }
    if (query.ids?.length) {
        params.set("ids", Array.from(new Set(query.ids.filter((id) => Number.isFinite(id) && id > 0))).join(","));
    }
    const search = params.toString();
    const response = await apiFetch(`/foods${search ? `?${search}` : ""}`);
    return {
        items: Array.isArray(response.items) ? response.items.map(mapFoodItem) : [],
        page: response.page,
        limit: response.limit,
        total: response.total,
        totalPages: response.totalPages,
        availableMinPrice: Number(response.availableMinPrice) || 0,
        availableMaxPrice: Number(response.availableMaxPrice) || 0,
        filters: {
            mealTimes: normalizeMealTimes(response.filters?.mealTimes),
            foodOptions: normalizeFoodOptions(response.filters?.foodOptions),
            halls: normalizeStringList(response.filters?.halls),
            hallKitchens: normalizeProviderOptions(response.filters?.hallKitchens),
            campusKitchens: normalizeProviderOptions(response.filters?.campusKitchens),
            studentKitchens: normalizeProviderOptions(response.filters?.studentKitchens),
        },
    };
}
export async function loadFoodsByIds(ids) {
    const uniqueIds = Array.from(new Set(ids.filter((id) => Number.isFinite(id) && id > 0)));
    if (uniqueIds.length === 0) {
        return [];
    }
    const result = await loadFoodCatalog({
        ids: uniqueIds,
        limit: uniqueIds.length,
    });
    const itemMap = new Map(result.items.map((item) => [item.id, item]));
    return uniqueIds.map((id) => itemMap.get(id)).filter((item) => Boolean(item));
}
export async function loadFoodReviews(foodId) {
    const response = await apiFetch(`/foods/${foodId}/reviews`);
    return mapFoodReviewSummary(response);
}
export async function submitFoodReview(foodId, rating, comment) {
    const response = await authedFetch(`/foods/${foodId}/reviews`, {
        method: "POST",
        body: JSON.stringify({
            rating,
            comment,
        }),
    });
    return mapFoodReviewSummary(response);
}
function mapFoodItem(item) {
    return {
        id: item.id,
        name: item.food_name,
        category: normalizeFoodCategory(item.category),
        providerName: item.provider_name,
        providerType: item.provider_type || "Student Homemade",
        hallName: normalizeOptionalString(item.hall_name) || "",
        mealTime: normalizeMealTime(item.meal_time ?? item.category),
        foodOption: normalizeFoodOption(item.food_option ?? item.category),
        price: Number(item.price) || 0,
        rating: Number(item.rating) || 0,
        reviewCount: Number(item.review_count) || 0,
        pointsCost: Number(item.points_cost) || 0,
        popularity: Number(item.popularity) || 0,
        freeDelivery: Boolean(item.free_delivery),
        stock: item.stock,
        image: resolveBackendAssetUrl(item.image),
    };
}
function mapFoodReviewSummary(summary) {
    const reviews = Array.isArray(summary.reviews)
        ? summary.reviews.map((review) => ({
            id: Number(review.id) || 0,
            foodId: Number(review.foodId ?? review.food_id) || 0,
            userId: normalizeOptionalString(review.userId ?? review.user_id),
            studentName: review.studentName || review.student_name || "Student User",
            rating: Number(review.rating) || 0,
            comment: typeof review.comment === "string" ? review.comment : "",
            createdAt: review.createdAt || review.created_at || "",
            updatedAt: review.updatedAt || review.updated_at || "",
            isOwn: Boolean(review.isOwn),
        }))
        : [];
    const currentUserReview = summary.currentUserReview
        ? {
            id: Number(summary.currentUserReview.id) || 0,
            foodId: Number(summary.currentUserReview.foodId ?? summary.currentUserReview.food_id) || 0,
            userId: normalizeOptionalString(summary.currentUserReview.userId ?? summary.currentUserReview.user_id),
            studentName: summary.currentUserReview.studentName ||
                summary.currentUserReview.student_name ||
                "Student User",
            rating: Number(summary.currentUserReview.rating) || 0,
            comment: typeof summary.currentUserReview.comment === "string"
                ? summary.currentUserReview.comment
                : "",
            createdAt: summary.currentUserReview.createdAt || summary.currentUserReview.created_at || "",
            updatedAt: summary.currentUserReview.updatedAt || summary.currentUserReview.updated_at || "",
            isOwn: true,
        }
        : null;
    return {
        foodId: Number(summary.foodId ?? summary.food_id ?? reviews[0]?.foodId) || 0,
        averageRating: Number(summary.averageRating ?? summary.average_rating) || 0,
        reviewCount: Number(summary.reviewCount ?? summary.review_count) || reviews.length,
        reviews,
        currentUserReview,
    };
}
function normalizeOptionalString(value) {
    if (typeof value !== "string") {
        return undefined;
    }
    const normalized = value.trim();
    return normalized || undefined;
}
function normalizeStringList(values) {
    if (!Array.isArray(values)) {
        return [];
    }
    return Array.from(new Set(values
        .map((value) => normalizeOptionalString(value))
        .filter((value) => Boolean(value))));
}
function normalizeMealTimes(values) {
    if (!Array.isArray(values)) {
        return ["Lunch", "Dinner", "Any Time"];
    }
    const normalized = Array.from(new Set(values.map((value) => normalizeMealTime(value))));
    return normalized.length > 0 ? normalized : ["Lunch", "Dinner", "Any Time"];
}
function normalizeFoodOptions(values) {
    if (!Array.isArray(values)) {
        return ["Single", "System"];
    }
    const normalized = Array.from(new Set(values.map((value) => normalizeFoodOption(value))));
    return normalized.length > 0 ? normalized : ["Single", "System"];
}
function normalizeProviderOptions(values) {
    if (!Array.isArray(values)) {
        return [];
    }
    const options = [];
    const seen = new Set();
    for (const value of values) {
        const name = normalizeOptionalString(value?.name);
        const hallName = normalizeOptionalString(value?.hallName ?? value?.hall_name);
        if (!name) {
            continue;
        }
        const key = `${name.toLowerCase()}::${hallName?.toLowerCase() ?? ""}`;
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);
        options.push(hallName
            ? {
                name,
                hallName,
            }
            : { name });
    }
    return options;
}
function normalizeMealTime(value) {
    if (typeof value !== "string") {
        return "Any Time";
    }
    const normalized = value.trim().toLowerCase();
    if (normalized.startsWith("[lunch]")) {
        return "Lunch";
    }
    if (normalized.startsWith("[dinner]")) {
        return "Dinner";
    }
    if (normalized.startsWith("[any time]")) {
        return "Any Time";
    }
    if (normalized.includes("lunch") || normalized.includes("launch")) {
        return "Lunch";
    }
    if (normalized.includes("dinner")) {
        return "Dinner";
    }
    return "Any Time";
}
function normalizeFoodOption(value) {
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
function normalizeFoodCategory(value) {
    if (typeof value !== "string") {
        return "";
    }
    return value
        .replace(/^\[(Lunch|Dinner|Any Time)\]\s*/i, "")
        .replace(/^\[(Single|System|Package|Set Menu|Set Manu|Combo)\]\s*/i, "")
        .trim();
}
