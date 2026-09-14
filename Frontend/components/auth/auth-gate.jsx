"use client";
import { useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuthSessionState } from "@/hooks/use-session-state";
import { isPublicRoutePath, resolveRouteGuardRedirect, } from "@/lib/route-guard";
export function AuthGate({ children }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { hydrated, session } = useAuthSessionState();
    const nextPath = searchParams.get("next");
    const currentPath = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "");
    const isPublicPath = isPublicRoutePath(pathname);
    const redirectPath = useMemo(() => resolveRouteGuardRedirect({
        pathname,
        currentPath,
        nextPath,
        session,
    }), [currentPath, nextPath, pathname, session]);
    useEffect(() => {
        if (!hydrated || !redirectPath) {
            return;
        }
        router.replace(redirectPath);
    }, [hydrated, redirectPath, router]);
    const canRenderPublicBeforeHydration = !hydrated && isPublicPath && pathname !== "/auth";
    if ((!hydrated && !canRenderPublicBeforeHydration) || (hydrated && Boolean(redirectPath))) {
        return (<main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background via-background to-muted/30 px-4">
        <div className="rounded-xl border border-border bg-card px-5 py-3 text-sm text-muted-foreground shadow-sm">
          Checking access...
        </div>
      </main>);
    }
    return <>{children}</>;
}
