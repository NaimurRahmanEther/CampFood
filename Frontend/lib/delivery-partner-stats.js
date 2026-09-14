const deliveryRewardNotePattern = /delivery reward for completing order #(\d+)/i;
const dhakaTimeZone = "Asia/Dhaka";
export function buildPartnerDeliveryStats(orders, pointState, userId, plan) {
    const normalizedUserID = userId.trim();
    const deliveredOrders = orders
        .filter((order) => order.status === "delivered" &&
        order.assignedToUserId?.trim() === normalizedUserID &&
        resolveDeliveryPlanForOrder(order) === plan)
        .slice()
        .sort((left, right) => {
        const leftTime = Date.parse(left.deliveredAt || left.createdAt || "");
        const rightTime = Date.parse(right.deliveredAt || right.createdAt || "");
        return Number.isFinite(rightTime) && Number.isFinite(leftTime)
            ? rightTime - leftTime
            : 0;
    });
    const rewardPointsByOrderID = plan === "free" ? mapDeliveryRewardPointsByOrder(pointState) : new Map();
    const currentMonthKey = toDhakaMonthKey(new Date());
    const recentRows = deliveredOrders.slice(0, 12).map((order) => {
        const rewardPoints = plan === "free"
            ? rewardPointsByOrderID.get(order.id) ?? estimateFreeDeliveryRewardPoints(order)
            : 0;
        return {
            orderId: order.id,
            deliveredAt: order.deliveredAt || order.createdAt || null,
            items: order.totals.items,
            cashPayable: order.totals.cashPayable,
            pointsPayable: order.totals.pointsPayable,
            rewardPoints,
        };
    });
    let totalDeliveries = 0;
    let thisMonthDeliveries = 0;
    let totalCashDelivered = 0;
    let thisMonthCashDelivered = 0;
    let totalRewardPoints = 0;
    let thisMonthRewardPoints = 0;
    for (const row of recentRows) {
        const monthKey = toDhakaMonthKey(new Date(row.deliveredAt || ""));
        const isCurrentMonth = monthKey === currentMonthKey;
        totalDeliveries += 1;
        totalCashDelivered += row.cashPayable;
        totalRewardPoints += row.rewardPoints;
        if (isCurrentMonth) {
            thisMonthDeliveries += 1;
            thisMonthCashDelivered += row.cashPayable;
            thisMonthRewardPoints += row.rewardPoints;
        }
    }
    // If a courier has more than 12 delivered orders, include them in totals while
    // still keeping the visible history compact.
    if (deliveredOrders.length > recentRows.length) {
        for (const order of deliveredOrders.slice(recentRows.length)) {
            const deliveredAt = order.deliveredAt || order.createdAt || "";
            const monthKey = toDhakaMonthKey(new Date(deliveredAt));
            const isCurrentMonth = monthKey === currentMonthKey;
            const rewardPoints = plan === "free"
                ? rewardPointsByOrderID.get(order.id) ?? estimateFreeDeliveryRewardPoints(order)
                : 0;
            totalDeliveries += 1;
            totalCashDelivered += order.totals.cashPayable;
            totalRewardPoints += rewardPoints;
            if (isCurrentMonth) {
                thisMonthDeliveries += 1;
                thisMonthCashDelivered += order.totals.cashPayable;
                thisMonthRewardPoints += rewardPoints;
            }
        }
    }
    return {
        totalDeliveries,
        thisMonthDeliveries,
        totalCashDelivered,
        thisMonthCashDelivered,
        totalRewardPoints,
        thisMonthRewardPoints,
        recentRows,
    };
}
function resolveDeliveryPlanForOrder(order) {
    if (order.assignedPlan === "free" || order.assignedPlan === "permanent") {
        return order.assignedPlan;
    }
    return order.routeMode === "paid-only" ? "permanent" : "free";
}
function mapDeliveryRewardPointsByOrder(pointState) {
    const map = new Map();
    for (const transaction of pointState.transactions) {
        if (transaction.type !== "bonus" || transaction.amount <= 0) {
            continue;
        }
        const matched = transaction.note.match(deliveryRewardNotePattern);
        if (!matched) {
            continue;
        }
        const orderID = matched[1];
        map.set(orderID, (map.get(orderID) || 0) + transaction.amount);
    }
    return map;
}
function estimateFreeDeliveryRewardPoints(order) {
    const subtotal = order.items.reduce((sum, item) => sum + Math.max(0, Number(item.subtotal) || 0), 0);
    return subtotal > 0 ? Math.round(subtotal * 0.1) : 0;
}
function toDhakaMonthKey(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
        return "";
    }
    const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: dhakaTimeZone,
        year: "numeric",
        month: "2-digit",
    });
    const parts = formatter.formatToParts(date);
    const year = parts.find((part) => part.type === "year")?.value || "";
    const month = parts.find((part) => part.type === "month")?.value || "";
    return `${year}-${month}`;
}
