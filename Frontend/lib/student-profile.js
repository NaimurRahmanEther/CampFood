import { authedFetch } from "@/lib/api";
export async function updateStudentProfile(name) {
    return authedFetch("/students/me/profile", {
        method: "PATCH",
        body: JSON.stringify({
            name: name.trim(),
        }),
    });
}
