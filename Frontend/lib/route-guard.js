import { getAuthPagePath, getKitchenAccessSession, getPostAuthPath, getRoleHomePath, isKitchenRole, } from "@/lib/auth-session";
const PUBLIC_PATHS = new Set([
    "/",
    "/auth",
    "/browse-food",
    "/delivery-partner",
    "/delivery-partner/free",
    "/delivery-partner/permanent",
]);
const STUDENT_ONLY_PREFIXES = [
    "/profile",
    "/checkout",
    "/delivery-partner/orders",
];
const ADMIN_ONLY_PREFIXES = ["/admin"];
const KITCHEN_WORKSPACE_PREFIXES = ["/kitchen"];
export function isPublicRoutePath(pathname) {
    return PUBLIC_PATHS.has(pathname);
}
export function resolveRouteGuardRedirect(input) {
    const { pathname, currentPath, nextPath, session } = input;
    if (pathname === "/auth") {
        if (!session) {
            return null;
        }
        return getPostAuthPath(session.role, nextPath);
    }
    if (isPublicRoutePath(pathname)) {
        return null;
    }
    if (!session) {
        return getAuthPagePath({
            role: "student",
            mode: "login",
            next: currentPath,
        });
    }
    if (matchesAnyRoutePrefix(pathname, ADMIN_ONLY_PREFIXES)) {
        if (session.role !== "admin") {
            return getRoleHomePath(session.role);
        }
        return null;
    }
    if (matchesAnyRoutePrefix(pathname, STUDENT_ONLY_PREFIXES)) {
        if (session.role !== "student") {
            return getRoleHomePath(session.role);
        }
        return null;
    }
    if (matchesAnyRoutePrefix(pathname, KITCHEN_WORKSPACE_PREFIXES)) {
        if (isKitchenRole(session.role)) {
            return null;
        }
        if (session.role === "student") {
            const linkedKitchenSession = getKitchenAccessSession();
            if (linkedKitchenSession && isKitchenRole(linkedKitchenSession.role)) {
                return null;
            }
            return "/profile/kitchen";
        }
        return getRoleHomePath(session.role);
    }
    return null;
}
function matchesAnyRoutePrefix(pathname, prefixes) {
    return prefixes.some((prefix) => isRoutePrefixMatch(pathname, prefix));
}
function isRoutePrefixMatch(pathname, prefix) {
    if (pathname === prefix) {
        return true;
    }
    return pathname.startsWith(`${prefix}/`);
}
