"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, UserCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationsMenu } from "@/components/notifications-menu";
import { clearAuthSession, getAuthPagePath, getRoleHomePath, isAdminRole, isKitchenRole, } from "@/lib/auth-session";
import { useAuthSessionState, useKitchenAccessSessionState, } from "@/hooks/use-session-state";
const navLinks = [
    { label: "How It Works", href: "/#how-it-works" },
    { label: "Features", href: "/#features" },
    { label: "Delivery", href: "/#delivery-partner" },
    { label: "Pricing", href: "/#subscription" },
    { label: "Testimonials", href: "/#testimonials" },
];
export function Navbar() {
    const router = useRouter();
    const pathname = usePathname();
    const { session, hydrated } = useAuthSessionState();
    const { session: kitchenAccessSession } = useKitchenAccessSessionState();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const notificationSession = (() => {
        if (pathname.startsWith("/kitchen")) {
            if (kitchenAccessSession && isKitchenRole(kitchenAccessSession.role)) {
                return kitchenAccessSession;
            }
            if (session && isKitchenRole(session.role)) {
                return session;
            }
            return null;
        }
        return session;
    })();
    const showDeliveryPartnerOptions = !session || session.role === "student";
    const visibleNavLinks = showDeliveryPartnerOptions
        ? navLinks
        : navLinks.filter((link) => link.href !== "/#delivery-partner");
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);
    function handleLogout() {
        clearAuthSession();
        setMobileOpen(false);
        router.push("/");
    }
    return (<nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
            ? "bg-card/95 backdrop-blur-xl shadow-sm border-b border-border"
            : "bg-transparent"}`}>
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <span className="text-lg font-bold text-primary-foreground">C</span>
            </div>
            <span className="text-lg font-bold font-mono text-foreground">
              CampFood
            </span>
          </Link>

          <div className="hidden items-center gap-7 md:flex">
            {visibleNavLinks.map((link) => (<Link key={link.href} href={link.href} className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
                {link.label}
              </Link>))}
          </div>

          <div className="hidden items-center gap-3 md:flex">
            {showDeliveryPartnerOptions ? (<Button variant="outline" size="sm" asChild>
                <Link href="/delivery-partner">Become a Partner</Link>
              </Button>) : null}
            {!hydrated ? (<Button size="sm" variant="outline" disabled>
                Checking...
              </Button>) : session ? (<>
                {notificationSession ? <NotificationsMenu session={notificationSession}/> : null}
                {session.role === "student" && (<Button variant="outline" size="sm" asChild>
                    <Link href="/profile">
                      <UserCircle className="h-4 w-4"/>
                      Profile
                    </Link>
                  </Button>)}
                <Button size="sm" asChild>
                  <Link href={getRoleHomePath(session.role)}>
                    {getDashboardButtonLabel(session)}
                  </Link>
                </Button>
                <Button variant="destructive" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4"/>
                  Logout
                </Button>
              </>) : (<Button size="sm" asChild>
                <Link href={getAuthPagePath({ role: "student", mode: "login" })}>Login / Register</Link>
              </Button>)}
          </div>

          <div className="flex items-center gap-2 md:hidden">
            {hydrated && notificationSession ? (<NotificationsMenu session={notificationSession} compact/>) : null}
            <button onClick={() => setMobileOpen(!mobileOpen)} className="inline-flex items-center justify-center rounded-md p-2 text-foreground" aria-label="Toggle menu">
              {mobileOpen ? <X className="h-5 w-5"/> : <Menu className="h-5 w-5"/>}
            </button>
          </div>
        </div>
      </div>

      <div className={`overflow-hidden border-t border-border bg-card transition-all duration-300 md:hidden ${mobileOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0 border-t-0"}`}>
        <div className="flex flex-col gap-1 px-4 py-4">
          {visibleNavLinks.map((link) => (<Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)} className="rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-primary">
              {link.label}
            </Link>))}
          <div className="mt-3 flex flex-col gap-2">
            {showDeliveryPartnerOptions ? (<Button variant="outline" size="sm" asChild>
                <Link href="/delivery-partner" onClick={() => setMobileOpen(false)}>
                  Become a Partner
                </Link>
              </Button>) : null}
            {!hydrated ? (<Button size="sm" variant="outline" disabled>
                Checking...
              </Button>) : session ? (<>
                {session.role === "student" && (<Button variant="outline" size="sm" asChild>
                    <Link href="/profile" onClick={() => setMobileOpen(false)}>
                      <UserCircle className="h-4 w-4"/>
                      Profile
                    </Link>
                  </Button>)}
                <Button size="sm" asChild>
                  <Link href={getRoleHomePath(session.role)} onClick={() => setMobileOpen(false)}>
                    {getDashboardButtonLabel(session)}
                  </Link>
                </Button>
                <Button variant="destructive" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4"/>
                  Logout
                </Button>
              </>) : (<Button size="sm" asChild>
                <Link href={getAuthPagePath({ role: "student", mode: "login" })} onClick={() => setMobileOpen(false)}>
                  Login / Register
                </Link>
              </Button>)}
          </div>
        </div>
      </div>
    </nav>);
}
function getDashboardButtonLabel(session) {
    if (isAdminRole(session.role)) {
        return "Admin Dashboard";
    }
    return isKitchenRole(session.role) ? "Kitchen Dashboard" : "Browse Food";
}
