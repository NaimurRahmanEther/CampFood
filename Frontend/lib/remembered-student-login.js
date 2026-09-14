const STORAGE_KEY = "ru-food-express.remembered-student-login";
const STUDENT_ID_PATTERN = /^\d{10}$/;
export function getRememberedStudentLogin() {
    if (typeof window === "undefined") {
        return null;
    }
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
        return null;
    }
    try {
        const parsed = JSON.parse(raw);
        if (typeof parsed.studentId !== "string" ||
            typeof parsed.email !== "string" ||
            typeof parsed.rememberedAt !== "string") {
            return null;
        }
        const studentId = parsed.studentId.trim();
        const email = parsed.email.trim().toLowerCase();
        if (!STUDENT_ID_PATTERN.test(studentId) || !email) {
            return null;
        }
        return {
            studentId,
            email,
            rememberedAt: parsed.rememberedAt,
        };
    }
    catch {
        return null;
    }
}
export function setRememberedStudentLogin(input) {
    const remembered = {
        studentId: input.studentId.trim(),
        email: input.email.trim().toLowerCase(),
        rememberedAt: new Date().toISOString(),
    };
    if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(remembered));
    }
    return remembered;
}
export function clearRememberedStudentLogin() {
    if (typeof window !== "undefined") {
        window.localStorage.removeItem(STORAGE_KEY);
    }
}
