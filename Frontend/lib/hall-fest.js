import { authedFetch } from "@/lib/api";
export async function loadHallFestItems(session) {
    const items = await authedFetch("/hall-fests/mine", {}, session);
    return Array.isArray(items) ? items : [];
}
export async function upsertHallFestItem(session, input) {
    if (input.id) {
        await authedFetch(`/hall-fests/${input.id}`, {
            method: "PUT",
            body: JSON.stringify(input),
        }, session);
    }
    else {
        await authedFetch("/hall-fests", {
            method: "POST",
            body: JSON.stringify(input),
        }, session);
    }
    return loadHallFestItems(session);
}
export async function removeHallFestItem(session, festId) {
    await authedFetch(`/hall-fests/${festId}`, {
        method: "DELETE",
    }, session);
    return loadHallFestItems(session);
}
