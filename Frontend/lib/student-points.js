import { authedFetch } from "@/lib/api";
function normalizePointState(state) {
    return {
        ...state,
        points: Number(state.points) || 0,
        totalEarned: Number(state.totalEarned) || 0,
        totalTransferred: Number(state.totalTransferred) || 0,
        isFreeDeliveryPartner: Boolean(state.isFreeDeliveryPartner),
        registrationBonusPoints: Number(state.registrationBonusPoints) || 0,
        freeDeliveryBonusPoints: Number(state.freeDeliveryBonusPoints) || 0,
        pointsExpireInDays: Number(state.pointsExpireInDays) || 0,
        expiringPoints: Number(state.expiringPoints) || 0,
        nextExpiryAt: state.nextExpiryAt ?? null,
        monthlyReward: normalizeMonthlyReward(state.monthlyReward),
        transactions: state.transactions || [],
        pendingIncomingTransfers: state.pendingIncomingTransfers || [],
        pendingOutgoingTransfers: state.pendingOutgoingTransfers || [],
    };
}
function normalizeMonthlyReward(monthlyReward) {
    return {
        timezone: monthlyReward?.timezone || "Asia/Dhaka",
        rewardPoints: Number(monthlyReward?.rewardPoints) || 200,
        spendThreshold: Number(monthlyReward?.spendThreshold) || 10000,
        currentMonth: monthlyReward?.currentMonth || "",
        previousMonth: monthlyReward?.previousMonth || "",
        currentMonthSpend: Number(monthlyReward?.currentMonthSpend) || 0,
        currentMonthSpendRemaining: Number(monthlyReward?.currentMonthSpendRemaining) || 0,
        previousMonthSpend: Number(monthlyReward?.previousMonthSpend) || 0,
        previousMonthSpendQualified: Boolean(monthlyReward?.previousMonthSpendQualified),
        previousMonthSpendRewarded: Boolean(monthlyReward?.previousMonthSpendRewarded),
        deliveryRewardEligible: Boolean(monthlyReward?.deliveryRewardEligible),
        currentMonthDeliveryDays: Number(monthlyReward?.currentMonthDeliveryDays) || 0,
        currentMonthTotalDays: Number(monthlyReward?.currentMonthTotalDays) || 0,
        previousMonthDeliveryDays: Number(monthlyReward?.previousMonthDeliveryDays) || 0,
        previousMonthTotalDays: Number(monthlyReward?.previousMonthTotalDays) || 0,
        previousMonthDeliveryQualified: Boolean(monthlyReward?.previousMonthDeliveryQualified),
        previousMonthDeliveryRewarded: Boolean(monthlyReward?.previousMonthDeliveryRewarded),
    };
}
export async function loadStudentPointState(session) {
    const state = await authedFetch("/students/me/points", {}, session);
    return normalizePointState(state);
}
export async function transferStudentPoints(session, receiverId, amount) {
    try {
        const state = await authedFetch("/students/me/points/transfer", {
            method: "POST",
            body: JSON.stringify({
                receiverId: receiverId.trim(),
                amount: Math.floor(amount),
            }),
        }, session);
        return {
            ok: true,
            state: normalizePointState(state),
        };
    }
    catch (error) {
        return {
            ok: false,
            error: error instanceof Error ? error.message : "Transfer failed",
        };
    }
}
export async function acceptStudentPointTransfer(session, requestId) {
    try {
        const state = await authedFetch(`/students/me/points/transfer-requests/${requestId}/accept`, {
            method: "POST",
        }, session);
        return {
            ok: true,
            state: normalizePointState(state),
        };
    }
    catch (error) {
        return {
            ok: false,
            error: error instanceof Error ? error.message : "Could not accept point request",
        };
    }
}
export async function rejectStudentPointTransfer(session, requestId) {
    try {
        const state = await authedFetch(`/students/me/points/transfer-requests/${requestId}/reject`, {
            method: "POST",
        }, session);
        return {
            ok: true,
            state: normalizePointState(state),
        };
    }
    catch (error) {
        return {
            ok: false,
            error: error instanceof Error ? error.message : "Could not reject point request",
        };
    }
}
export async function redeemStudentPoints(session, amount, note) {
    try {
        const state = await authedFetch("/students/me/points/redeem", {
            method: "POST",
            body: JSON.stringify({
                amount: Math.floor(amount),
                note: note?.trim() || "",
            }),
        }, session);
        return {
            ok: true,
            state: normalizePointState(state),
        };
    }
    catch (error) {
        return {
            ok: false,
            error: error instanceof Error ? error.message : "Point redemption failed",
        };
    }
}
