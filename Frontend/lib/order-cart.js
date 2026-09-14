const CART_STORAGE_PREFIX = "ru-food-express.order-cart.";
export function loadOrderCart(session) {
    if (typeof window === "undefined") {
        return [];
    }
    const key = getOrderCartKey(session);
    const raw = window.localStorage.getItem(key);
    if (!raw) {
        return [];
    }
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            return [];
        }
        return parsed.filter(isCartItem);
    }
    catch {
        return [];
    }
}
export function saveOrderCart(session, items) {
    if (typeof window === "undefined") {
        return;
    }
    const key = getOrderCartKey(session);
    window.localStorage.setItem(key, JSON.stringify(items));
}
export function addToOrderCart(session, foodId, paymentMode, quantity = 1) {
    const safeQuantity = Math.max(1, Math.floor(quantity));
    const current = loadOrderCart(session);
    const existingIndex = current.findIndex((item) => item.foodId === foodId && item.paymentMode === paymentMode);
    const updated = existingIndex === -1
        ? [...current, { foodId, paymentMode, quantity: safeQuantity }]
        : current.map((item, index) => index === existingIndex
            ? { ...item, quantity: item.quantity + safeQuantity }
            : item);
    saveOrderCart(session, updated);
    return updated;
}
export function setOrderCartItemQuantity(session, foodId, paymentMode, quantity) {
    const current = loadOrderCart(session);
    if (quantity <= 0) {
        const filtered = current.filter((item) => !(item.foodId === foodId && item.paymentMode === paymentMode));
        saveOrderCart(session, filtered);
        return filtered;
    }
    const safeQuantity = Math.max(1, Math.floor(quantity));
    const updated = current.map((item) => item.foodId === foodId && item.paymentMode === paymentMode
        ? { ...item, quantity: safeQuantity }
        : item);
    saveOrderCart(session, updated);
    return updated;
}
export function clearOrderCart(session) {
    if (typeof window === "undefined") {
        return;
    }
    window.localStorage.removeItem(getOrderCartKey(session));
}
function getOrderCartKey(session) {
    return `${CART_STORAGE_PREFIX}${encodeURIComponent(session.userId)}`;
}
function isCartItem(value) {
    if (typeof value !== "object" || value === null) {
        return false;
    }
    const item = value;
    return (typeof item.foodId === "number" &&
        Number.isFinite(item.foodId) &&
        typeof item.quantity === "number" &&
        Number.isFinite(item.quantity) &&
        (item.paymentMode === "cash" || item.paymentMode === "points"));
}
