"use client";
import { useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, Boxes, LayoutDashboard, LogOut, Soup, Store, } from "lucide-react";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CardLoadingState } from "@/components/ui/page-state";
import { useAuthSessionState, useKitchenAccessSessionState, } from "@/hooks/use-session-state";
import { cn } from "@/lib/utils";
import { clearAuthSession, clearKitchenAccessSession, getRoleLabel, isKitchenRole, } from "@/lib/auth-session";
const navItems = [
    {
        label: "Dashboard",
        href: "/kitchen/dashboard",
        icon: LayoutDashboard,
        description: "Overview, approvals, and quick insights",
    },
    {
        label: "Menu Manager",
        href: "/kitchen/menu",
        icon: Soup,
        description: "Create, edit, and manage food items",
    },
    {
        label: "Stock",
        href: "/kitchen/stock",
        icon: Boxes,
        description: "Adjust stock and visibility quickly",
    },
];
export function KitchenShell({ title, description, children }) {
    const router = useRouter();
    const pathname = usePathname();
    const { session: authSession, hydrated: authHydrated } = useAuthSessionState();
    const { session: linkedKitchenSession, hydrated: linkedHydrated } = useKitchenAccessSessionState();
    const resolved = useMemo(() => {
        if (authSession && isKitchenRole(authSession.role)) {
            return {
                session: authSession,
                source: "auth",
            };
        }
        if (authSession?.role === "student" &&
            linkedKitchenSession &&
            isKitchenRole(linkedKitchenSession.role)) {
            return {
                session: linkedKitchenSession,
                source: "student-link",
            };
        }
        return {
            session: null,
            source: "auth",
        };
    }, [authSession, linkedKitchenSession]);
    const session = resolved.session;
    const sessionSource = resolved.source;
    const checkingSession = !authHydrated || !linkedHydrated;
    function handleLogout() {
        if (sessionSource === "student-link") {
            clearKitchenAccessSession();
            router.push("/profile");
            return;
        }
        clearAuthSession();
        router.push("/");
    }
    if (checkingSession || !session) {
        return (<>
        <Navbar />
        <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background via-background to-muted/30 pt-24">
          <div className="w-full max-w-md">
            <CardLoadingState message="Loading your kitchen workspace..."/>
          </div>
        </main>
      </>);
    }
    return (<>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 pt-24">
        <div className="mx-auto w-full max-w-7xl px-4 pb-16 lg:px-8">
          <Card>
            <CardContent className="flex flex-col gap-5 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-primary/10 text-lg font-bold text-primary">
                    {getInitials(session.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-2xl font-bold font-mono text-foreground">{session.name}</h1>
                  <p className="text-sm text-muted-foreground">{session.email}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge>Kitchen Workspace</Badge>
                    <Badge variant="secondary">{getRoleLabel(session.role)}</Badge>
                    <Badge variant="outline">
                      {sessionSource === "student-link" ? "Linked Access" : "Direct Login"}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" asChild>
                  <Link href={sessionSource === "student-link" ? "/profile/info" : "/"}>
                    {sessionSource === "student-link" ? "Back to Student" : "Back to Home"}
                  </Link>
                </Button>
                <Button asChild>
                  <Link href="/browse-food">
                    Browse Food
                    <ArrowRight className="h-4 w-4"/>
                  </Link>
                </Button>
                <Button variant={sessionSource === "student-link" ? "outline" : "destructive"} onClick={handleLogout}>
                  <LogOut className="h-4 w-4"/>
                  {sessionSource === "student-link" ? "Close Kitchen" : "Logout"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="mt-6 grid gap-6 lg:grid-cols-[270px_minmax(0,1fr)]">
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="border-b border-border bg-muted/25 px-5 py-4">
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4 text-primary"/>
                      <p className="text-sm font-semibold text-foreground">Kitchen Profile</p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Open each page from the menu on the left.
                    </p>
                  </div>
                  <nav className="space-y-1 p-3">
                    {navItems.map((item) => {
            const active = pathname === item.href;
            return (<Link key={item.href} href={item.href} className={cn("block rounded-2xl border px-4 py-3 transition-colors", active
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-transparent bg-background text-muted-foreground hover:border-border hover:bg-muted/35 hover:text-foreground")}>
                          <div className="flex items-center gap-3">
                            <div className={cn("flex h-10 w-10 items-center justify-center rounded-full", active ? "bg-primary/12 text-primary" : "bg-muted text-muted-foreground")}>
                              <item.icon className="h-4 w-4"/>
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold">{item.label}</p>
                              <p className="text-xs leading-relaxed text-muted-foreground">
                                {item.description}
                              </p>
                            </div>
                          </div>
                        </Link>);
        })}
                  </nav>
                </CardContent>
              </Card>
            </aside>

            <section className="min-w-0 space-y-6">
              <Card className="border-border/70 bg-card/90 shadow-sm">
                <CardContent className="space-y-1 pt-6">
                  <p className="text-sm font-medium text-primary">Current Section</p>
                  <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
                </CardContent>
              </Card>
              {children(session)}
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>);
}
function getInitials(name) {
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) {
        return "K";
    }
    if (words.length === 1) {
        return words[0].slice(0, 2).toUpperCase();
    }
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
}
