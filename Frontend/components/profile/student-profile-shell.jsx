"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Bike, ChefHat, Coins, UserCircle2, } from "lucide-react";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CardLoadingState } from "@/components/ui/page-state";
import { useAutoRefresh } from "@/hooks/use-auto-refresh";
import { useAuthSessionState } from "@/hooks/use-session-state";
import { loadStudentPointState } from "@/lib/student-points";
import { cn } from "@/lib/utils";
import { getInitials } from "@/components/profile/student-profile-utils";
const profileNavItems = [
    {
        label: "Profile Info",
        href: "/profile/info",
        icon: UserCircle2,
        description: "Account details and name update",
    },
    {
        label: "Kitchen",
        href: "/profile/kitchen",
        icon: ChefHat,
        description: "Kitchen registration and workspace",
    },
    {
        label: "Points",
        href: "/profile/points",
        icon: Coins,
        description: "Balance, transfer, and activity",
    },
    {
        label: "Delivery",
        href: "/profile/delivery",
        icon: Bike,
        description: "Registration and delivery orders",
    },
];
export function StudentProfileShell({ title, description, children, }) {
    const pathname = usePathname();
    const { session, hydrated } = useAuthSessionState();
    const [pointSummary, setPointSummary] = useState(null);
    const studentSession = session?.role === "student" ? session : null;
    const syncPointSummary = useCallback(async () => {
        if (!studentSession) {
            return;
        }
        try {
            const nextState = await loadStudentPointState(studentSession);
            setPointSummary(nextState);
        }
        catch {
            setPointSummary(null);
        }
    }, [studentSession]);
    useEffect(() => {
        if (!studentSession) {
            setPointSummary(null);
            return;
        }
        void syncPointSummary();
    }, [pathname, studentSession, syncPointSummary]);
    useAutoRefresh({
        enabled: Boolean(studentSession),
        intervalMs: 30000,
        onRefresh: syncPointSummary,
    });
    if (!hydrated || !studentSession) {
        return (<>
        <Navbar />
        <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background via-background to-muted/30 pt-24">
          <div className="w-full max-w-md">
            <CardLoadingState message="Loading your student workspace..."/>
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
                    {getInitials(studentSession.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-2xl font-bold font-mono text-foreground">{studentSession.name}</h1>
                  <p className="text-sm text-muted-foreground">{studentSession.email}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge>Student Workspace</Badge>
                    <Badge variant="secondary">
                      {studentSession.authSource === "register" ? "Registered Account" : "Logged-in Account"}
                    </Badge>
                    <Badge variant="outline">
                      Available Points: {pointSummary ? pointSummary.points : "..."}
                    </Badge>
                    <Badge variant="outline">
                      Earned: {pointSummary ? pointSummary.totalEarned : "..."}
                    </Badge>
                  </div>
                </div>
              </div>
              <Button asChild>
                <Link href="/browse-food">
                  Browse Food
                  <ArrowRight className="h-4 w-4"/>
                </Link>
              </Button>
            </CardContent>
          </Card>

          <div className="mt-6 grid gap-6 lg:grid-cols-[270px_minmax(0,1fr)]">
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="border-b border-border bg-muted/25 px-5 py-4">
                    <p className="text-sm font-semibold text-foreground">Student Profile</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Open each page from the menu on the left.
                    </p>
                  </div>
                  <nav className="space-y-1 p-3">
                    {profileNavItems.map((item) => {
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
              {children(studentSession)}
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>);
}
