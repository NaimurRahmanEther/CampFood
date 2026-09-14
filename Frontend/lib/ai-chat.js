import { authedFetch } from "@/lib/api";
export async function requestAIChat(input) {
    return authedFetch("/ai/chat", {
        method: "POST",
        body: JSON.stringify({
            message: input.message,
            history: input.history,
        }),
    }, input.session);
}
